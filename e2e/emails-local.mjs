// Account emails, end to end, against a LOCAL Supabase with mail capture
// (Mailpit) and email confirmation on. Each link is opened in a FRESH
// browser, like on another device. LOCAL ONLY.
// Usage : BASE=http://localhost:3300 MAILPIT=http://127.0.0.1:55424 node e2e/emails-local.mjs
// Publication control under maintenance and write freeze :
//   EMAIL=<address on ops_freeze_allow> BYPASS=<MAINTENANCE_BYPASS_TOKEN> …
import { chromium } from "playwright-core";
import { homedir } from "node:os";
const BASE = process.env.BASE ?? "http://localhost:3300";
const MAILPIT = process.env.MAILPIT ?? "http://127.0.0.1:55424";
const CHROME = process.env.CHROME ?? `${homedir()}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const email = process.env.EMAIL ?? `courriel-${Date.now()}@yomushelf.local`;
const BYPASS = process.env.BYPASS ?? null;
const password = "e2e-yomushelf-mail";
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); };
const b = await chromium.launch({ executablePath: CHROME });
// A fresh browser ; under maintenance it first takes the bypass cookie.
const fresh = async () => {
  const page = await (await b.newContext()).newPage();
  if (BYPASS) await page.goto(`${BASE}/?maintenance=${BYPASS}`, { waitUntil: "load" });
  return page;
};

async function lastMail(to, subjectPart) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)).json();
    const m = (list.messages ?? []).find((x) => x.Subject.includes(subjectPart));
    if (m) return (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json();
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}
const linkOf = (msg) => (msg?.HTML ?? "").match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");

// Sign-up : confirmation email in French, link opened elsewhere
let p = await fresh();
await p.goto(`${BASE}/signup`, { waitUntil: "load" });
await p.getByLabel("Email").fill(email);
await p.getByLabel("Mot de passe").fill(password);
await p.getByRole("button", { name: "Créer mon compte" }).click();
await p.getByText("Vérifie tes emails.").waitFor({ timeout: 30000 });
const confirm = await lastMail(email, "Confirme ton adresse");
check("Inscription : e-mail de confirmation en français reçu", Boolean(confirm), confirm?.Subject ?? "aucun");
p = await fresh();
await p.goto(linkOf(confirm), { waitUntil: "load" });
await p.waitForTimeout(2000);
check("Confirmation depuis un autre navigateur : connecté, bibliothèque ouverte", /\/bibliotheque/.test(p.url()), p.url());

// Forgotten password : email in French, link opened elsewhere
p = await fresh();
await p.goto(`${BASE}/forgot-password`, { waitUntil: "load" });
await p.getByLabel("Email").fill(email);
await p.getByRole("button", { name: "Recevoir le lien" }).click();
await p.getByText(/Si un compte existe/).waitFor({ timeout: 30000 });
const recovery = await lastMail(email, "changer de mot de passe");
check("Mot de passe oublié : e-mail en français reçu", Boolean(recovery), recovery?.Subject ?? "aucun");
p = await fresh();
await p.goto(linkOf(recovery), { waitUntil: "load" });
await p.waitForTimeout(2000);
const onSettings = /\/reglages/.test(p.url());
let changed = false;
if (onSettings) {
  await p.getByLabel("Nouveau mot de passe").fill(password + "2");
  await p.getByLabel("Encore une fois").fill(password + "2");
  await p.getByRole("button", { name: "Changer le mot de passe" }).click();
  changed = await p.getByText("Mot de passe changé.").waitFor({ timeout: 30000 }).then(() => true, () => false);
}
check("Lien de récupération depuis un autre navigateur : réglages ouverts, mot de passe changé", onSettings && changed, p.url());

// Sign-in with the new password, in another fresh browser
p = await fresh();
await p.goto(`${BASE}/login`, { waitUntil: "load" });
await p.fill('input[name="email"]', email);
await p.fill('input[name="password"]', password + "2");
await Promise.all([p.waitForURL(/\/bibliotheque/, { timeout: 60000 }).catch(() => {}), p.press('input[name="password"]', "Enter")]);
check("Connexion avec le nouveau mot de passe", /\/bibliotheque/.test(p.url()), p.url());

// The same link a second time must not log in
p = await fresh();
await p.goto(linkOf(recovery), { waitUntil: "load" });
await p.waitForTimeout(1500);
check("Un lien déjà utilisé ne connecte pas", /\/login\?error=/.test(p.url()), p.url());

await b.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} vérifications passées`);
process.exit(results.every(Boolean) ? 0 : 1);
