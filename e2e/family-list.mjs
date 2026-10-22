// Christmas list shared with the family, end to end, in a real browser.
// LOCAL ONLY : the app runs without Resend, so emails land in its server
// log, where this script reads the links.
// Usage (see docs/tests.md) :
//   accounts : e2e@yomushelf.local = under 15 with a parent's consent,
//              other@yomushelf.local = 15 and over, both with wishes
//   BASE=http://localhost:3100 LOG=<next dev log> SUPABASE_URL=… SERVICE=<local service key> node e2e/family-list.mjs
import { chromium } from "playwright-core";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const BASE = process.env.BASE ?? "http://localhost:3100";
const LOG = process.env.LOG;
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:55421";
const SERVICE = process.env.SERVICE;
const CHROME =
  process.env.CHROME ??
  `${homedir()}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
if (!LOG || !SERVICE || BASE.includes("yomushelf.com")) throw new Error("LOG and SERVICE required, local only.");

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};
const sha = (t) => createHash("sha256").update(t).digest("hex");
const rpc = async (fn, args) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return r.json();
};
const tokenOf = (url) => url.split("/").pop();
const rest = async (path) =>
  (await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();
const sharedList = (url) => rpc("get_shared_wishlist", { p_token_hash: sha(tokenOf(url)) });

// Latest link of a given path in an email logged after `from` (log offset).
async function linkInLog(from, to, path) {
  for (let i = 0; i < 30; i++) {
    const log = readFileSync(LOG, "utf8").slice(from);
    const block = log.split("[email] to ").filter((b) => b.startsWith(to)).pop();
    const m = block?.match(new RegExp(`${BASE}${path}[A-Za-z0-9_-]{43}`, "g"));
    if (m) return m.pop();
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}
const logSize = () => readFileSync(LOG, "utf8").length;

const browser = await chromium.launch({ executablePath: CHROME });
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris" };
async function newPage() {
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { page, errors };
}
async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 180000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "e2e-yomushelf");
  await Promise.all([page.waitForURL(/\/bibliotheque/, { timeout: 120000 }), page.press('input[name="password"]', "Enter")]);
}
const panel = (page) => page.locator("section[aria-labelledby='family-share-title']");
// Pages stream behind loading.tsx : wait for the element before judging.
const visible = (locator, timeout = 20000) => locator.waitFor({ state: "visible", timeout }).then(() => true, () => false);

try {
  // ── Under 15 : the child asks, the parent shares ──────────
  const kid = await newPage();
  await login(kid.page, "e2e@yomushelf.local");
  await kid.page.goto(`${BASE}/envies`, { waitUntil: "load", timeout: 120000 });
  check("child sees the family panel", await visible(panel(kid.page).getByRole("heading", { name: "Envoie ta liste à ta famille" })));
  check("child has no link form", (await panel(kid.page).locator('input[name="display_name"]').count()) === 0);

  const before = logSize();
  await panel(kid.page).getByRole("button", { name: "Envoyer ma liste à ma famille" }).click();
  await kid.page.getByText("C'est parti : ton parent a reçu un email.").waitFor({ timeout: 30000 });
  check("child request confirmed", true);
  const parentLink = await linkInLog(before, "parent.leo@yomushelf.local", "/famille/");
  check("parent email carries the parent page link", !!parentLink);

  await kid.page.reload({ waitUntil: "load" });
  check("child sees the email went out (masked)", await visible(panel(kid.page).getByText(/Email envoyé à ton parent \(p\*\*\*@yomushelf\.local\)/)));
  await panel(kid.page).getByRole("button", { name: "Renvoyer l'email à mon parent" }).click();
  check("sending again within a minute is refused", await visible(kid.page.getByRole("alert").filter({ hasText: "Attends une minute avant de réessayer" })));

  const parent = await newPage();
  const res = await parent.page.goto(parentLink, { waitUntil: "load", timeout: 120000 });
  check("parent page opens without an account", res.status() === 200 && (await visible(parent.page.getByRole("heading", { name: "Partager sa liste d'envies." }))));
  check("parent page is noindex, no-referrer",
    (await parent.page.locator('meta[name="robots"]').getAttribute("content"))?.includes("noindex") &&
    (await parent.page.locator('meta[name="referrer"]').getAttribute("content")) === "no-referrer");
  const [kidProfile] = await rest("profiles?select=id&email=eq.e2e@yomushelf.local");
  check("reading the page creates nothing", (await rest(`wishlist_shares?select=user_id&user_id=eq.${kidProfile.id}`)).length === 0);
  await parent.page.fill('input[name="display_name"]', "Léo");
  const beforeReady = logSize();
  await parent.page.getByRole("button", { name: "Créer le lien" }).click();
  const shown = parent.page.locator('input[readonly]');
  await shown.waitFor({ timeout: 30000 });
  const listLink1 = await shown.inputValue();
  check("parent gets the list link", /\/liste\/[A-Za-z0-9_-]{43}$/.test(listLink1), listLink1.replace(/[A-Za-z0-9_-]{43}$/, "<token>"));
  const page1 = await sharedList(listLink1);
  check("link opens the list with the chosen first name", page1?.display_name === "Léo" && page1.items.length === 3);
  const [plink] = await rest(`wishlist_parent_links?select=expires_at&user_id=eq.${kidProfile.id}`);
  const [kshare] = await rest(`wishlist_shares?select=expires_at&user_id=eq.${kidProfile.id}`);
  check("parent page lives at least as long as the list link", Date.parse(plink.expires_at) >= Date.parse(kshare.expires_at));
  // Within a minute of the child's email, the copy is held back (email budget) and the page says so.
  const copied = (await linkInLog(beforeReady, "parent.leo@yomushelf.local", "/liste/")) === listLink1;
  const saysNoCopy = await visible(parent.page.getByText("Pas de copie par email cette fois"), 3000);
  check("copy emailed, or the page says it was not", copied !== saysNoCopy, copied ? "emailed" : "held back, page says so");

  // A relative reserves ; the child must not know.
  const item = page1.items[0].id;
  check("relative reserves a volume", (await rpc("reserve_wishlist_item", { p_token_hash: sha(tokenOf(listLink1)), p_item_id: item, p_undo_hash: sha("undo") })) === "reserved");
  await kid.page.reload({ waitUntil: "load" });
  check("child sees the list is shared", await visible(panel(kid.page).getByRole("heading", { name: "Ta liste est partagée" })));
  check("child can still send the parent a fresh email", await visible(panel(kid.page).getByRole("button", { name: "Renvoyer l'email à mon parent" })));
  const kidHtml = await kid.page.content();
  check("child never sees the link nor what is offered", !kidHtml.includes(tokenOf(listLink1)) && !/Je l.offre|réservé/i.test(await kid.page.locator("main").innerText()));

  // New link : the old one stops, the reservation stays.
  await parent.page.goto(parentLink, { waitUntil: "load" });
  check("parent sees the active link", await visible(parent.page.getByRole("heading", { name: "La liste est partagée." })));
  // Email budget spent by the earlier sends : start afresh for this one (test database).
  await fetch(`${SUPABASE_URL}/rest/v1/consent_email_sends?user_id=eq.${kidProfile.id}`, { method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  const beforeRenew = logSize();
  await parent.page.getByRole("button", { name: "Créer un nouveau lien" }).click();
  await parent.page.locator('input[readonly]').waitFor({ timeout: 30000 });
  const listLink2 = await parent.page.locator('input[readonly]').inputValue();
  const page2 = await sharedList(listLink2);
  check("copy of the new link emailed to the parent", (await linkInLog(beforeRenew, "parent.leo@yomushelf.local", "/liste/")) === listLink2 && (await visible(parent.page.getByText("Une copie t'a été envoyée par email."), 5000)));
  check("old link stops after a new one", (await sharedList(listLink1)) === null && listLink2 !== listLink1);
  check("reservation kept on the new link", page2?.items.find((i) => i.id === item)?.reserved === true);

  // Stop sharing, with a confirmation step.
  await parent.page.goto(parentLink, { waitUntil: "load" });
  await parent.page.getByRole("link", { name: "Arrêter le partage" }).click();
  await parent.page.getByRole("heading", { name: "Arrêter le partage ?" }).waitFor();
  await parent.page.getByRole("button", { name: "Arrêter le partage" }).click();
  await parent.page.getByRole("heading", { name: "Le partage est arrêté." }).waitFor({ timeout: 30000 });
  check("parent stops sharing", (await sharedList(listLink2)) === null);
  await kid.page.reload({ waitUntil: "load" });
  check("child panel back to asking", await visible(panel(kid.page).getByRole("button", { name: "Renvoyer l'email à mon parent" })));

  const bad = await parent.page.goto(`${BASE}/famille/${"A".repeat(43)}`, { waitUntil: "load" });
  check("unknown parent link : no longer valid", bad.status() === 200 && (await visible(parent.page.getByRole("heading", { name: "Ce lien n'est plus valable." }))));
  check("no page errors (child, parent)", kid.errors.length + parent.errors.length === 0, [...kid.errors, ...parent.errors].join(" | "));

  // ── 15 and over : the reader shares ──────────────────────
  const teen = await newPage();
  await login(teen.page, "other@yomushelf.local");
  await teen.page.goto(`${BASE}/envies`, { waitUntil: "load", timeout: 120000 });
  check("15+ reader can create the link", await visible(panel(teen.page).getByRole("button", { name: "Créer le lien" })));
  await panel(teen.page).locator('input[name="display_name"]').fill("Sam");
  await panel(teen.page).getByRole("button", { name: "Créer le lien" }).click();
  await panel(teen.page).locator("input[readonly]").waitFor({ timeout: 30000 });
  const teenLink = await panel(teen.page).locator("input[readonly]").inputValue();
  // Another action on the page refreshes it : the link shown once stays.
  await teen.page.getByRole("button", { name: /Prochain|Mettre en prochain/ }).first().click();
  await teen.page.waitForTimeout(3000);
  check("link survives a refresh from another action", (await panel(teen.page).locator("input[readonly]").inputValue().catch(() => "")) === teenLink);
  check("15+ link works", (await sharedList(teenLink))?.display_name === "Sam");
  await teen.page.reload({ waitUntil: "load" });
  check("15+ sees it shared, link not shown again", (await visible(panel(teen.page).getByRole("heading", { name: "Ta liste est partagée" }))) && !(await teen.page.content()).includes(tokenOf(teenLink)));
  await panel(teen.page).locator("summary", { hasText: "Arrêter le partage" }).click();
  await panel(teen.page).getByRole("button", { name: "Oui, arrêter le partage" }).click();
  await panel(teen.page).getByRole("heading", { name: "Envoie ta liste à ta famille" }).waitFor({ timeout: 30000 });
  check("15+ stops sharing", (await sharedList(teenLink)) === null);
  check("no page errors (15+)", teen.errors.length === 0, teen.errors.join(" | "));
} catch (e) {
  check("journey", false, `exception : ${String(e.message ?? e).split("\n")[0]}`);
} finally {
  await browser.close();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
