// Rehearsal probe : signs in as the production-like reader and reports
// what the library shows. LOCAL ONLY. Usage : BASE=http://localhost:3300 node supabase/rehearsal/check-app.mjs
import { chromium } from "playwright-core";
import { homedir } from "node:os";
const BASE = process.env.BASE ?? "http://localhost:3300";
const CHROME = process.env.CHROME ?? `${homedir()}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: CHROME });
const p = await (await b.newContext()).newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  const res = await p.goto(`${BASE}/login`, { waitUntil: "load", timeout: 120000 });
  console.log("login page status", res.status());
  if (res.status() === 503) {
    console.log("MAINTENANCE PAGE :", (await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 120));
  } else {
    await p.fill('input[name="email"]', "prodlike@yomushelf.local");
    await p.fill('input[name="password"]', "e2e-yomushelf");
    await Promise.all([p.waitForURL(/bibliotheque|onboarding/, { timeout: 120000 }), p.press('input[name="password"]', "Enter")]);
    await p.goto(`${BASE}/bibliotheque`, { waitUntil: "load", timeout: 120000 });
    await p.waitForTimeout(1500);
    const text = (await p.locator("body").innerText()).replace(/\s+/g, " ");
    const series = await p.locator("a[href^='/bibliotheque/']").count();
    console.log("library :", text.slice(0, 260));
    console.log("series links :", series, "| error screen :", /Impossible de charger|Application error/i.test(text));
  }
} catch (e) {
  console.log("PROBE FAILED :", String(e.message).split("\n")[0]);
}
console.log("js errors :", errors.length);
await b.close();
