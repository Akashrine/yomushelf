// End-to-end journeys of Yomushelf in a real browser.
//
// Usage (local or test database ONLY, never production) — see docs/tests.md :
//   1. reset the test accounts : psql "$DB_URL" -f e2e/reset.sql
//   2. BASE=http://localhost:3100 node e2e/journeys.mjs
// Env :
//   BASE      app url (default http://localhost:3100)
//   VIEWPORT  mobile (default, 390×844 touch) or desktop (1280×800)
//   SIGNUP    1 to also create a brand new account (needs email
//             confirmation off, as in the local Supabase config)
//   CHROME    Chromium executable (default : Playwright's cache)
//   SHOTS     folder for screenshots (optional)
// Prints PASS / FAIL per check and exits 1 when something failed.

import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";

const BASE = process.env.BASE ?? "http://localhost:3100";
const DESKTOP = process.env.VIEWPORT === "desktop";
const CHROME =
  process.env.CHROME ??
  `${homedir()}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const SHOTS = process.env.SHOTS ?? null;
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const PASSWORD = "e2e-yomushelf";

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
const contextOptions = DESKTOP
  ? { viewport: { width: 1280, height: 800 }, locale: "fr-FR", timezoneId: "Europe/Paris" }
  : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris" };

async function newPage() {
  const ctx = await browser.newContext(contextOptions);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, errors };
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 180000 });
  await page.locator('input[name="email"]').waitFor({ timeout: 60000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/bibliotheque/, { timeout: 120000 }), page.press('input[name="password"]', "Enter")]);
}

async function signIn(email) {
  const s = await newPage();
  await login(s.page, email);
  return s;
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

// Volumes read, as Mon univers counts them (the home screen shows no stats).
async function readCount(page) {
  await go(page, "/univers");
  const t = await text(page);
  const m = t.match(/(\d+) tomes? lus?\b/);
  return m ? Number(m[1]) : NaN;
}

async function addSeries(page, query, pick, { owned, reading, price, gift, doubleClick } = {}) {
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
  const save = page.getByRole("button", { name: "Ajouter à ma bibliothèque" });
  if (doubleClick) await save.dblclick();
  else await save.click();
  await page.getByRole("heading", { name: /est dans ta bibliothèque/ }).waitFor({ timeout: 60000 });
}

async function seriesUrl(page, title) {
  await go(page, "/bibliotheque");
  return page.locator("a[href^='/bibliotheque/']", { hasText: title }).first().getAttribute("href");
}

// Volumes shown "chez toi" in a series grid.
async function tilesAtHome(page) {
  const labels = await page.getByRole("button", { name: /^Tome \d+,/ }).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  return labels.filter((l) => /(?<!pas )chez toi$/.test(l ?? "")).length;
}

// ── Account creation (local only) ───────────────────────────
if (process.env.SIGNUP === "1") {
  await step("Création de compte, déconnexion, reconnexion", async () => {
    const s = await newPage();
    const email = `e2e-${Date.now()}@yomushelf.local`;
    await s.page.goto(`${BASE}/signup`, { waitUntil: "load", timeout: 180000 });
    await s.page.getByLabel("Email").fill(email);
    await s.page.getByLabel("Mot de passe").fill(PASSWORD);
    await s.page.getByRole("button", { name: "Créer mon compte" }).click();
    await s.page.waitForURL(/\/bibliotheque/, { timeout: 120000 }).catch(() => {});
    const inApp = /\/bibliotheque/.test(s.page.url());
    if (inApp) {
      await go(s.page, "/univers");
      await s.page.getByRole("button", { name: "Me déconnecter" }).click();
      await s.page.waitForURL((u) => !/\/univers/.test(u.pathname), { timeout: 60000 });
      await login(s.page, email);
    }
    check("Création de compte, déconnexion, reconnexion", inApp && /\/bibliotheque/.test(s.page.url()), s.page.url());
    await s.ctx.close();
  });
}

// ── Reader journeys ─────────────────────────────────────────
const { ctx, page, errors } = await signIn("e2e@yomushelf.local");

await step("États vides : bibliothèque, Découvrir, Mon univers", async () => {
  const home = await text(page);
  await go(page, "/decouvrir");
  const disc = await text(page);
  await go(page, "/univers");
  const uni = await text(page);
  check(
    "États vides : bibliothèque, Découvrir, Mon univers",
    /Tes mangas, là où tu en es/.test(home) && /Ajouter un manga/.test(home) &&
      /Pas encore d'historique/.test(disc) && /Mes goûts/.test(disc) &&
      /Ta carte se remplit/.test(uni),
    ""
  );
  await shot(page, "01-vide");
});

await step("Recherche : zéro, un, deux et plusieurs résultats du catalogue", async () => {
  const local = async (q) => {
    const res = await page.request.get(`${BASE}/api/mangas/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    return { ok: res.ok(), n: (json.results ?? []).filter((r) => r.source !== "mal").length, remote: json.remote_unavailable, json };
  };
  const zero = await local("xqzvwk");
  const one = await local("dorohedoro");
  const two = await local("naruto");
  const many = await local("dragon");
  const dup = (many.json.results ?? []).map((r) => r.title.toLowerCase());
  check(
    "Recherche : zéro, un, deux et plusieurs résultats du catalogue",
    zero.ok && zero.n === 0 && one.n === 1 && two.n === 2 && many.n >= 3 && new Set(dup).size === dup.length,
    `0→${zero.n} 1→${one.n} 2→${two.n} n→${many.n}, fournisseur externe ${zero.remote ? "indisponible (signalé)" : "joint"}`
  );
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

