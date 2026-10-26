// End-to-end journeys of Yomushelf in a real browser.
//
// Usage : e2e/run.sh (local stack only, never production) — see docs/tests.md.
// By hand, with the app on the local stack and the accounts of e2e/reset.sql :
//   BASE=http://localhost:3100 node e2e/journeys.mjs
// Env :
//   BASE      app url (default http://localhost:3100)
//   VIEWPORT  mobile (default, 390×844 touch) or desktop (1280×800)
//   SIGNUP    1 to also create a brand new account (email confirmation off,
//             as in the local Supabase config)
//   ONLY      a word : run only the steps whose name contains it
//   CHROME    Chromium executable (default : Playwright's cache)
//   SHOTS     folder for screenshots (optional)
// Accounts (password e2e-yomushelf) : e2e@ and other@ are readers of 15 and
// over, kid@ is under 15 with a parent's consent. Steps are written to be
// read one at a time : each says what it starts from.
// Prints PASS / FAIL per check and exits 1 when something failed.

import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";

const BASE = process.env.BASE ?? "http://localhost:3100";
if (/yomushelf\.com/.test(BASE)) throw new Error("Local only.");
const DESKTOP = process.env.VIEWPORT === "desktop";
const CHROME =
  process.env.CHROME ??
  `${homedir()}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const SHOTS = process.env.SHOTS ?? null;
const ONLY = process.env.ONLY ?? null;
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const PASSWORD = "e2e-yomushelf";
const ADULT = "e2e@yomushelf.local";
const OTHER = "other@yomushelf.local";
const KID = "kid@yomushelf.local";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}
let current = null; // the page of the main journey, for a screenshot when a step breaks
async function step(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try {
    await fn();
  } catch (e) {
    check(name, false, `exception : ${String(e.message ?? e).split("\n").filter((l) => l.trim()).slice(0, 3).join(" ")}`);
    if (SHOTS && current) await current.screenshot({ path: `${SHOTS}/echec-${name.replace(/\W+/g, "-").slice(0, 40)}.png`, fullPage: true }).catch(() => {});
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

// A reader with an empty library lands on the quick add, not on the library.
async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 180000 });
  await page.locator('input[name="email"]').waitFor({ timeout: 60000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/(bibliotheque|ajouter)/, { timeout: 120000 }), page.press('input[name="password"]', "Enter")]);
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
const api = async (page, path) => {
  const res = await page.request.get(`${BASE}${path}`);
  return { ok: res.ok(), status: res.status(), json: await res.json().catch(() => ({})) };
};

// The quick add : search each title, pick it, say how many volumes (the
// last one at home), done. Titles are found in the local catalogue.
async function quickAdd(page, picks) {
  await go(page, "/ajouter");
  const box = page.getByPlaceholder("Pas dans la liste ? Écris le titre");
  for (const p of picks) {
    await box.fill(p.title);
    await page.getByRole("button", { name: p.title }).first().click({ timeout: 30000 });
    await box.fill("");
  }
  await page.getByRole("button", { name: /^Continuer avec/ }).click();
  for (const p of picks) await page.getByLabel(`Dernier tome de ${p.title}`).fill(String(p.last));
  await page.getByRole("button", { name: "C'est fait !" }).click();
  await page.getByText(/dans ta bibliothèque/).waitFor({ timeout: 60000 });
}

// The series page of a title on the shelf.
async function openSeries(page, title) {
  await go(page, "/bibliotheque");
  await page.getByRole("link", { name: new RegExp(`^${title}, \\d+ tomes?`) }).first().click();
  await page.waitForURL(/\/bibliotheque\/[0-9a-f-]{36}/, { timeout: 60000 });
  await page.getByRole("button", { name: /^Tome 1,/ }).waitFor({ timeout: 60000 });
}

const atHome = (page) => page.getByRole("button", { name: /^Tome \d+, chez toi$/ }).count();
const volumesRead = async (page) => {
  await go(page, "/univers");
  const m = (await text(page)).match(/(\d+) tomes? lus?\b/);
  return m ? Number(m[1]) : NaN;
};

// ── Account creation (local only) ───────────────────────────
if (process.env.SIGNUP === "1") {
  await step("Création de compte : âge, source, puis ajout rapide", async () => {
    const s = await newPage();
    const email = `e2e-${Date.now()}@yomushelf.local`;
    await s.page.goto(`${BASE}/signup`, { waitUntil: "load", timeout: 180000 });
    await s.page.getByLabel("Email").fill(email);
    await s.page.getByLabel("Mot de passe").fill(PASSWORD);
    await s.page.getByRole("button", { name: "Créer mon compte" }).click();
    await s.page.waitForURL(/\/bienvenue/, { timeout: 120000 });
    const ask = await text(s.page, "body");
    await s.page.getByRole("button", { name: /15 ans ou plus|15 ans et plus/ }).click();
    await s.page.getByRole("button", { name: /Un ami|Un\(e\) ami/ }).click({ timeout: 15000 }).catch(() => {});
    await s.page.waitForURL(/\/(ajouter|bibliotheque)/, { timeout: 60000 }).catch(() => {});
    check("Création de compte : l'âge est demandé, puis l'app s'ouvre", /âge|ans/i.test(ask) && /\/(ajouter|bibliotheque)/.test(s.page.url()), s.page.url());
    await s.ctx.close();
  });
}

// ── 15 and over : the main journey ──────────────────────────
const { ctx, page, errors } = await signIn(ADULT);
current = page;

await step("Premier lancement : une bibliothèque vide mène à l'ajout rapide", async () => {
  // The library answers first, then sends an empty one to the quick add.
  await page.waitForURL(/\/ajouter\?bienvenue=1/, { timeout: 60000 });
  const url = page.url();
  await page.locator("main").first().waitFor({ timeout: 60000 });
  const t = await text(page);
  check("Bibliothèque vide : on arrive sur l'ajout rapide", /\/ajouter\?bienvenue=1/.test(url) && /Bienvenue Testeur/.test(t) && /Quels mangas as-tu/.test(t), url);
  await shot(page, "01-bienvenue");
  await quickAdd(page, [{ title: "Spy x Family", last: 5 }, { title: "Frieren", last: 3 }]);
  const done = await text(page);
  check("Ajout rapide : 2 séries et 8 tomes", /2 séries et 8 tomes/.test(done), done.slice(0, 80));
  await page.getByRole("link", { name: "Voir ma bibliothèque" }).click();
  await page.waitForURL(/\/bibliotheque$/, { timeout: 60000 });
  const lib = await text(page);
  check("Ma collection : un mur de couvertures avec le compte de tomes", /2 séries · 8 tomes/.test(lib) && (await page.getByRole("link", { name: /^Spy x Family, 5 tomes sur \d+/ }).count()) === 1);
  await shot(page, "02-bibliotheque");
});

await step("Ma collection : envies, à lire chez toi", async () => {
  await go(page, "/bibliotheque");
  const t = await text(page);
  const envies = page.getByRole("link", { name: /^Mes envies/ }).first();
  check(
    "Ma collection : le bouton Mes envies, À lire chez toi, anciennes lectures",
    (await envies.getAttribute("href")) === "/envies" && /À lire chez toi/.test(t) && /8 tomes non lus/.test(t) && /Noter d'anciennes lectures/.test(t),
    t.slice(0, 160)
  );
});

await step("Fiche série : toucher un tome l'ajoute, le retoucher l'enlève", async () => {
  await openSeries(page, "Spy x Family");
  const before = await atHome(page);
  await page.getByRole("button", { name: /^Tome 6, pas chez toi$/ }).click();
  await page.getByRole("button", { name: /^Tome 6, chez toi$/ }).waitFor({ timeout: 30000 });
  const added = await atHome(page);
  await page.getByRole("button", { name: /^Tome 6, chez toi$/ }).click();
  await page.getByRole("button", { name: /^Tome 6, pas chez toi$/ }).waitFor({ timeout: 30000 });
  const removed = await atHome(page);
  check("Fiche série : toucher ajoute, retoucher enlève", before === 5 && added === 6 && removed === 5, `${before} → ${added} → ${removed}`);
});

await step("Fiche série : toucher le tome 29 propose les 28 d'avant", async () => {
  await quickAdd(page, [{ title: "Dragon Ball", last: 1 }]);
  await openSeries(page, "Dragon Ball");
  // A long series shows the first tomes ; the rest is one tap away.
  await page.getByRole("button", { name: /^Voir les \d+ tomes/ }).click();
  await page.getByRole("button", { name: /^Tome 29, pas chez toi$/ }).click({ timeout: 15000 });
  const ask = await page.getByText(/Tu as aussi/).first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  await page.getByRole("button", { name: "Oui" }).click();
  await page.getByRole("button", { name: /^Tome 28, chez toi$/ }).waitFor({ timeout: 30000 });
  const n = await atHome(page);
  check("Tome 29 touché : les 28 d'avant proposés, puis rangés", ask && n === 29, `propose ${ask}, chez toi ${n}`);
});

await step("Mes lectures : noter un tome lu, c'est compté dans Mon univers", async () => {
  const before = await volumesRead(page);
  await openSeries(page, "Spy x Family");
  await page.getByRole("button", { name: "Mes lectures" }).click();
  await page.getByRole("button", { name: /^Tome 2, pas encore lu$/ }).click();
  await page.getByRole("button", { name: /^Tome 2, lu$/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  const after = await volumesRead(page);
  check("Mes lectures : un tome lu de plus dans Mon univers", after === before + 1, `${before} → ${after}`);
});

await step("Recherche : zéro, un, plusieurs résultats du catalogue, sans doublon", async () => {
  const local = async (q) => {
    const r = await api(page, `/api/mangas/search?q=${encodeURIComponent(q)}`);
    return { ...r, n: (r.json.results ?? []).filter((x) => x.source !== "mal").length, titles: (r.json.results ?? []).map((x) => x.title.toLowerCase()) };
  };
  const zero = await local("xqzvwk");
  const one = await local("dorohedoro");
  const many = await local("dragon");
  check(
    "Recherche : zéro, un, plusieurs résultats, sans doublon",
    zero.ok && zero.n === 0 && one.n === 1 && many.n >= 3 && new Set(many.titles).size === many.titles.length,
    `0→${zero.n} 1→${one.n} n→${many.n}`
  );
  check("Recherche : un lecteur de 15 ans et plus n'est pas restreint", (await api(page, "/api/mangas/search?q=chainsaw")).json.restricted === false);
});

await step("Fiche personnelle : une série introuvable, modifiable, puis supprimée avec son titre", async () => {
  // The detailed add : for a series the catalogue does not know.
  await go(page, "/ajouter?detaille=1");
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
  await openSeries(page, "Le Manga De Mon Cousin");
  await page.getByText("Plus").first().click();
  await page.getByText("Modifier ma fiche").click();
  await page.getByLabel("Nombre de tomes parus (facultatif)").fill("3");
  await page.getByRole("button", { name: "Enregistrer la fiche" }).click();
  await page.getByText("Fiche enregistrée.").waitFor({ timeout: 60000 });
  await page.reload({ waitUntil: "load" });
  const t = await text(page);
  check("Fiche personnelle : modifiable, l'auteur et les 3 tomes parus sont gardés", /Mon cousin/.test(t) && /3 tomes/.test(t), t.slice(0, 100));
  // Private to its owner : another reader finds nothing.
  const other = await signIn(OTHER);
  const leaked = (await api(other.page, `/api/mangas/search?q=${encodeURIComponent("Manga De Mon Cousin")}`)).json.results?.some((r) => /Mon Cousin/i.test(r.title));
  const url = new URL(page.url()).pathname;
  await other.page.goto(`${BASE}${url}`, { waitUntil: "load" });
  const body = await other.page.locator("body").innerText();
  check("Fiche personnelle : invisible pour un autre compte", !leaked && /Page introuvable/.test(body) && !/Mon Cousin/i.test(body));
  await other.ctx.close();
  await page.getByText("Plus").first().click();
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  const del = page.getByRole("button", { name: "Supprimer", exact: true });
  const disabledBefore = await del.isDisabled();
  await page.getByLabel(/pour confirmer/).fill("Le Manga De Mon Cousin");
  await del.click();
  await page.waitForURL(/\/bibliotheque$/, { timeout: 60000 });
  check("Supprimer définitivement demande le titre", disabledBefore && !/Le Manga De Mon Cousin/.test(await text(page)));
});

await step("Trop de tomes : plafonné si la série est terminée, avertissement si elle est en cours", async () => {
  // Finished series (7 volumes) : the stepper stops at the total.
  await go(page, "/ajouter?detaille=1");
  await page.getByRole("searchbox").first().fill("Evangelion perfect");
  await page.getByRole("button", { name: /perfect/i }).first().click();
  await page.getByRole("radio", { name: /J'ai les tomes du 1 au/ }).click();
  const stepper = page.getByRole("spinbutton", { name: "Jusqu'au tome" });
  await stepper.fill("20");
  await stepper.blur();
  const capped = Number(await stepper.inputValue());
  // Ongoing series (7 volumes known) : a warning, never a block.
  await go(page, "/ajouter?detaille=1");
  await page.getByRole("searchbox").first().fill("Beyblade X");
  await page.getByRole("button", { name: /Beyblade X/ }).first().click();
  await page.getByRole("radio", { name: /J'ai les tomes du 1 au/ }).click();
  const ongoing = page.getByRole("spinbutton", { name: "Jusqu'au tome" });
  await ongoing.fill("20");
  const warn = await page.getByRole("status").filter({ hasText: /parus\. Tu en notes 20/ }).count();
  await ongoing.fill("2");
  const calm = await page.getByRole("status").filter({ hasText: /parus\. Tu en notes/ }).count();
  check("Trop de tomes : plafonné à 7 si terminée, avertissement si en cours", capped <= 7 && warn === 1 && calm === 0, `plafond ${capped}, avertissement ${warn}, en dessous ${calm}`);
});

await step("Les anciens profils publics ne montrent rien", async () => {
  const anon = await newPage();
  const res = await anon.page.goto(`${BASE}/u/e2e-test`, { waitUntil: "load" });
  const og = await anon.page.request.get(`${BASE}/og/profile/e2e-test`);
  check("Les anciens profils publics ne montrent rien", res.status() === 404 && og.status() === 404, `page ${res.status()}, image ${og.status()}`);
  await anon.ctx.close();
});

await step("Retirer une série garde ses lectures, puis la remettre", async () => {
  const before = await volumesRead(page);
  await openSeries(page, "Spy x Family");
  await page.getByText("Plus").first().click();
  await page.getByRole("button", { name: "Retirer de ma collection" }).click();
  await page.getByRole("button", { name: /Oui, la retirer|Retirer/ }).last().click();
  await page.waitForURL(/\/bibliotheque$/, { timeout: 60000 });
  await page.locator("main").first().waitFor();
  await page.waitForTimeout(800);
  const gone = /Séries retirées · 1/.test(await text(page));
  await page.getByText("Séries retirées").click();
  await page.getByRole("button", { name: "Remettre Spy x Family dans ma collection" }).click();
  await page.waitForTimeout(2000);
  const after = await volumesRead(page);
  check("Retirer une série garde ses lectures, puis la remettre", gone && after === before, `lus ${before} → ${after}`);
});

await step("Découvrir : rien de déjà chez toi, une série une seule fois, Je le veux", async () => {
  await go(page, "/decouvrir");
  // The rows only : the featured card at the top repeats the first suggestion on purpose.
  const hrefs = await page.$$eval("main section[aria-labelledby^='h-'] ul a[href^='/bibliotheque/']", (as) => as.map((a) => a.getAttribute("href")));
  const owned = await api(page, "/api/mangas/search?q=spy");
  const spyId = (owned.json.results ?? []).find((r) => r.title === "Spy x Family")?.id;
  check(
    "Découvrir : des rangées, chaque série une fois, aucune série déjà chez toi",
    hrefs.length >= 10 && new Set(hrefs).size === hrefs.length && !hrefs.some((h) => h.endsWith(`/${spyId}`)),
    `${hrefs.length} couvertures`
  );
  await shot(page, "03-decouvrir");
  const t = await text(page);
  check("Découvrir : « Pour toi » explique ses suggestions", /Parce que tu (lis|as aimé|as .* chez toi)|Proche de|Du même auteur/.test(t) || /Pour toi/.test(t));
});

await step("Envies : acheté avec son prix, ça compte dans Mon univers", async () => {
  await quickAdd(page, [{ title: "Dr. Stone", last: 3 }]);
  await openSeries(page, "Dr. Stone");
  await page.getByRole("button", { name: /^Je veux le 4/ }).click();
  await page.getByText("Dans mes envies").first().waitFor({ timeout: 60000 });
  await go(page, "/envies");
  await page.getByRole("button", { name: "Acheté !" }).first().click();
  await page.getByLabel("Prix payé (facultatif)").fill("4,50");
  await page.getByRole("button", { name: "Je l'ai acheté" }).click();
  await page.getByText(/sur ton étagère !/).waitFor({ timeout: 60000 });
  await go(page, "/univers");
  const t = await text(page);
  check("Envies : le prix payé est dans les dépenses", /4,50\s?€ payés/.test(t), t.match(/[\d\s,]+€ payés/)?.[0] ?? "absent");
  check("Mon univers : ce que vaut la collection, estimé au prix de l'éditeur, sans rien saisir", /Ma collection/.test(t) && /ce que tes tomes coûtaient neufs/.test(t) && /au prix de l'éditeur/.test(t));
  await shot(page, "04-univers");
});

await step("Mon univers : la carte des goûts ouvre séries et découvertes", async () => {
  await go(page, "/univers");
  await page.getByRole("button", { name: /Rire et quotidien/ }).click();
  const panel = await text(page, "#taste-panel");
  check("Carte des goûts : territoires réels, clic qui ouvre séries et découvertes", /Spy x Family|Frieren|Dr\. Stone/.test(panel) && /À découvrir ici/.test(panel), panel.slice(0, 120));
});

await step("Erreur réseau : message honnête, rien d'annoncé à tort, puis réussite", async () => {
  await openSeries(page, "Frieren");
  const liked = () => page.getByRole("button", { name: "J'aime" }).getAttribute("aria-pressed");
  const before = await liked();
  // Cut every server action request : the app must say it failed.
  await page.route("**/*", (route) => (route.request().headers()["next-action"] ? route.abort() : route.continue()));
  await page.getByRole("button", { name: "J'aime" }).click();
  const alert = await page.getByRole("alert").filter({ hasText: /connexion|enregistr/i }).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  await page.unroute("**/*");
  await page.reload({ waitUntil: "load" });
  await page.locator("main").first().waitFor();
  const notSaved = (await liked()) === before;
  await page.getByRole("button", { name: "J'aime" }).click();
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "load" });
  await page.locator("main").first().waitFor();
  const saved = (await liked()) === "true";
  check("Erreur réseau : message honnête, rien d'annoncé à tort, puis réussite", alert && notSaved && saved, `alerte ${alert}, pas enregistré ${notSaved}, enregistré ensuite ${saved}`);
});

await step("Anciennes adresses redirigées", async () => {
  const out = [];
  for (const p of ["/collection", "/parent", "/profil", "/onboarding/1"]) {
    await go(page, p);
    out.push(new URL(page.url()).pathname);
  }
  check("Anciennes adresses redirigées", out.join(",") === "/bibliotheque,/univers,/reglages,/bibliotheque", out.join(","));
});

await step("Rouage : les réglages à part, Mon univers ne garde que les chiffres", async () => {
  await go(page, "/univers");
  const uni = await text(page);
  await page.getByRole("link", { name: "Réglages", exact: true }).click();
  await page.waitForURL(/\/reglages$/, { timeout: 60000 });
  const settings = await text(page);
  check(
    "Rouage : les réglages à part, Mon univers ne garde que les chiffres",
    /Ma carte des goûts/.test(uni) && /Mes dépenses renseignées/.test(uni) && !/Me déconnecter|Noter d'anciennes lectures/.test(uni) && /Pseudo/.test(settings) && /Me déconnecter/.test(settings),
    page.url()
  );
  await page.getByLabel("Pseudo").fill("Testeur");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  check("Réglages : le pseudo s'enregistre", await page.getByText("Pseudo enregistré.").waitFor({ timeout: 30000 }).then(() => true, () => false));
});

await step("Déconnexion puis reconnexion : tout est retrouvé", async () => {
  await go(page, "/reglages");
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await page.waitForURL((u) => !/\/reglages/.test(u.pathname), { timeout: 60000 });
  const blocked = await page.goto(`${BASE}/bibliotheque`, { waitUntil: "load" }).then(() => /\/login/.test(page.url()));
  await login(page, ADULT);
  const t = await text(page);
  check("Déconnexion puis reconnexion : tout est retrouvé", blocked && /Frieren/.test(t) && /Dr\. Stone/.test(t) && /Dragon Ball/.test(t), `protégé ${blocked}`);
});

check("Aucune erreur JavaScript (lecteur de 15 ans et plus)", errors.length === 0, errors.join(" / "));
await ctx.close();

// ── Under 15, with a parent's consent ───────────────────────
await step("Moins de 15 ans : la recherche et l'ajout suivent la sélection jeunesse", async () => {
  const kid = await signIn(KID);
  const k = kid.page;
  const naruto = await api(k, "/api/mangas/search?q=naruto");
  check("Moins de 15 ans : une série à âge vérifié est trouvée", naruto.json.results?.some((r) => r.title === "Naruto"));
  const chainsaw = await api(k, "/api/mangas/search?q=chainsaw");
  check(
    "Moins de 15 ans : une série sans âge vérifié n'est pas proposée, et rien ne part vers MyAnimeList",
    chainsaw.json.results?.length === 0 && chainsaw.json.restricted === true && !chainsaw.json.results?.some((r) => r.source === "mal")
  );
  const dragon = await api(k, "/api/mangas/search?q=dragon");
  check("Moins de 15 ans : les séries refusées ne vident pas la recherche", (dragon.json.results ?? []).length > 0);
  await go(k, "/ajouter");
  await k.getByPlaceholder("Pas dans la liste ? Écris le titre").fill("chainsaw");
  await k.waitForTimeout(2500);
  const t = await text(k);
  check("Moins de 15 ans : « Rien trouvé » et la raison sont dits", /Rien trouvé/.test(t) && /âge conseillé/.test(t), t.slice(0, 260));
  await kid.ctx.close();
});

await step("Pages publiques : confidentialité à jour, mentions légales", async () => {
  const anon = await newPage();
  await anon.page.goto(`${BASE}/confidentialite`, { waitUntil: "load" });
  const t = await text(anon.page, "body");
  check(
    "Confidentialité : liste de Noël, prestataires, droits, plus de liste d'attente",
    /Ta liste de Noël/.test(t) && /Hébergement et prestataires/.test(t) && /Tes droits/.test(t) && !/liste d'attente/i.test(t)
  );
  const legal = await anon.page.goto(`${BASE}/mentions-legales`, { waitUntil: "load" });
  check("Mentions légales : la page répond", legal.status() === 200);
  const protectedRoute = await anon.page.goto(`${BASE}/reglages`, { waitUntil: "load" }).then(() => /\/login/.test(anon.page.url()));
  check("Une page privée renvoie vers la connexion", protectedRoute);
  await anon.ctx.close();
});

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} vérifications passées (${DESKTOP ? "ordinateur" : "mobile"})`);
process.exit(failed ? 1 : 0);
