import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("/Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/slipstream_mvp/.env.local", "utf8")
    .split("\n").filter((l)=>l.includes("=")).map((l)=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1).trim()]})
);

const SITE = "https://slipstream-mvp.vercel.app";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Create a deal room directly via service role so we can skip the form
const { data: { users } } = await admin.auth.admin.listUsers();
const broker = users.find(u => u.email === "broker@demo.com");
const { data: room } = await admin.from("deal_rooms").insert({
  broker_id: broker.id, insured_name: "DEBUG-modal", class_of_business: "GL",
  location: "X", coverage_type: "General Liability", status: "draft"
}).select("id").single();
console.log("created", room.id);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${SITE}/login`);
await page.fill('input[name="email"]', "broker@demo.com");
await page.fill('input[name="password"]', "SlipstreamDemo2026");
await Promise.all([page.waitForURL("**/broker/dashboard"), page.click('button[type="submit"]')]);
await page.goto(`${SITE}/broker/quotes/${room.id}`);
await page.click('button:has-text("+ Invite Party")');
await page.waitForSelector('[role="dialog"]');
await page.waitForTimeout(500);
const html = await page.locator('[role="dialog"]').innerHTML();
console.log("=== DIALOG HTML ===\n", html.slice(0, 3500));
await browser.close();

await admin.from("deal_rooms").delete().eq("id", room.id);
console.log("cleaned up");
