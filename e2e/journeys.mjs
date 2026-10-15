// End-to-end journeys of Yomushelf in a real browser.
//
// Usage (local or test database ONLY, never production) :
//   1. reset the test accounts : psql "$DB_URL" -f e2e/reset.sql
//   2. BASE=http://localhost:3100 node e2e/journeys.mjs
// Env : BASE (app url), CHROME (Chromium executable, default = Playwright's
// cache), SHOTS (folder for screenshots, optional).
// Prints PASS / FAIL per check and exits 1 when something failed.

import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";

const BASE = process.env.BASE ?? "http://localhost:3100";
const CHROME =
  process.env.CHROME ??
  `${homedir()}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const SHOTS = process.env.SHOTS ?? null;
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}
async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    check(name, false, `exception : ${String(e.message ?? e).split("\n")[0]}`);
  }
}

const browser = await chromium.launch({ executablePath: CHROME });

async function signIn(email) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 180000 });
  await page.locator('input[name="email"]').waitFor({ timeout: 60000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "e2e-yomushelf");
  await Promise.all([page.waitForURL(/\/bibliotheque/, { timeout: 120000 }), page.press('input[name="password"]', "Enter")]);
  return { ctx, page, errors };
}

// "load" + the page's main landmark : production builds keep prefetching
// links, so the network never goes idle.
const go = async (page, path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 180000 });
  await page.locator("main").first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(400);
};
const text = async (page, sel = "main") => (await page.locator(sel).first().innerText()).replace(/\s+/g, " ");
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

async function addSeries(page, query, pick, { owned, reading, price, gift } = {}) {
  await go(page, "/ajouter");
  await page.getByRole("searchbox", { name: "Titre du manga" }).fill(query);
  await page.getByRole("button", { name: pick }).first().click({ timeout: 30000 });
  if (owned?.mode === "range") {
    await page.getByRole("radio", { name: /J'ai les tomes du 1 au/ }).click();
    await page.getByRole("spinbutton", { name: "Jusqu'au tome" }).fill(String(owned.to));
  } else if (owned?.mode === "list") {
    await page.getByRole("radio", { name: /seulement certains tomes/ }).click();
    for (const n of owned.volumes) await page.getByRole("button", { name: `Tome ${n}`, exact: true }).click();
  } else {
    await page.getByRole("radio", { name: /Aucun pour l'instant/ }).click();
  }
  await page.getByRole("button", { name: /^Continuer/ }).click();
  if (reading?.mode === "up_to") {
    await page.getByRole("radio", { name: /J'ai lu jusqu'au/ }).click();
    await page.getByRole("spinbutton", { name: "Tome" }).fill(String(reading.to));
  } else if (reading?.mode === "all") {
    await page.getByRole("radio", { name: /J'ai lu tous ceux que j'ai/ }).click();
  } else {
    await page.getByRole("radio", { name: /Pas encore commencé/ }).click();
  }
  if (price || gift) {
    await page.getByRole("button", { name: /Achat, cadeau, prix/ }).click();
    if (gift) await page.getByRole("button", { name: "Offert" }).click();
    else await page.getByRole("button", { name: "Acheté" }).click();
    if (price) {
      await page.getByRole("button", { name: /Ajouter son prix/ }).click();
      await page.getByLabel(/Prix payé|Son prix en magasin|Son prix/).fill(price);
    }
  }
  await page.getByRole("button", { name: "Ajouter à ma bibliothèque" }).click();
  await page.getByRole("heading", { name: /est dans ta bibliothèque/ }).waitFor({ timeout: 60000 });
}

async function seriesUrl(page, title) {
  await go(page, "/bibliotheque");
  return page.locator("a[href^='/bibliotheque/']", { hasText: title }).first().getAttribute("href");
}

// ── Reader journeys ─────────────────────────────────────────
const { ctx, page, errors } = await signIn("e2e@yomushelf.local");

await step("Bibliothèque vide : accueil et deux chemins", async () => {
  const t = await text(page);
  check("Bibliothèque vide : accueil et deux chemins", /Tes mangas, là où tu en es/.test(t) && /Ajouter un manga/.test(t) && /Découvrir des séries/.test(t));
  await shot(page, "01-vide");
});

await step("Ajout : recherche tolérante, tomes 1 à 5, lu jusqu'au 3", async () => {
  await addSeries(page, "spi famili", /Spy x Family/, { owned: { mode: "range", to: 5 }, reading: { mode: "up_to", to: 3 } });
  const t = await text(page);
  check("Ajout : recherche tolérante, tomes 1 à 5, lu jusqu'au 3", /5 tomes ajoutés/.test(t) && /3 lectures notées/.test(t), t.slice(0, 120));
});

await step("Bibliothèque : la suite proposée est le tome 4", async () => {
  await go(page, "/bibliotheque");
  const card = await text(page, "section[aria-labelledby=main-card-label]");
  check("Bibliothèque : la suite proposée est le tome 4", /TU PEUX LIRE/i.test(card) && /Spy x Family/.test(card) && /Tome 4/.test(card), card.slice(0, 100));
  await shot(page, "02-bibliotheque");
});

await step("Lecture : Je commence puis Je l'ai fini, compteur après confirmation", async () => {
  await page.getByRole("button", { name: "Je commence" }).click();
  await page.getByRole("button", { name: "Je l'ai fini !" }).waitFor({ timeout: 60000 });
  const before = Number(await page.locator("section[aria-label$='lus'] span.text-5xl").innerText());
  await page.getByRole("button", { name: "Je l'ai fini !" }).click();
  await page.getByRole("button", { name: "Annuler" }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(1200);
  const after = Number(await page.locator("section[aria-label$='lus'] span.text-5xl").innerText());
  await page.reload({ waitUntil: "load" });
  await page.locator("section[aria-label$='lus'] span.text-5xl").waitFor({ timeout: 60000 });
  const reloaded = Number(await page.locator("section[aria-label$='lus'] span.text-5xl").innerText());
  check("Lecture : Je commence puis Je l'ai fini, compteur après confirmation", after === before + 1 && reloaded === after, `${before} → ${after} → ${reloaded}`);
});

await step("Ajout de tomes épars, puis « J'ai un nouveau tome » propose le premier manquant", async () => {
  await addSeries(page, "dr ston", /Dr\. Stone/, { owned: { mode: "list", volumes: [1, 2, 4] }, reading: { mode: "none" }, price: "6,99" });
  const url = await seriesUrl(page, "Dr. Stone");
  await go(page, url);
  const n = await page.getByRole("spinbutton", { name: /Numéro du tome|Tome/ }).first().inputValue();
  check("« J'ai un nouveau tome » propose le premier manquant (3)", n === "3", `proposé : ${n}`);
  await page.getByRole("button", { name: "Ajouter le tome 3" }).click();
  await page.getByText("Tome 3 ajouté à ton étagère !").waitFor({ timeout: 60000 });
  // The grid comes from the server refresh that follows the confirmation.
  const tile3 = page.getByRole("button", { name: /^Tome 3, .*(?<!pas )chez toi$/ });
  const shown = await tile3.waitFor({ timeout: 15000 }).then(() => true, () => false);
  const tile = await page.getByRole("button", { name: /^Tome 3,/ }).getAttribute("aria-label");
  check("Le tome 3 apparaît chez toi dans la grille", shown, tile);
});

await step("Réajouter des tomes ne change ni leur prix ni leur origine", async () => {
  await addSeries(page, "dr stone", /Dr\. Stone/, { owned: { mode: "range", to: 5 }, reading: { mode: "none" } });
  const t = await text(page);
  // 1,2,3,4 existed : only 5 is new
  check("Réajouter : seul le tome manquant est ajouté", /1 tome ajouté/.test(t), t.slice(0, 120));
  const url = await seriesUrl(page, "Dr. Stone");
  await go(page, url);
  await page.getByRole("button", { name: /^Tome 1,/ }).click();
  const price = await page.getByLabel(/Prix payé|Son prix/).inputValue().catch(() => "");
  check("Le prix du tome 1 est conservé (6,99)", price === "6,99", `prix : ${price}`);
  await page.keyboard.press("Escape");
});

await step("Série introuvable : Ajouter quand même, privée", async () => {
  await go(page, "/ajouter");
  await page.getByRole("searchbox", { name: "Titre du manga" }).fill("Le Manga De Mon Cousin");
  await page.getByRole("button", { name: "Ajouter quand même" }).click({ timeout: 30000 });
  await page.getByLabel("Auteur (facultatif)").fill("Mon cousin");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: /J'ai les tomes du 1 au/ }).click();
  await page.getByRole("spinbutton", { name: "Jusqu'au tome" }).fill("2");
  await page.getByRole("button", { name: /^Continuer/ }).click();
  await page.getByRole("radio", { name: /J'ai lu tous ceux que j'ai/ }).click();
  await page.getByRole("button", { name: "Ajouter à ma bibliothèque" }).click();
  await page.getByRole("heading", { name: /est dans ta bibliothèque/ }).waitFor({ timeout: 60000 });
  await go(page, "/bibliotheque");
  const t = await text(page);
  check("Série introuvable : Ajouter quand même, privée", /Le Manga De Mon Cousin/.test(t) && /Ajoutée par toi/.test(t));
});

await step("Une série privée reste invisible pour un autre compte", async () => {
  const other = await signIn("other@yomushelf.local");
  const res = await other.page.request.get(`${BASE}/api/mangas/search?q=${encodeURIComponent("Manga De Mon Cousin")}`);
  const json = await res.json();
  const leaked = (json.results ?? []).some((r) => /Mon Cousin/i.test(r.title));
  // and directly by id
  const url = await seriesUrl(page, "Le Manga De Mon Cousin");
  const direct = await other.page.goto(`${BASE}${url}`, { waitUntil: "load" });
  check("Une série privée reste invisible pour un autre compte", res.ok() && !leaked && direct.status() === 404, `recherche ${leaked ? "VISIBLE" : "invisible"}, page ${direct.status()}`);
  await other.ctx.close();
});

await step("Retirer une série garde ses lectures, puis la remettre", async () => {
  await go(page, "/bibliotheque");
  const before = Number(await page.locator("section[aria-label$='lus'] span.text-5xl").innerText());
  const url = await seriesUrl(page, "Spy x Family");
  await go(page, url);
  await page.getByText("Plus d'options").click();
  await page.getByRole("button", { name: "Retirer de ma bibliothèque" }).click();
  await page.getByRole("button", { name: "Oui, la retirer" }).click();
  await page.waitForURL(/\/bibliotheque$/, { timeout: 60000 });
  await page.locator("main").first().waitFor();
  await page.waitForTimeout(800);
  const t = await text(page);
  const gone = !/Spy x Family\s+\d+ lus/.test(t) && /Séries retirées · 1/.test(t);
  await page.getByText("Séries retirées").click();
  await page.getByRole("button", { name: "Remettre dans ma bibliothèque" }).click();
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: "load" });
  await page.locator("section[aria-label$='lus'] span.text-5xl").waitFor({ timeout: 60000 });
  const after = Number(await page.locator("section[aria-label$='lus'] span.text-5xl").innerText());
  check("Retirer une série garde ses lectures, puis la remettre", gone && after === before && /Spy x Family/.test(await text(page)), `lus ${before} → ${after}`);
});

await step("Découvrir : suggestions expliquées, Je le veux", async () => {
  await go(page, "/decouvrir");
  const t = await text(page);
  const hasReason = /Parce que tu lis|Du même auteur/.test(t);
  const wishBtn = page.getByRole("button", { name: "Je le veux" }).first();
  await wishBtn.click();
  await page.getByText(/est dans tes envies/).waitFor({ timeout: 60000 });
  check("Découvrir : suggestions expliquées, Je le veux", hasReason);
  await shot(page, "03-decouvrir");
});

await step("Envies : acheté avec le prix payé, ajouté à la bibliothèque", async () => {
  await go(page, "/envies");
  await page.getByRole("button", { name: "Acheté !" }).first().click();
  await page.getByLabel("Prix payé (facultatif)").fill("4,50");
  await page.getByRole("button", { name: "Je l'ai acheté" }).click();
  await page.getByText(/sur ton étagère !/).waitFor({ timeout: 60000 });
  await go(page, "/univers");
  const t = await text(page);
  const paid = t.match(/([\d\s,]+)€ payés/)?.[1]?.replace(/\s/g, "") ?? "";
  // Dr. Stone : 3 volumes at 6,99 + the wish bought at 4,50 ; the wish estimate is not counted
  check("Envies : le prix payé compte dans les dépenses, pas l'estimation", paid === "25,47", `payés : ${paid} €`);
  await shot(page, "04-univers");
});

await step("Mon univers : goûts, lectures, dépenses, envies séparées", async () => {
  await go(page, "/univers");
  const t = await text(page);
  check("Mon univers : goûts, lectures, dépenses, envies séparées", /Mes goûts/.test(t) && /Mes lectures/.test(t) && /Mes dépenses renseignées/.test(t) && /Ce n'est pas une dépense/.test(t));
});

await step("Supprimer définitivement demande le titre", async () => {
  const url = await seriesUrl(page, "Le Manga De Mon Cousin");
  await go(page, url);
  await page.getByText("Plus d'options").click();
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  const del = page.getByRole("button", { name: "Supprimer", exact: true });
  const disabledBefore = await del.isDisabled();
  await page.getByLabel(/pour confirmer/).fill("Le Manga De Mon Cousin");
  await del.click();
  await page.waitForURL(/\/bibliotheque$/, { timeout: 60000 });
  check("Supprimer définitivement demande le titre", disabledBefore && !/Le Manga De Mon Cousin/.test(await text(page)));
});

await step("Anciennes adresses redirigées", async () => {
  const out = [];
  for (const p of ["/collection", "/parent", "/profil", "/onboarding/1"]) {
    await go(page, p);
    out.push(new URL(page.url()).pathname);
  }
  check("Anciennes adresses redirigées", out.join(",") === "/bibliotheque,/univers,/univers,/bibliotheque", out.join(","));
});

check("Aucune erreur JavaScript", errors.length === 0, errors.join(" / "));
await ctx.close();

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} vérifications passées`);
process.exit(failed ? 1 : 0);
