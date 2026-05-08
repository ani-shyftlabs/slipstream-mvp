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

const stamp = `qa-cycle4-${Date.now()}`;
const insuredName = `QA Cycle 4 — ${stamp}`;

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function cleanup() {
  const { data: rooms } = await admin
    .from("deal_rooms")
    .select("id")
    .like("insured_name", "QA Cycle 4 —%");
  if (rooms?.length) {
    for (const r of rooms) await admin.from("deal_rooms").delete().eq("id", r.id);
    log(`[cleanup] deleted ${rooms.length} test deal_room(s)`);
  }
}

async function signIn(page, email) {
  await page.goto(`${SITE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/\/(broker|mga|insurer)\/dashboard$/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

const browser = await chromium.launch();
let dealRoomId = null;
let quoteRowId = null;

try {
  // ============================================================
  // BUG FIX 1 + Step 1 — broker sidebar "Deal Rooms" → /broker/quotes
  // ============================================================
  log("\n[BUG-FIX-1 + 1] broker /broker/quotes lists rooms");
  const brokerCtx = await browser.newContext();
  const broker = await brokerCtx.newPage();
  await signIn(broker, "broker@demo.com");
  await Promise.all([
    broker.waitForURL("**/broker/quotes", { timeout: 10000 }),
    broker.click('aside a:has-text("Deal Rooms")'),
  ]);
  log(`  url=${broker.url()}`);
  if (!broker.url().endsWith("/broker/quotes")) fail.push("sidebar Deal Rooms link did not land on /broker/quotes");
  const brokerListH1 = (await broker.locator("h1").first().textContent())?.trim();
  log(`  h1="${brokerListH1}"`);
  if (brokerListH1 !== "Deal Rooms") fail.push(`/broker/quotes h1 mismatch: "${brokerListH1}"`);

  // ============================================================
  // Step 2 — broker creates Acme Manufacturing room
  // ============================================================
  log("\n[2] broker creates deal room");
  await Promise.all([
    broker.waitForURL("**/broker/quotes/new", { timeout: 10000 }),
    broker.click('a:has-text("+ New Deal Room")'),
  ]);
  await broker.fill('input[name="insured_name"]', insuredName);
  await broker.click("button#class_of_business");
  await broker.click('div[role="option"]:has-text("GL")');
  await broker.fill('input[name="location"]', "Ontario, Canada");
  await broker.click("button#coverage_type");
  await broker.click('div[role="option"]:has-text("General Liability")');
  await broker.fill('input[name="coverage_amount"]', "5000000");
  await broker.fill('textarea[name="notes"]', "QA cycle 4 probe");
  await Promise.all([
    broker.waitForURL(/\/broker\/quotes\/[0-9a-f-]+$/, { timeout: 15000 }),
    broker.click('button[type="submit"]:has-text("Create deal room")'),
  ]);
  dealRoomId = broker.url().split("/").pop();
  log(`  created ${dealRoomId}`);

  // ============================================================
  // Step 3 — broker invites mga + insurer
  // ============================================================
  async function invite(page, who, role) {
    await page.click('button:has-text("+ Invite Party")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    if (role === "insurer") {
      await page.click('[role="dialog"] label:has-text("Insurer")');
    }
    await page.locator('[role="dialog"] [role="combobox"]').first().click();
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    await page.getByRole("option", { name: new RegExp(who, "i") }).click();
    await page.waitForTimeout(200);
    await page.locator('[role="dialog"] button:has-text("Invite")').last().click();
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 10000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
  }

  log("\n[3] broker invites Demo MGA + Demo Insurer");
  await invite(broker, "Demo MGA", "mga");
  await invite(broker, "Demo Insurer", "insurer");
  const partiesCount = await broker.locator('span.font-mono.text-xs.text-gold').count();
  log(`  parties on page: ${partiesCount}`);
  if (partiesCount < 2) fail.push(`expected 2 parties shown, got ${partiesCount}`);

  // ============================================================
  // Step 4 — MGA submits quote
  // ============================================================
  log("\n[4] mga submits quote");
  const mgaCtx = await browser.newContext();
  const mga = await mgaCtx.newPage();
  await signIn(mga, "mga@demo.com");
  // Click the row matching insuredName from /mga/dashboard
  const mgaRow = mga.locator(`a:has(span:has-text("${insuredName}"))`).first();
  await Promise.all([
    mga.waitForURL(/\/mga\/quotes\/[0-9a-f-]+$/, { timeout: 10000 }),
    mgaRow.click(),
  ]);
  log(`  on detail: ${mga.url()}`);

  await mga.fill('input[name="premium"]', "250000");
  await mga.fill('input[name="deductible"]', "25000");
  await mga.fill('input[name="coverage_limit"]', "5000000");
  await mga.fill('textarea[name="terms"]', "Standard 12-month GL — qa probe");
  await mga.click('button[type="submit"]:has-text("Submit Quote")');
  await mga.waitForLoadState("networkidle");
  await mga.reload({ waitUntil: "domcontentloaded" });
  // After submit: Submit form should be gone, "Your quote" status should show submitted
  const mySubmittedPill = await mga.locator('text="submitted"').first().count();
  if (mySubmittedPill === 0) fail.push("mga: own-quote 'submitted' pill not visible after submit");
  log(`  mga sees own quote submitted=${mySubmittedPill > 0}`);
  await mgaCtx.close();

  // ============================================================
  // Step 5 — broker sees the quote, binds it
  // ============================================================
  log("\n[5] broker sees the quote on detail page + binds");
  await broker.reload({ waitUntil: "domcontentloaded" });
  await broker.waitForLoadState("networkidle");
  // Find a Bind button in the quotes list
  const bindBtnCount = await broker.locator('button:has-text("Bind")').count();
  log(`  bind buttons visible: ${bindBtnCount}`);
  if (bindBtnCount === 0) fail.push("broker: no Bind button visible after MGA submission");

  await broker.click('button:has-text("Bind")');
  await broker.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await broker.click('[role="dialog"] button:has-text("Confirm bind")');
  await broker.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 10000 });
  await broker.reload({ waitUntil: "domcontentloaded" });
  await broker.waitForLoadState("networkidle");

  const boundBadge = await broker.locator('[data-status="bound"]').count();
  log(`  bound badge: ${boundBadge}`);
  if (boundBadge === 0) fail.push("status not transitioned to 'bound' after Bind");

  // ============================================================
  // Step 6 — Export Compliance Package downloads JSON
  // ============================================================
  log("\n[6] export compliance package");
  const [download] = await Promise.all([
    broker.waitForEvent("download", { timeout: 15000 }),
    broker.click('button:has-text("Export Compliance Package")'),
  ]);
  const filename = download.suggestedFilename();
  log(`  filename: ${filename}`);
  if (!/^slipstream-.*-compliance\.json$/.test(filename)) {
    fail.push(`bad export filename: ${filename}`);
  }
  const path = await download.path();
  const json = JSON.parse(readFileSync(path, "utf8"));
  log(
    `  package keys: ${Object.keys(json).join(",")} | ` +
      `parties=${json.parties.length} quotes=${json.quotes.length} activities=${json.activities.length}`,
  );
  if (!json.deal_room || !json.parties || !json.quotes || !json.activities) {
    fail.push("compliance package missing one of {deal_room, parties, quotes, activities}");
  }
  if (json.parties.length !== 2) fail.push(`compliance parties=${json.parties.length}, expected 2`);
  if (json.quotes.length !== 1) fail.push(`compliance quotes=${json.quotes.length}, expected 1`);
  if (json.activities.length < 4) fail.push(`compliance activities=${json.activities.length}, expected ≥ 4`);

  // ============================================================
  // Step 7 — Close Deal Room
  // ============================================================
  log("\n[7] close deal room");
  await broker.click('button:has-text("Close Deal Room")');
  await broker.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await broker.click('[role="dialog"] button:has-text("Confirm close")');
  await broker.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 10000 });
  await broker.reload({ waitUntil: "domcontentloaded" });
  const closedBadge = await broker.locator('[data-status="closed"]').count();
  log(`  closed badge: ${closedBadge}`);
  if (closedBadge === 0) fail.push("status not transitioned to 'closed'");
  await brokerCtx.close();

  // ============================================================
  // Step 8 — Insurer sees bound deal, opens it (BUG FIX 2 row click)
  // ============================================================
  log("\n[8] insurer sees bound deal + clicks row");
  const insurerCtx = await browser.newContext();
  const insurer = await insurerCtx.newPage();
  await signIn(insurer, "insurer@demo.com");
  const insurerRow = insurer.locator(`a:has(span:has-text("${insuredName}"))`).first();
  if ((await insurerRow.count()) === 0) {
    fail.push("insurer dashboard: bound deal row not visible");
  } else {
    await Promise.all([
      insurer.waitForURL(/\/insurer\/quotes\/[0-9a-f-]+$/, { timeout: 10000 }),
      insurerRow.click(),
    ]);
    log(`  on detail: ${insurer.url()}`);
    const winningCard = await insurer.locator('text="Winning quote"').count();
    log(`  winning card on insurer view: ${winningCard}`);
    if (winningCard === 0) fail.push("insurer: winning-quote card missing on detail");
    const winningPremium = await insurer.locator(`text=/\\$250,000/`).first().count();
    if (winningPremium === 0) fail.push("insurer: winning premium $250,000 not displayed");
    // No bind/close buttons should be present
    const editBtns = await insurer.locator('button:has-text("Bind"), button:has-text("Close"), button:has-text("+ Invite Party")').count();
    if (editBtns > 0) fail.push(`insurer view has ${editBtns} edit-affordance buttons (should be 0)`);
  }
  await insurerCtx.close();

  // ============================================================
  // Step 9 — MGA sees own quote as 'won'
  // ============================================================
  log("\n[9] mga sees own quote 'won'");
  const mga2Ctx = await browser.newContext();
  const mga2 = await mga2Ctx.newPage();
  await signIn(mga2, "mga@demo.com");
  await mga2.click(`a:has(span:has-text("${insuredName}"))`);
  await mga2.waitForLoadState("networkidle");
  const wonPill = await mga2.locator('text=/^won$/i').first().count();
  log(`  won pill count: ${wonPill}`);
  if (wonPill === 0) fail.push("mga: own quote not flagged 'won' after bind");
  await mga2Ctx.close();

  // ============================================================
  // Step 10 — RLS leak check: forge a quote from a different party_id
  // ============================================================
  log("\n[10] RLS — fabricate quote from a foreign party_id and confirm mga can't see it");
  // Find another deal room (not the test one) where insurer is the only party,
  // then attempt a forged quote read.
  // Simpler approach: as service-role insert a synthetic quote attached to insurer's
  // party_id, then try to read it as the MGA via PostgREST. RLS should hide it.
  const { data: usersAll } = await admin.auth.admin.listUsers();
  const insurerUser = usersAll.users.find((u) => u.email === "insurer@demo.com");
  // The MGA's party row on this deal room
  const { data: mgaParty } = await admin
    .from("parties")
    .select("id")
    .eq("deal_room_id", dealRoomId)
    .eq("party_user_id", (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === "mga@demo.com").id)
    .maybeSingle();
  // Insurer's party row (we invited them). Use as the fake submitter.
  const { data: insurerParty } = await admin
    .from("parties")
    .select("id")
    .eq("deal_room_id", dealRoomId)
    .eq("party_user_id", insurerUser.id)
    .maybeSingle();
  const { data: forged, error: forgeErr } = await admin
    .from("quotes")
    .insert({
      deal_room_id: dealRoomId,
      party_id: insurerParty.id,
      premium: 999999,
      deductible: 0,
      coverage_limit: 1,
      terms: "FORGED — should not be visible to MGA",
      status: "submitted",
    })
    .select("id")
    .single();
  if (forgeErr) {
    log(`  forge failed: ${forgeErr.message}`);
  } else {
    quoteRowId = forged.id;
    log(`  forged quote ${forged.id} attached to insurer party`);
    // MGA reads quotes via RLS-bound client
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: session } = await anon.auth.signInWithPassword({
      email: "mga@demo.com",
      password: PASSWORD,
    });
    const mgaClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
      auth: { persistSession: false },
    });
    const { data: mgaQuotes } = await mgaClient
      .from("quotes")
      .select("id, terms, party_id")
      .eq("deal_room_id", dealRoomId);
    const mgaCanSeeForged = mgaQuotes?.some((q) => q.id === forged.id);
    log(`  mga sees ${mgaQuotes?.length ?? 0} quotes on this room; sees forged? ${mgaCanSeeForged}`);
    if (mgaCanSeeForged) fail.push("RLS LEAK: MGA can read a quote from a different party");
  }
} catch (e) {
  fail.push(`unhandled: ${e.message}`);
  console.log("UNHANDLED:", e.stack ?? e.message);
} finally {
  await browser.close();
  await cleanup();
}

console.log("\n========== RESULT ==========");
if (fail.length === 0) {
  console.log("PASS — all Cycle 4 gate items OK");
  process.exit(0);
} else {
  console.log("FAIL");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(1);
}
