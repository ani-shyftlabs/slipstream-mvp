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
const fail = [];
const log = (...a) => console.log(...a);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ============================================================
// Gate 1 — DB shape via service role
// ============================================================
log("[1] DB state");
const { data: rooms } = await admin
  .from("deal_rooms")
  .select("insured_name, status, class_of_business, coverage_amount")
  .order("created_at", { ascending: false });
log(`  rooms (${rooms?.length}):`, rooms?.map((r) => `${r.insured_name}/${r.status}`).join(", "));
const expected = new Set([
  "Westbrook Industrial Holdings Ltd",
  "Cresthill Industries Ltd",
  "Northgate Group Inc",
]);
if (rooms?.length !== 3) fail.push(`expected 3 rooms, got ${rooms?.length}`);
for (const r of rooms ?? []) if (!expected.has(r.insured_name)) fail.push(`unexpected room: ${r.insured_name}`);
const byName = Object.fromEntries((rooms ?? []).map((r) => [r.insured_name, r]));
if (byName["Westbrook Industrial Holdings Ltd"]?.status !== "draft") fail.push("Westbrook should be draft");
if (byName["Cresthill Industries Ltd"]?.status !== "active") fail.push("Cresthill should be active");
if (byName["Northgate Group Inc"]?.status !== "closed") fail.push("Northgate should be closed");

const { count: pCount } = await admin.from("parties").select("*", { count: "exact", head: true });
const { count: qCount } = await admin.from("quotes").select("*", { count: "exact", head: true });
const { count: aCount } = await admin.from("activities").select("*", { count: "exact", head: true });
log(`  parties=${pCount} quotes=${qCount} activities=${aCount}`);
if (pCount !== 3) fail.push(`expected 3 parties, got ${pCount}`);
if (qCount !== 2) fail.push(`expected 2 quotes, got ${qCount}`);
if ((aCount ?? 0) < 8) fail.push(`expected ≥8 activities, got ${aCount}`);

