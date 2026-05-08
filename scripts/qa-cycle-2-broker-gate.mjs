// Verify "broker is the gate" — MGA & insurer cannot create deal_rooms
// even if they craft the broker_id. Their inserts must fail.
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const fail = [];

for (const email of ["mga@demo.com", "insurer@demo.com"]) {
  const c = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: s } = await c.auth.signInWithPassword({ email, password: "SlipstreamDemo2026" });
  const userId = s.user.id;
  const u = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${s.session.access_token}` } },
    auth: { persistSession: false },
  });

  // (a) Try with broker_id = self → must fail (user_has_role check)
  const { data: r1, error: e1 } = await u
    .from("deal_rooms")
    .insert({
      broker_id: userId,
      insured_name: `gate-test-self-${Date.now()}`,
      class_of_business: "Property",
      coverage_type: "All-Risks",
    })
    .select();
  console.log(`[${email}] insert with broker_id=self: ${e1 ? "BLOCKED ("+e1.message+")" : `OK rows=${r1?.length}`}`);
  if (!e1 && r1?.length) fail.push(`[${email}] managed to insert deal_room with own id (broker-as-gate broken)`);

  // (b) Try with broker_id = some other user → must fail (broker_id = auth.uid() check)
  const { data: r2, error: e2 } = await u
    .from("deal_rooms")
    .insert({
      broker_id: "00000000-0000-0000-0000-000000000000",
      insured_name: `gate-test-other-${Date.now()}`,
      class_of_business: "Property",
      coverage_type: "All-Risks",
    })
    .select();
  console.log(`[${email}] insert with broker_id=zero: ${e2 ? "BLOCKED ("+e2.message+")" : `OK rows=${r2?.length}`}`);
  if (!e2 && r2?.length) fail.push(`[${email}] managed to insert deal_room with foreign id`);
}

console.log("\n========== BROKER-GATE RESULT ==========");
if (fail.length === 0) {
  console.log("PASS — non-broker users cannot create deal_rooms");
  process.exit(0);
} else {
  console.log("FAIL");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(1);
}
