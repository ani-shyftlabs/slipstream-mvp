// Re-probe two items the first probe pass mis-asserted:
//   - InvitePartyModal styling: confirm dialog renders + cards present (radius is shadcn default sm:rounded-lg, not rounded-xl — note as cosmetic)
//   - Northgate detail: activity feed uses ABSOLUTE timestamps, not relative "ago". Count activity rows.

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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: rooms } = await admin
  .from("deal_rooms")
  .select("id, insured_name");
const byName = Object.fromEntries(rooms.map((r) => [r.insured_name, r]));
const cresthillId = byName["Cresthill Industries Ltd"]?.id;
const northgateId = byName["Northgate Group Inc"]?.id;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
try {
  // Login
  await page.goto(`${SITE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "broker@demo.com");
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL("**/broker/dashboard", { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("networkidle");

  // ---- Northgate detail re-probe ----
  await page.goto(`${SITE}/broker/quotes/${northgateId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Count activity feed list items — Northgate has 6 events
  const activityCount = await page.locator('aside ol li').count();
  console.log("Northgate activity row count:", activityCount);

  // Activity entries should contain UTC timestamps
  const utcCount = await page.locator('aside p:has-text("UTC")').count();
  console.log("UTC timestamp markers:", utcCount);

  // The first list item should be the most recent (closed event) — describes "Deal room closed."
  const firstActivityText = await page.locator('aside ol li').first().innerText();
  console.log("First activity (most recent):", firstActivityText);

  // Verify reverse-chrono: closed > bound > quote_submitted > invited (insurer) > invited (mga) > created
  const allActivityText = await page.locator('aside ol').innerText();
  const closedIdx = allActivityText.indexOf("closed");
  const createdIdx = allActivityText.indexOf("created");
  const reverseChrono = closedIdx >= 0 && createdIdx >= 0 && closedIdx < createdIdx;
  console.log("Reverse-chrono OK:", reverseChrono);

  // Quotes section — Northgate has 1 won quote ($95k)
  const has95k = await page.locator('text=/95,?000/').count();
  console.log("$95,000 visible in quotes:", has95k);

  // Compliance card buttons
  const exportBtn = await page.locator('text=Export').count();
  const closedNote = await page.locator('text=/closed.*export.*audit record/i').count();
  console.log("Export button:", exportBtn, "Closed note:", closedNote);

  // ---- InvitePartyModal: open it on Cresthill (active state allows invite) ----
  await page.goto(`${SITE}/broker/quotes/${cresthillId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const inviteBtn = page.locator('button:has-text("Invite Party")').first();
  const inviteCount = await inviteBtn.count();
  console.log("\nInvite button count:", inviteCount);
  if (inviteCount > 0) {
    await inviteBtn.click();
    await page.waitForTimeout(500);
    const dlgRadius = await page.locator('[role="dialog"]').first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { borderRadius: cs.borderRadius, padding: cs.padding };
    });
    console.log("Dialog computed style:", dlgRadius);
    // Modal content opens? Title visible?
    const titleVisible = await page.locator('[role="dialog"] :text("Invite a party")').count();
    console.log("Modal title visible:", titleVisible);
  }
} finally {
  await ctx.close();
  await browser.close();
}
