import { chromium } from "playwright";
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

const SITE = "https://slipstream-mvp.vercel.app";
const PASSWORD = "SlipstreamDemo2026";
const ROLES = [
  { email: "broker@demo.com", role: "broker", label: "BROKER" },
  { email: "mga@demo.com", role: "mga", label: "MGA" },
  { email: "insurer@demo.com", role: "insurer", label: "INSURER" },
];

const fail = [];
const log = (...a) => console.log(...a);

// =========================================================================
// PART 1 — Browser flow per role (signin → dashboard URL → role badge)
// =========================================================================
const browser = await chromium.launch();
for (const r of ROLES) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  log(`\n[${r.email}] sign-in flow`);

  await page.goto(`${SITE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', r.email);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(`**/${r.role}/dashboard`, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]).catch((e) => fail.push(`[${r.email}] sign-in→/${r.role}/dashboard failed: ${e.message}`));
  log(`  url=${page.url()}`);
  if (!page.url().endsWith(`/${r.role}/dashboard`)) {
    fail.push(`[${r.email}] expected /${r.role}/dashboard, got ${page.url()}`);
    await ctx.close();
    continue;
  }

  // Role badge
  const badge = page.locator(`[data-role="${r.role}"]`).first();
  const badgeText = (await badge.textContent().catch(() => null))?.trim();
  log(`  badge: "${badgeText}"`);
  if (badgeText !== r.label) fail.push(`[${r.email}] role badge "${badgeText}" !== "${r.label}"`);
  const badgeBg = await badge.evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => null);
  log(`  badge bg: ${badgeBg}`);
  // gold #C49A2C with /95 opacity → ~rgb(196 154 44 / 0.95) compiled to rgba(196,154,44,0.95)
  if (!badgeBg || !/196.*154.*44/.test(badgeBg)) fail.push(`[${r.email}] badge bg not gold (got ${badgeBg})`);

  // Topbar still navy + 52px
  const header = page.locator("header").first();
  const hbox = await header.boundingBox();
  if (!hbox || Math.abs(hbox.height - 52) > 2) fail.push(`[${r.email}] header height ${hbox?.height} ≠ 52`);
  const hbg = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
  if (!/rgb\(\s*15\s*,\s*37\s*,\s*64\s*\)/.test(hbg)) fail.push(`[${r.email}] header bg ${hbg} ≠ navy`);

  // Sidebar nav present
  const sidebarLinks = await page.locator("aside a").allTextContents();
  log(`  sidebar links: ${JSON.stringify(sidebarLinks)}`);
  const expectedFirst = "Dashboard";
  if (!sidebarLinks.includes(expectedFirst)) fail.push(`[${r.email}] sidebar missing "${expectedFirst}"`);
  if (r.role === "broker" && !sidebarLinks.includes("Deal Rooms")) fail.push(`broker sidebar missing "Deal Rooms"`);
  if (r.role === "mga" && !sidebarLinks.includes("Quotes")) fail.push(`mga sidebar missing "Quotes"`);

  // H1 includes role-appropriate label
  const h1 = (await page.locator("h1").first().textContent())?.trim();
  log(`  h1: "${h1}"`);
  const expectH1 = r.role === "broker" ? "Broker Dashboard" :
                   r.role === "mga"    ? "MGA Dashboard"    : "Insurer Dashboard";
  if (h1 !== expectH1) fail.push(`[${r.email}] h1 "${h1}" ≠ "${expectH1}"`);

  await ctx.close();
}

// =========================================================================
// PART 2 — Cross-role redirect: as MGA, hitting /broker/dashboard → /mga/dashboard
// =========================================================================
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${SITE}/login`);
  await page.fill('input[name="email"]', "mga@demo.com");
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL("**/mga/dashboard", { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  log("\n[cross-role] mga@ trying /broker/dashboard");
  await page.goto(`${SITE}/broker/dashboard`, { waitUntil: "domcontentloaded" });
  log(`  url=${page.url()}`);
  if (!page.url().endsWith("/mga/dashboard")) fail.push(`cross-role redirect failed: ${page.url()}`);
  await ctx.close();
}

await browser.close();

// =========================================================================
// PART 3 — RLS sanity via Supabase REST as each demo user
// =========================================================================
log("\n[RLS] querying deal_rooms as each demo user");
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
for (const r of ROLES) {
  const { data: session, error: sErr } = await anonClient.auth.signInWithPassword({
    email: r.email,
    password: PASSWORD,
  });
  if (sErr) {
    fail.push(`[RLS ${r.email}] sign-in failed: ${sErr.message}`);
    continue;
  }
  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
    auth: { persistSession: false },
  });
  const { data: rooms, error: rErr } = await userClient.from("deal_rooms").select("id");
  if (rErr) {
    fail.push(`[RLS ${r.email}] select deal_rooms failed: ${rErr.message}`);
    continue;
  }
  log(`  ${r.email} → deal_rooms.length=${rooms.length}`);
  if (rooms.length !== 0) fail.push(`[RLS ${r.email}] expected 0 deal_rooms, got ${rooms.length}`);
  await anonClient.auth.signOut();
}

// Profile rows for each demo user — should be visible to self
log("\n[RLS] each user can see own profile");
for (const r of ROLES) {
  const { data: session } = await anonClient.auth.signInWithPassword({
    email: r.email,
    password: PASSWORD,
  });
  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
    auth: { persistSession: false },
  });
  const { data: prof } = await userClient
    .from("profiles")
    .select("id, email, role")
    .eq("id", session.user.id)
    .maybeSingle();
  log(`  ${r.email} → role=${prof?.role}`);
  if (prof?.role !== r.role) fail.push(`[RLS ${r.email}] own profile role wrong: ${prof?.role}`);
  await anonClient.auth.signOut();
}

// =========================================================================
// PART 4 — Schema check via service role (counts on each table)
// =========================================================================
log("\n[schema] table counts via service role");
const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
for (const t of ["profiles", "deal_rooms", "parties", "quotes", "activities"]) {
  const { count, error } = await adminClient.from(t).select("*", { count: "exact", head: true });
  if (error) {
    fail.push(`[schema] ${t} read failed: ${error.message}`);
    continue;
  }
  log(`  ${t}: ${count} rows`);
}

console.log("\n========== RESULT ==========");
if (fail.length === 0) {
  console.log("PASS — all Cycle 2 gate items OK");
  process.exit(0);
} else {
  console.log("FAIL");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(1);
}
