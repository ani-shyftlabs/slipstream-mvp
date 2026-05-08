import { chromium } from "playwright";

const URL = "https://slipstream-mvp.vercel.app";
const EMAIL = "qa+admin-1778253690@gmail.com";
const PASS = "SlipstreamDemo2026!";

const failures = [];
const evidence = [];
function log(line) {
  evidence.push(line);
  console.log(line);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();

try {
  // 1. Root → /login
  log("[1] GET / → expect /login");
  const root = await page.goto(URL, { waitUntil: "domcontentloaded" });
  log(`    status=${root.status()} final url=${page.url()}`);
  if (!page.url().endsWith("/login")) failures.push("root did not redirect to /login");

  // 2. Login HTML check
  log("[2] /login serif wordmark + brand");
  const wordmark = await page.locator("h1", { hasText: "Slipstream" }).first().textContent();
  log(`    wordmark="${wordmark}"`);
  if (!wordmark || !wordmark.includes("Slipstream")) failures.push("Slipstream wordmark missing on /login");

  // 3. Sign in with admin-confirmed user
  log("[3] sign in form submit");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await Promise.all([
    page.waitForURL("**/broker/dashboard", { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]).catch((e) => failures.push(`sign-in did not redirect to /broker/dashboard: ${e.message}`));
  log(`    after submit url=${page.url()}`);
  if (!page.url().endsWith("/broker/dashboard")) {
    const bodyText = await page.locator("body").innerText();
    log(`    body snippet: ${bodyText.slice(0, 200)}`);
  }

  // 4. Dashboard shell sanity
  log("[4] dashboard shell visuals");
  const header = page.locator("header").first();
  const headerBox = await header.boundingBox();
  log(`    header box: ${JSON.stringify(headerBox)}`);
  if (!headerBox || Math.abs(headerBox.height - 52) > 2) failures.push(`header height not ~52px (got ${headerBox?.height})`);

  const headerBg = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
  log(`    header bg: ${headerBg}`);
  if (!/rgb\(\s*15\s*,\s*37\s*,\s*64\s*\)/.test(headerBg)) failures.push(`header bg not navy (got ${headerBg})`);

  const aside = page.locator("aside").first();
  const asideBox = await aside.boundingBox();
  log(`    aside box: ${JSON.stringify(asideBox)}`);
  if (!asideBox || Math.abs(asideBox.width - 220) > 2) failures.push(`sidebar width not ~220px (got ${asideBox?.width})`);

  const main = page.locator("main").first();
  const mainBg = await main.evaluate((el) => getComputedStyle(el).backgroundColor);
  log(`    main bg: ${mainBg}`);
  if (!/rgb\(\s*250\s*,\s*250\s*,\s*250\s*\)/.test(mainBg)) failures.push(`main bg not #FAFAFA (got ${mainBg})`);

  const wordmarkFont = await page.locator("header a", { hasText: "Slipstream" }).first().evaluate((el) => getComputedStyle(el).fontFamily);
  log(`    wordmark font: ${wordmarkFont}`);
  if (!/Libre/i.test(wordmarkFont)) failures.push(`wordmark font not Libre (got ${wordmarkFont})`);

  const dashH1 = await page.locator("h1").first().textContent();
  log(`    dashboard h1: "${dashH1}"`);
  if (!dashH1 || !dashH1.includes(EMAIL)) failures.push(`dashboard h1 did not include ${EMAIL}`);

  // 5. Sign out
  log("[5] sign out");
  await Promise.all([
    page.waitForURL("**/login", { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]).catch((e) => failures.push(`sign-out did not redirect to /login: ${e.message}`));
  log(`    after signout url=${page.url()}`);

  // 6. Sign back in
  log("[6] sign back in");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await Promise.all([
    page.waitForURL("**/broker/dashboard", { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]).catch((e) => failures.push(`re-sign-in failed: ${e.message}`));
  log(`    after re-signin url=${page.url()}`);
} catch (e) {
  failures.push(`unhandled error: ${e.message}`);
  log(`UNHANDLED: ${e.message}`);
}

await browser.close();

console.log("\n========== RESULT ==========");
if (failures.length === 0) {
  console.log("PASS — all roundtrip steps OK");
  process.exit(0);
} else {
  console.log("FAIL");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