await step("Lecture : Je commence puis Je l'ai fini, persistant après rechargement", async () => {
  const before = await readCount(page);
  await go(page, "/bibliotheque");
  await page.getByRole("button", { name: "Je commence" }).click();
  await page.getByRole("button", { name: "Je l'ai fini !" }).waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Je l'ai fini !" }).click();
  await page.getByRole("button", { name: "Annuler" }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(1200);
  const after = await readCount(page);
  check("Lecture : Je commence puis Je l'ai fini, persistant après rechargement", after === before + 1, `${before} → ${after}`);
});

await step("Double clic sur l'ajout : rien n'est ajouté deux fois", async () => {
  await addSeries(page, "kaiju", /Kaiju/, { owned: { mode: "range", to: 2 }, reading: { mode: "none" }, doubleClick: true });
  const url = await seriesUrl(page, "Kaiju");
  await go(page, url);
  const n = await tilesAtHome(page);
  const t = await text(page);
  check("Double clic sur l'ajout : rien n'est ajouté deux fois", n === 2 && !/Kaiju.*Kaiju n°8 est dans/.test(t), `${n} tomes chez toi`);
});

await step("Ajout de tomes épars, puis « J'ai un nouveau tome » propose le premier manquant", async () => {
  await addSeries(page, "dr ston", /Dr\. Stone/, { owned: { mode: "list", volumes: [1, 2, 4] }, reading: { mode: "none" }, price: "6,99" });
  const url = await seriesUrl(page, "Dr. Stone");
  await go(page, url);
  const n = await page.getByRole("spinbutton", { name: /Numéro du tome|Tome/ }).first().inputValue();
  check("« J'ai un nouveau tome » propose le premier manquant (3)", n === "3", `proposé : ${n}`);
  await page.getByRole("button", { name: "Ajouter le tome 3" }).click();
  await page.getByText("Tome 3 ajouté à ton étagère !").waitFor({ timeout: 60000 });
  const tile3 = page.getByRole("button", { name: /^Tome 3, .*(?<!pas )chez toi$/ });
  // The grid comes from the server refresh after the save : slower on a remote database.
  const shown = await tile3.waitFor({ timeout: 30000 }).then(() => true, () => false);
  check("Possession sans lecture : le tome 3 apparaît chez toi, non lu", shown);
});

await step("Réajouter des tomes ne change ni leur prix ni leur origine", async () => {
  await addSeries(page, "dr stone", /Dr\. Stone/, { owned: { mode: "range", to: 5 }, reading: { mode: "none" } });
  const t = await text(page);
  check("Réajouter : seul le tome manquant est ajouté", /1 tome ajouté/.test(t), t.slice(0, 120));
  const url = await seriesUrl(page, "Dr. Stone");
  await go(page, url);
  await page.getByRole("button", { name: /^Tome 1,/ }).click();
  const price = await page.getByLabel(/Prix payé|Son prix/).inputValue().catch(() => "");
  check("Le prix du tome 1 est conservé (6,99)", price === "6,99", `prix : ${price}`);
  await page.keyboard.press("Escape");
});

await step("« J'ai lu tous ceux que j'ai » marque aussi les tomes déjà chez toi", async () => {
  await addSeries(page, "dr stone", /Dr\. Stone/, { owned: { mode: "none" }, reading: { mode: "all" } });
  const t = await text(page);
  check("« J'ai lu tous ceux que j'ai » marque aussi les tomes déjà chez toi", /\d+ lectures? notées?/.test(t), t.slice(0, 160));
});

await step("Lecture sans possession, « Lu jusqu'au » expliqué et annulable", async () => {
  await go(page, "/decouvrir");
  await page.getByRole("combobox", { name: "Genre" }).selectOption("sport");
  const naruto = page.locator("a[href^='/bibliotheque/']", { hasText: "Haikyū" }).first();
  const href = await naruto.getAttribute("href");
  await go(page, href);
  await page.getByRole("button", { name: "La suivre sans tome" }).click();
  await page.getByRole("heading", { name: "Où j'en suis" }).waitFor({ timeout: 60000 });
  const explains = /Marque aussi tous les tomes avant comme lus/.test(await text(page));
  await page.getByRole("spinbutton", { name: /lu jusqu'au tome/i }).fill("5");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Oui, noter" }).click();
  await page.getByText(/5 tomes notés comme lus/).waitFor({ timeout: 60000 });
  // The next-volume card comes with the server refresh that follows.
  const toFind = await page.getByText("Prochain tome à trouver").waitFor({ timeout: 20000 }).then(async () => /Tome 6/.test(await text(page)), () => false);
  await page.getByRole("button", { name: "Annuler" }).first().click();
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "load" });
  await page.locator("main").first().waitFor();
  const undone = /Aucun tome noté pour l'instant/.test(await text(page));
  check("Lecture sans possession, « Lu jusqu'au » expliqué et annulable", explains && toFind && undone, `explique ${explains}, à trouver ${toFind}, annulé ${undone}`);
});

await step("Erreur réseau : message honnête, rien d'annoncé à tort, puis réussite", async () => {
  const url = await seriesUrl(page, "Spy x Family");
  await go(page, url);
  // Cut every server action request : the app must say it failed.
  await page.route("**/*", (route) => (route.request().headers()["next-action"] ? route.abort() : route.continue()));
  await page.getByRole("button", { name: "J'ai aimé" }).click();
  const alert = await page.getByRole("alert").filter({ hasText: /connexion|enregistr/i }).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  await page.unroute("**/*");
  await page.reload({ waitUntil: "load" });
  await page.locator("main").first().waitFor();
  const notSaved = (await page.getByRole("button", { name: "J'ai aimé" }).getAttribute("aria-pressed")) === "false";
  await page.getByRole("button", { name: "J'ai aimé" }).click();
  await page.getByText(/tu as aimé Spy x Family/).waitFor({ timeout: 60000 });
  await page.reload({ waitUntil: "load" });
  await page.locator("main").first().waitFor();
  const saved = (await page.getByRole("button", { name: "J'ai aimé" }).getAttribute("aria-pressed")) === "true";
  check("Erreur réseau : message honnête, rien d'annoncé à tort, puis réussite", alert && notSaved && saved, `alerte ${alert}, pas enregistré ${notSaved}, enregistré ensuite ${saved}`);
});

await step("Série introuvable : fiche personnelle, modifiable", async () => {
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
  const url = await seriesUrl(page, "Le Manga De Mon Cousin");
  await go(page, url);
  await page.getByText("Modifier ma fiche").click();
  await page.getByLabel("Nombre de tomes parus (facultatif)").fill("3");
  await page.getByRole("button", { name: "Enregistrer la fiche" }).click();
  await page.getByText("Fiche enregistrée.").waitFor({ timeout: 60000 });
  await page.reload({ waitUntil: "load" });
  const t = await text(page);
  check("Série introuvable : fiche personnelle, modifiable", /Ajoutée par toi/.test(t) && /3 tomes parus/.test(t));
});

await step("Une série privée reste invisible pour un autre compte", async () => {
  const other = await signIn("other@yomushelf.local");
  const res = await other.page.request.get(`${BASE}/api/mangas/search?q=${encodeURIComponent("Manga De Mon Cousin")}`);
  const json = await res.json();
  const leaked = (json.results ?? []).some((r) => /Mon Cousin/i.test(r.title));
  const url = await seriesUrl(page, "Le Manga De Mon Cousin");
  await other.page.goto(`${BASE}${url}`, { waitUntil: "load" });
  // Streamed pages keep HTTP 200 : the content is what must say "not found".
  const body = await other.page.locator("body").innerText();
  const hidden = /Page introuvable/.test(body) && !/Mon Cousin/i.test(body);
  await go(other.page, "/bibliotheque");
  const otherHome = await text(other.page).catch(() => "");
  check(
    "Une série privée reste invisible pour un autre compte",
    res.ok() && !leaked && hidden && !/Spy x Family/.test(otherHome),
    `recherche ${leaked ? "VISIBLE" : "invisible"}, page ${hidden ? "introuvable" : "VISIBLE"}`
  );
  await other.ctx.close();
});

await step("Les anciens profils publics ne montrent rien", async () => {
  const anon = await newPage();
  const res = await anon.page.goto(`${BASE}/u/e2e-test`, { waitUntil: "load" });
  const og = await anon.page.request.get(`${BASE}/og/profile/e2e-test`);
  check("Les anciens profils publics ne montrent rien", res.status() === 404 && og.status() === 404, `page ${res.status()}, image ${og.status()}`);
  await anon.ctx.close();
});

await step("Retirer une série garde ses lectures, puis la remettre", async () => {
  const before = await readCount(page);
  const url = await seriesUrl(page, "Spy x Family");
  await go(page, url);
  await page.getByText("Plus d'options").click();
  await page.getByRole("button", { name: "Retirer de ma bibliothèque" }).click();
  await page.getByRole("button", { name: "Oui, la retirer" }).click();
  await page.waitForURL(/\/bibliotheque$/, { timeout: 60000 });
  await page.locator("main").first().waitFor();
  await page.waitForTimeout(800);
  const t = await text(page);
  const gone = /Séries retirées · 1/.test(t);
  await page.getByText("Séries retirées").click();
  await page.getByRole("button", { name: "Remettre Spy x Family dans ma bibliothèque" }).click();
  await page.waitForTimeout(2000);
  const after = await readCount(page);
  check("Retirer une série garde ses lectures, puis la remettre", gone && after === before, `lus ${before} → ${after}`);
});

await step("Découvrir : suggestions expliquées, Pas pour moi annulable, Je le veux", async () => {
  await go(page, "/decouvrir");
  const t = await text(page);
  const hasReason = /Parce que tu (lis|as aimé|as .* chez toi)|Du même auteur/.test(t);
  const hasContinue = /Reprendre tes lectures/.test(t);
  await page.getByRole("button", { name: "Pas pour moi" }).first().click();
  await page.getByText(/ne te sera plus proposé/).waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Annuler" }).click();
  await page.getByText(/peut de nouveau t'être proposé/).waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Je le veux" }).first().click();
  await page.getByText(/est dans tes envies/).waitFor({ timeout: 60000 });
  check("Découvrir : suggestions expliquées, Pas pour moi annulable, Je le veux", hasReason && hasContinue, `raison ${hasReason}, reprendre ${hasContinue}`);
  await shot(page, "03-decouvrir");
});

await step("Envies : acheté avec le prix payé, l'estimation n'est pas une dépense", async () => {
  await go(page, "/envies");
  await page.getByRole("button", { name: "Acheté !" }).first().click();
  await page.getByLabel("Prix payé (facultatif)").fill("4,50");
  await page.getByRole("button", { name: "Je l'ai acheté" }).click();
  await page.getByText(/sur ton étagère !/).waitFor({ timeout: 60000 });
  await go(page, "/univers");
  const t = await text(page);
  const paid = t.match(/([\d\s,]+)€ payés/)?.[1]?.replace(/\s/g, "") ?? "";
  // Dr. Stone : 3 volumes at 6,99 + the wish bought at 4,50 ; no estimate counted
  check("Envies : le prix payé compte dans les dépenses, pas l'estimation", paid === "25,47", `payés : ${paid} €`);
  check("Dépenses : couverture des prix affichée", /Prix renseigné pour \d+ tomes? sur \d+ achetés/.test(t));
  await shot(page, "04-univers");
});

await step("Carte des goûts : territoires réels, clic qui ouvre séries et découvertes", async () => {
  await go(page, "/univers");
  await page.getByRole("button", { name: /Rire et quotidien/ }).click();
  const panel = await text(page, "#taste-panel");
  check(
    "Carte des goûts : territoires réels, clic qui ouvre séries et découvertes",
    /Spy x Family/.test(panel) && /À découvrir ici/.test(panel),
    panel.slice(0, 120)
  );
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

await step("Déconnexion puis reconnexion : tout est retrouvé", async () => {
  await go(page, "/univers");
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await page.waitForURL((u) => !/\/univers/.test(u.pathname), { timeout: 60000 });
  const blocked = await page.goto(`${BASE}/bibliotheque`, { waitUntil: "load" }).then(() => /\/login/.test(page.url()));
  await login(page, "e2e@yomushelf.local");
  const t = await text(page);
  check("Déconnexion puis reconnexion : tout est retrouvé", blocked && /Spy x Family/.test(t) && /Dr\. Stone/.test(t) && /Kaiju/.test(t), `protégé ${blocked}`);
});

check("Aucune erreur JavaScript", errors.length === 0, errors.join(" / "));
await ctx.close();

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} vérifications passées (${DESKTOP ? "ordinateur" : "mobile"})`);
process.exit(failed ? 1 : 0);
