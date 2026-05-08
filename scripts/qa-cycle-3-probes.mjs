// Independent verification probes for Cycle 3 gate
// B) Insurer PostgREST quote-confidentiality probe
// C) Activity feed dot color check
// D) Landing h1/h2 Libre Baskerville computed style check
// E) 404 asset identification

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
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const log = (...a) => console.log(...a);
const results = {};

const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
const stamp = `qa-probe-${Date.now()}`;
const insuredName = `QA PROBE — ${stamp}`;

async function cleanup() {
  const { data: rooms } = await admin
    .from("deal_rooms")
    .select("id")
    .like("insured_name", "QA PROBE —%");
  if (rooms?.length) {
    for (const r of rooms) await admin.from("deal_rooms").delete().eq("id", r.id);
    log(`[cleanup] deleted ${rooms.length} probe deal_room(s)`);
  }
}

const browser = await chromium.launch();

try {
  // ===========================================================
  // SETUP — broker creates a probe deal_room and invites MGA
  // ===========================================================
  const brokerCtx = await browser.newContext();
  const broker = await brokerCtx.newPage();

  log("\n[setup] broker login + create probe room");
  await broker.goto(`${SITE}/login`);
  await broker.fill('input[name="email"]', "broker@demo.com");
  await broker.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    broker.waitForURL("**/broker/dashboard", { timeout: 15000 }),
    broker.click('button[type="submit"]'),
  ]);

  await broker.goto(`${SITE}/broker/quotes/new`);
  await broker.fill('input[name="insured_name"]', insuredName);
  await broker.click("button#class_of_business");
  await broker.click('div[role="option"]:has-text("GL")');
  await broker.fill('input[name="location"]', "Toronto, ON");
  await broker.click("button#coverage_type");
  await broker.click('div[role="option"]:has-text("General Liability")');
  await broker.fill('input[name="coverage_amount"]', "1000000");
  await broker.fill('textarea[name="notes"]', "QA Probe");

  await Promise.all([
    broker.waitForURL(/\/broker\/quotes\/[0-9a-f-]+$/, { timeout: 15000 }),
    broker.click('button[type="submit"]:has-text("Create deal room")'),
  ]);
  const detailUrl = broker.url();
  const roomId = detailUrl.split("/").pop();
  log(`  created room ${roomId}`);

  // Capture network 404s on the detail page
  const four04s = [];
  broker.on("response", (r) => {
    if (r.status() === 404) four04s.push(r.url());
  });
  await broker.reload({ waitUntil: "networkidle" });

  // Invite MGA
  log("[setup] broker invites MGA");
  await broker.click('button:has-text("+ Invite Party")');
  await broker.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await broker.locator('[role="dialog"] [role="combobox"]').first().click();
  await broker.waitForSelector('[role="listbox"]', { timeout: 5000 });
  await broker.getByRole("option", { name: /Demo MGA/i }).click();
  await broker.waitForTimeout(300);
  await broker.locator('[role="dialog"] button:has-text("Invite")').last().click();
  await broker.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 15000 });
  await broker.reload({ waitUntil: "networkidle" });

  // ===========================================================
  // C) Activity feed dot color check
  // ===========================================================
  log("\n[C] activity feed dot colors");
  const dots = await broker.locator("ol > li span.rounded-full, ol > li [data-dot]").evaluateAll((els) =>
    els.map((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      class: el.className,
    })),
  );
  log(`  dot styles: ${JSON.stringify(dots, null, 2)}`);

  // Try to find any dot-like element next to feed entries
  const feedDots = await broker.locator("ol > li").evaluateAll((items) =>
    items.map((li) => {
      const dot = li.querySelector('[class*="rounded-full"], [class*="rounded"]');
      return dot
        ? { bg: getComputedStyle(dot).backgroundColor, class: dot.className }
        : { bg: null, class: null };
    }),
  );
  log(`  feed dots (all entries): ${JSON.stringify(feedDots, null, 2)}`);

  const navyRgb = "rgb(15, 37, 64)";
  const goldRgb = "rgb(196, 154, 44)";
  const allDotsAreNavy = feedDots.length >= 2 && feedDots.every((d) => d.bg === navyRgb);
  const dotsArePresent = feedDots.length >= 2 && feedDots.every((d) => d.bg !== null);
  // The instructions say "navy/gold dot accents" — accept navy or gold
  const allDotsBranded = dotsArePresent && feedDots.every((d) => d.bg === navyRgb || d.bg === goldRgb);
  results.dotColors = {
    pass: allDotsBranded,
    detail: feedDots,
    note: allDotsAreNavy ? "all dots navy" : allDotsBranded ? "mix of brand colors" : "non-brand colors found",
  };

  // ===========================================================
  // E) 404 asset identification
  // ===========================================================
  log("\n[E] 404 asset(s) on detail page");
  log(`  ${four04s.length} 404(s): ${JSON.stringify(four04s)}`);
  results.fourOhFours = four04s;

  // Also check / for 404s
  const fourOhFoursLanding = [];
  broker.removeAllListeners("response");
  broker.on("response", (r) => {
    if (r.status() === 404) fourOhFoursLanding.push(r.url());
  });
  await broker.goto(`${SITE}/`, { waitUntil: "networkidle" });
  log(`  landing 404(s): ${JSON.stringify(fourOhFoursLanding)}`);
  results.fourOhFoursLanding = fourOhFoursLanding;

  // ===========================================================
  // D) Landing h1/h2 Libre Baskerville computed style + section order
  // ===========================================================
  log("\n[D] landing typography + section order");
  const headingFonts = await broker.locator("h1, h2").evaluateAll((els) =>
    els.map((el) => ({
      tag: el.tagName,
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
      ff: getComputedStyle(el).fontFamily,
    })),
  );
  log(`  headings (${headingFonts.length}):`);
  for (const h of headingFonts) log(`    <${h.tag}> "${h.text}" ff="${h.ff}"`);
  const allLibre = headingFonts.length > 0 && headingFonts.every((h) => /Libre Baskerville/i.test(h.ff));
  results.libreBaskerville = { pass: allLibre, sample: headingFonts.slice(0, 5) };

  // Section order check — scan DOM for known IDs in order
  const sectionOrder = await broker.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("section[id], div[id]"))
      .map((el) => el.id)
      .filter(Boolean);
    return ids;
  });
  log(`  section ids in DOM order: ${JSON.stringify(sectionOrder)}`);
  results.sectionOrder = sectionOrder;

  await brokerCtx.close();

  // ===========================================================
  // B) Independent insurer PostgREST probe
  // ===========================================================
  log("\n[B] insurer PostgREST probe — direct supabase-js with insurer session");
  const insurerClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: signInData, error: signInErr } = await insurerClient.auth.signInWithPassword({
    email: "insurer@demo.com",
    password: PASSWORD,
  });
  if (signInErr) {
    results.insurerProbe = { pass: false, err: `signIn failed: ${signInErr.message}` };
  } else {
    log(`  signed in as ${signInData.user?.email}`);
    // Probe deal_rooms — try to read THIS room
    const { data: rooms, error: roomsErr } = await insurerClient
      .from("deal_rooms")
      .select("id, insured_name")
      .eq("id", roomId);
    log(`  deal_rooms probe (eq id=${roomId}): rows=${rooms?.length ?? 0} err=${roomsErr?.message ?? "none"}`);

    // Probe activities for this room
    const { data: acts, error: actsErr } = await insurerClient
      .from("activities")
      .select("id, kind")
      .eq("deal_room_id", roomId);
    log(`  activities probe (eq deal_room_id=${roomId}): rows=${acts?.length ?? 0} err=${actsErr?.message ?? "none"}`);

    // Also probe parties to see what insurer sees on this room
    const { data: parties, error: partiesErr } = await insurerClient
      .from("parties")
      .select("id, role")
      .eq("deal_room_id", roomId);
    log(`  parties probe (eq deal_room_id=${roomId}): rows=${parties?.length ?? 0} err=${partiesErr?.message ?? "none"}`);

    // Insurer-readable scan: list ALL deal_rooms insurer can see
    const { data: allRooms } = await insurerClient
      .from("deal_rooms")
      .select("id, insured_name");
    const probeRoomVisible = (allRooms ?? []).some((r) => r.id === roomId);
    log(`  insurer sees ${allRooms?.length ?? 0} deal_rooms total; probe room visible: ${probeRoomVisible}`);

    const passes =
      (rooms?.length ?? 0) === 0 &&
      (acts?.length ?? 0) === 0 &&
      !probeRoomVisible;
    results.insurerProbe = {
      pass: passes,
      detail: {
        rooms: rooms?.length ?? 0,
        activities: acts?.length ?? 0,
        parties: parties?.length ?? 0,
        totalVisibleRooms: allRooms?.length ?? 0,
        probeRoomInList: probeRoomVisible,
      },
    };
  }
} catch (e) {
  console.log("UNHANDLED:", e.stack ?? e.message);
  results.error = e.message;
} finally {
  await browser.close();
  await cleanup();
}

console.log("\n========== PROBE RESULTS ==========");
console.log(JSON.stringify(results, null, 2));