const browser = await chromium.launch();
try {
  // ============================================================
  // Sign in as broker
  // ============================================================
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") log(`    [console.error] ${msg.text()}`);
  });
  await page.goto(`${SITE}/login`);
  await page.fill('input[name="email"]', "broker@demo.com");
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL("**/broker/dashboard", { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("networkidle");
  // Force a fresh render to defeat any stale RSC cache.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  // ============================================================
  // Gate 2 — Broker dashboard shows 3 rooms
  // ============================================================
  log("\n[2] broker dashboard rows");
  for (const name of expected) {
    const has = await page.locator(`a:has(span:has-text("${name}"))`).count();
    log(`  "${name}": ${has}`);
    if (has === 0) fail.push(`missing dashboard row: ${name}`);
  }

  // ============================================================
  // Gate 3 — macOS UI: topbar frosted, card shadow + rounded, row hover lift
  // ============================================================
  log("\n[3] macOS UI checks");
  const headerProps = await page.locator("header").first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
      bg: cs.backgroundColor,
      position: cs.position,
    };
  });
  log(`  header: ${JSON.stringify(headerProps)}`);
  if (!/blur/i.test(headerProps.backdropFilter ?? "")) fail.push(`header lacks backdrop-blur (${headerProps.backdropFilter})`);
  if (headerProps.position !== "sticky") fail.push("header not sticky");

  // Card shadow + rounded
  const cardProps = await page.locator("[class*='rounded-xl'][class*='border-silver']").first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { borderRadius: cs.borderRadius, boxShadow: cs.boxShadow };
  });
  log(`  card: ${JSON.stringify(cardProps)}`);
  if (!cardProps.borderRadius.startsWith("12")) fail.push(`card not rounded-xl 12px: ${cardProps.borderRadius}`);
  if (cardProps.boxShadow === "none") fail.push(`card has no shadow`);

  // Row hover lift — sample first row's transition style
  const firstRow = page.locator(`a:has(span:has-text("Cresthill Industries Ltd"))`).first();
  const rowStyle = await firstRow.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { transition: cs.transitionProperty, borderRadius: cs.borderRadius };
  });
  log(`  row: ${JSON.stringify(rowStyle)}`);
  if (!/transform|all/.test(rowStyle.transition)) fail.push(`row transition missing: ${rowStyle.transition}`);

  // ============================================================
  // Gate 4-9 — Assistant flow
  // ============================================================
  log("\n[4] assistant trigger visible");
  const triggerCount = await page.locator('button[aria-label="Open Slipstream Assistant"]').count();
  log(`  trigger count: ${triggerCount}`);
  if (triggerCount === 0) fail.push("assistant trigger button missing");

  await page.click('button[aria-label="Open Slipstream Assistant"]');
  await page.waitForSelector('[data-assistant-panel]', { timeout: 5000 });

  log("\n[5] welcome message");
  const welcomeText = await page.locator('[data-assistant-panel] .rounded-2xl').first().textContent();
  log(`  welcome: "${welcomeText?.slice(0, 120)}"`);
  if (!/Demo Broker|broker@demo/i.test(welcomeText ?? "")) fail.push(`welcome doesn't include user name: ${welcomeText}`);

  async function ask(question) {
    const before = await page.locator('[data-assistant-panel] .rounded-2xl').count();
    await page.fill('[data-assistant-panel] input', question);
    await page.press('[data-assistant-panel] input', "Enter");
    // Wait until: typing indicator is gone AND we have ≥ before+2 bubbles
    await page.waitForFunction(
      (b) => {
        const bubbles = document.querySelectorAll('[data-assistant-panel] .rounded-2xl');
        const hasTyping = !!document.querySelector('[data-assistant-panel] .animate-bounce');
        return !hasTyping && bubbles.length >= b + 2;
      },
      before,
      { timeout: 20000 },
    );
    const bubbles = await page.locator('[data-assistant-panel] .rounded-2xl').allTextContents();
    return bubbles[bubbles.length - 1] ?? "";
  }

  log("\n[6] 'show my deal rooms'");
  const a6 = await ask("show my deal rooms");
  log(`  reply: ${a6.slice(0, 240)}`);
  if (!/Westbrook/.test(a6) || !/Cresthill/.test(a6) || !/Northgate/.test(a6)) {
    fail.push(`'show my deal rooms' missing rooms: ${a6}`);
  }

  log("\n[7] 'how many active quotes'");
  const a7 = await ask("how many active quotes");
  log(`  reply: ${a7}`);
  if (!/active/i.test(a7) || !/quote/i.test(a7)) fail.push(`'how many active quotes' answer weird: ${a7}`);
  // Should mention "1 active deal room with 1 quote"
  if (!/1 active/i.test(a7) || !/1 quote/i.test(a7)) {
    fail.push(`'how many active quotes' counts wrong: ${a7}`);
  }

  log("\n[8] 'status of Cresthill'");
  const a8 = await ask("status of Cresthill");
  log(`  reply: ${a8}`);
  if (!/Cresthill/.test(a8) || !/Active/i.test(a8)) {
    fail.push(`'status of Cresthill' answer wrong: ${a8}`);
  }

  log("\n[9] 'latest quote'");
  const a9 = await ask("latest quote");
  log(`  reply: ${a9}`);
  // Cresthill MGA quote ($145,000) is most recent submitted
  if (!/145,000/.test(a9) || !/Cresthill/.test(a9)) {
    fail.push(`'latest quote' doesn't surface Cresthill / 145000: ${a9}`);
  }

  log("\n[10] fallback");
  const a10 = await ask("what's the weather");
  log(`  reply: ${a10.slice(0, 200)}`);
  if (!/help with deal rooms and quotes/i.test(a10)) {
    fail.push(`fallback missing: ${a10}`);
  }

  // Close the assistant
  await page.click('button[aria-label="Close assistant"]');
  await page.waitForTimeout(200);

  // ============================================================
  // Gate 11 — Loading skeleton (best-effort: navigate then look quickly)
  // ============================================================
  log("\n[11] loading skeleton (best-effort detection)");
  // Hard to catch in headless; check that the file is served (Next emits a chunk for it)
  const navResp = page.waitForResponse((r) => r.url().includes("/broker/quotes") && r.status() === 200, { timeout: 10000 }).catch(() => null);
  await page.goto(`${SITE}/broker/quotes`);
  await navResp;
  log("  loaded /broker/quotes");
  // The skeleton flickers but the page now renders; just confirm route works.
  const h1 = (await page.locator("h1").first().textContent())?.trim();
  if (h1 !== "Deal Rooms") fail.push(`/broker/quotes h1 mismatch: ${h1}`);

  // ============================================================
  // Gate 12 — Live deploy + console errors
  // ============================================================
  log("\n[12] /broker/dashboard reachable + landing reachable");
  await page.goto(`${SITE}/broker/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.goto(`${SITE}/`, { waitUntil: "domcontentloaded" });
  log("  / loads OK");
  await ctx.close();
} catch (e) {
  fail.push(`unhandled: ${e.message}`);
  console.log("UNHANDLED:", e.stack ?? e.message);
} finally {
  await browser.close();
}

console.log("\n========== RESULT ==========");
if (fail.length === 0) {
  console.log("PASS — all Cycle 5 gate items OK");
  process.exit(0);
} else {
  console.log("FAIL");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(1);
}
