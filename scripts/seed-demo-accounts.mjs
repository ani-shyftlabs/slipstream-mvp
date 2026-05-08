import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SERVICE) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPA_URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "SlipstreamDemo2026";
const ACCOUNTS = [
  {
    email: "broker@demo.com",
    role: "broker",
    full_name: "Demo Broker",
    org_name: "Acme Brokerage",
  },
  {
    email: "mga@demo.com",
    role: "mga",
    full_name: "Demo MGA",
    org_name: "Spectrum Underwriting",
  },
  {
    email: "insurer@demo.com",
    role: "insurer",
    full_name: "Demo Insurer",
    org_name: "Lloyd's Syndicate 0001",
  },
];

let failures = 0;

for (const a of ACCOUNTS) {
  // Check if user already exists (re-runnability)
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = existing?.users?.find((u) => u.email === a.email);

  let userId;
  if (found) {
    console.log(`[${a.email}] exists (id=${found.id}); updating metadata + password`);
    const { data, error } = await admin.auth.admin.updateUserById(found.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { role: a.role, full_name: a.full_name, org_name: a.org_name },
    });
    if (error) {
      console.error(`  ✗ update failed: ${error.message}`);
      failures += 1;
      continue;
    }
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { role: a.role, full_name: a.full_name, org_name: a.org_name },
    });
    if (error) {
      console.error(`[${a.email}] ✗ create failed: ${error.message}`);
      failures += 1;
      continue;
    }
    console.log(`[${a.email}] created (id=${data.user.id})`);
    userId = data.user.id;
  }

  // Confirm profiles row landed (trigger should have fired)
  const { data: prof, error: pErr } = await admin
    .from("profiles")
    .select("id, email, role, full_name, org_name")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) {
    console.error(`  ✗ profiles read failed: ${pErr.message}`);
    failures += 1;
    continue;
  }
  if (!prof) {
    // trigger may not have fired (rare); upsert defensively
    console.log(`  ! no profile row found, upserting`);
    const { error: upErr } = await admin.from("profiles").upsert({
      id: userId,
      email: a.email,
      role: a.role,
      full_name: a.full_name,
      org_name: a.org_name,
    });
    if (upErr) {
      console.error(`  ✗ profiles upsert failed: ${upErr.message}`);
      failures += 1;
      continue;
    }
    console.log(`  ✓ profile upserted`);
  } else if (prof.role !== a.role) {
    console.log(`  ! role mismatch (db=${prof.role} expected=${a.role}); fixing`);
    const { error: upErr } = await admin
      .from("profiles")
      .update({ role: a.role, full_name: a.full_name, org_name: a.org_name })
      .eq("id", userId);
    if (upErr) {
      console.error(`  ✗ profiles fix failed: ${upErr.message}`);
      failures += 1;
      continue;
    }
    console.log(`  ✓ profile role corrected`);
  } else {
    console.log(`  ✓ profile role=${prof.role} full_name="${prof.full_name}"`);
  }
}

console.log("\n=== final state ===");
const { data: allProfiles } = await admin
  .from("profiles")
  .select("email, role, full_name, org_name")
  .in(
    "email",
    ACCOUNTS.map((a) => a.email),
  )
  .order("role");
console.table(allProfiles ?? []);

process.exit(failures === 0 ? 0 : 1);
