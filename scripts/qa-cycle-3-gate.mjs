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

const stamp = `qa-cycle3-${Date.now()}`;
const insuredName = `QA Cycle 3 — ${stamp}`;

// Cleanup helper using service role
const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function cleanup() {
  const { data: rooms } = await adminClient
    .from("deal_rooms")
    .select("id")
    .like("insured_name", "QA Cycle 3 —%");
  if (rooms?.length) {
    for (const r of rooms) {
      await adminClient.from("deal_rooms").delete().eq("id", r.id);
    }
    log(`[cleanup] deleted ${rooms.length} test deal_room(s)`);
  }
}
process.on("exit", () => {});

const browser = await chromium.launch();

try {
  // =====================================================================
  // Gate 9 — Anonymous landing
  // =====================================================================
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    log("\n[9] anonymous landing");
    const resp = await page.goto(`${SITE}/`, { waitUntil: "domcontentloaded" });
    log(`  GET / status=${resp.status()} url=${page.url()}`);
    if (page.url() !== `${SITE}/`) fail.push(`anonymous / redirected (was ${page.url()})`);

    const rawHero = (await page.locator("h1").first().textContent()) ?? "";
    // Normalize: collapse whitespace AND insert a space across <br />, normalize curly quotes
    const heroText = rawHero
      .replace(/[‘’]/g, "'")
      .replace(/livein/g, "live in") // <br/> joins without space
      .replace(/\s+/g, " ")
      .trim();
    log(`  hero: "${heroText}"`);
    if (!/Your placement doesn't live in your inbox\./.test(heroText)) {
      fail.push(`hero headline mismatch: "${heroText}"`);
    }

    // Sign In / Get Started CTAs in nav (anonymous)
    const signIn = await page.getByRole("link", { name: "Sign In" }).first().getAttribute("href");
    const getStarted = await page.getByRole("link", { name: "Get Started" }).first().getAttribute("href");
    log(`  Sign In→${signIn} | Get Started→${getStarted}`);
    if (signIn !== "/login") fail.push(`Sign In→${signIn} (expected /login)`);
    if (getStarted !== "/signup") fail.push(`Get Started→${getStarted} (expected /signup)`);

    // All section anchors present
    const sectionIds = ["features", "how-it-works", "who-its-for", "pricing"];
    for (const id of sectionIds) {
      const exists = await page.locator(`#${id}`).count();
      if (exists === 0) fail.push(`landing missing section #${id}`);
    }
    log(`  sections: ${sectionIds.map((id) => `#${id}=ok`).join(" ")}`);

    // Em + gold check
    const emColors = await page.locator("h1 em, h2 em").evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).color),
    );
    log(`  em colors (count=${emColors.length}): unique=${[...new Set(emColors)].slice(0,3).join(",")}`);
    if (!emColors.every((c) => /196.*154.*44/.test(c))) {
      fail.push(`some <em> in headings not gold: ${[...new Set(emColors)].join("|")}`);
    }
    await ctx.close();
  }

  // =====================================================================
  // Gate 1, 2, 3, 4, 5, 7 — Broker create + invite roundtrip
  // =====================================================================
  let createdRoomId = null;
  const brokerCtx = await browser.newContext();
  const broker = await brokerCtx.newPage();

  log("\n[broker] sign-in");
  await broker.goto(`${SITE}/login`);
  await broker.fill('input[name="email"]', "broker@demo.com");
  await broker.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    broker.waitForURL("**/broker/dashboard", { timeout: 15000 }),
    broker.click('button[type="submit"]'),
  ]);
  log(`  url=${broker.url()}`);

  // Gate 10 — Wordmark links to /
  log("\n[10] wordmark in dashboard topbar links to /");
  const wordmarkHref = await broker.locator("header a", { hasText: "Slipstream" }).first().getAttribute("href");
  log(`  wordmark href=${wordmarkHref}`);
  if (wordmarkHref !== "/") fail.push(`wordmark href=${wordmarkHref}, expected /`);

  // Authenticated landing — "Go to your broker dashboard" CTA visible
  log("\n[9-auth] click wordmark → landing as broker");
  await Promise.all([broker.waitForURL(`${SITE}/`, { timeout: 10000 }), broker.click('header a:has-text("Slipstream")')]);
  log(`  url=${broker.url()}`);
  const dashCTA = await broker.getByRole("link", { name: /Go to your broker dashboard/i }).count();
  log(`  authenticated CTA count=${dashCTA}`);
  if (dashCTA === 0) fail.push("authenticated landing missing 'Go to your broker dashboard' CTA");

  // Gate 1 — Broker dashboard
  log("\n[1] broker dashboard");
  await broker.goto(`${SITE}/broker/dashboard`);
  const initialRows = await broker.locator(`a[href^="/broker/quotes/"]`).count();
  log(`  initial deal-room links: ${initialRows}`);

  // Gate 2 — Open form
  log("\n[2] click + New Deal Room");
  await Promise.all([
    broker.waitForURL("**/broker/quotes/new", { timeout: 10000 }),
    broker.click('a:has-text("+ New Deal Room")'),
  ]);
  log(`  url=${broker.url()}`);

  // Gate 3 — Form submit
  log("\n[3] fill + submit form");
  await broker.fill('input[name="insured_name"]', insuredName);
  // Native <select> via Radix has hidden underlying form fields — use shadcn Select via click
  await broker.click('button#class_of_business');
  await broker.click('div[role="option"]:has-text("GL")');
  await broker.fill('input[name="location"]', "Ontario, Canada");
  await broker.click('button#coverage_type');
  await broker.click('div[role="option"]:has-text("General Liability")');
  await broker.fill('input[name="coverage_amount"]', "5000000");
  await broker.fill('textarea[name="notes"]', "QA Cycle 3 probe — auto-created");

  await Promise.all([
    broker.waitForURL(/\/broker\/quotes\/[0-9a-f-]+$/, { timeout: 15000 }),
    broker.click('button[type="submit"]:has-text("Create deal room")'),
  ]);
  const detailUrl = broker.url();
  createdRoomId = detailUrl.split("/").pop();
  log(`  redirected to ${detailUrl}`);
  log(`  created room id: ${createdRoomId}`);

  // Gate 4 — Detail page renders
  log("\n[4] detail page fields");
  const h1 = (await broker.locator("h1").first().textContent())?.trim();
  if (h1 !== insuredName) fail.push(`detail H1 "${h1}" ≠ "${insuredName}"`);

  const draftBadge = await broker.locator('[data-status="draft"]').count();
  if (draftBadge === 0) fail.push("draft status badge missing on detail page");

  // Gate 5 — Invite Party
  log("\n[5] invite party modal");
  await broker.click('button:has-text("+ Invite Party")');
  await broker.waitForSelector('[role="dialog"]', { timeout: 5000 });
  // MGA radio is default-selected. Open Select via its combobox role (Radix).
  await broker.locator('[role="dialog"] [role="combobox"]').first().click();
  await broker.click('div[role="option"]:has-text("Demo MGA")');
  await Promise.all([
    broker.waitForResponse((r) => r.url().includes("/broker/quotes/") && r.request().method() === "POST", { timeout: 15000 }).catch(() => null),
    broker.click('[role="dialog"] button:has-text("Invite")'),
  ]);
  // Wait for refresh
  await broker.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 10000 });
  await broker.waitForLoadState("networkidle");
  log(`  modal closed, url=${broker.url()}`);

  // Gate 5 — status changed draft → active
  log("\n[5b] status now active");
  const activeBadge = await broker.locator('[data-status="active"]').count();
  log(`  active badge count: ${activeBadge}`);
  if (activeBadge === 0) fail.push("status not transitioned to active after invite");

  // Gate 7 — Activity feed shows created + invited
  log("\n[7] activity feed");
  const feedTexts = await broker.locator("ol > li p.text-sm").allTextContents();
  log(`  feed: ${JSON.stringify(feedTexts)}`);
  if (feedTexts.length < 2) fail.push(`activity feed has ${feedTexts.length} entries, expected ≥ 2`);
  // Latest first → "Invited" should be top, "created" bottom
  if (!feedTexts[0]?.toLowerCase().includes("invited")) fail.push(`feed[0]="${feedTexts[0]}" — expected an "Invited" entry first`);
  const lastText = feedTexts[feedTexts.length - 1] ?? "";
  if (!lastText.toLowerCase().includes("created")) fail.push(`feed[last]="${lastText}" — expected a "created" entry last`);

  await brokerCtx.close();

  // =====================================================================
  // Gate 6 — MGA sees the new deal room (RLS allows)
  // =====================================================================
  log("\n[6] mga sees the new deal room");
  const mgaCtx = await browser.newContext();
  const mga = await mgaCtx.newPage();
  await mga.goto(`${SITE}/login`);
  await mga.fill('input[name="email"]', "mga@demo.com");
  await mga.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    mga.waitForURL("**/mga/dashboard", { timeout: 15000 }),
    mga.click('button[type="submit"]'),
  ]);
  const mgaSees = await mga.locator(`text="${insuredName}"`).count();
  log(`  mga dashboard contains "${insuredName}": count=${mgaSees}`);
  if (mgaSees === 0) fail.push("MGA cannot see the deal room they were invited to (RLS / query bug)");
  await mgaCtx.close();

  // Insurer should NOT see it (was not invited)
  log("\n[6b] insurer does NOT see the new deal room");
  const insurerCtx = await browser.newContext();
  const insurer = await insurerCtx.newPage();
  await insurer.goto(`${SITE}/login`);
  await insurer.fill('input[name="email"]', "insurer@demo.com");
  await insurer.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    insurer.waitForURL("**/insurer/dashboard", { timeout: 15000 }),
    insurer.click('button[type="submit"]'),
  ]);
  const insurerSees = await insurer.locator(`text="${insuredName}"`).count();
  log(`  insurer dashboard contains "${insuredName}": count=${insurerSees}`);
  if (insurerSees > 0) fail.push("insurer can see a deal room they were not invited to (RLS leak)");
  await insurerCtx.close();
} catch (e) {
  fail.push(`unhandled: ${e.message}`);
  console.log("UNHANDLED:", e.stack ?? e.message);
} finally {
  await browser.close();
  await cleanup();
}

console.log("\n========== RESULT ==========");
if (fail.length === 0) {
  console.log("PASS — all Cycle 3 gate items OK");
  process.exit(0);
} else {
  console.log("FAIL");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(1);
}
