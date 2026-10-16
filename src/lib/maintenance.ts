// Maintenance window for the production switch-over (docs/publication.md).
// MAINTENANCE_MODE=1 stops every page, server action and API route BEFORE
// any database access, so nothing is written while migrations run. The
// owner can still check the site with a bypass token
// (MAINTENANCE_BYPASS_TOKEN, 16+ characters) : open /?maintenance=<token>
// once, a cookie keeps the bypass for that browser.

export const BYPASS_COOKIE = "ys_maintenance_bypass";
export const BYPASS_PARAM = "maintenance";

export type MaintenanceDecision = "pass" | "grant_bypass" | "block";

function sameToken(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function maintenanceDecision({
  enabled,
  token,
  cookie,
  param,
}: {
  enabled: string | undefined;
  token: string | undefined;
  cookie: string | undefined;
  param: string | null;
}): MaintenanceDecision {
  if (enabled !== "1") return "pass";
  const usable = token != null && token.length >= 16;
  if (usable && param != null && sameToken(param, token)) return "grant_bypass";
  if (usable && cookie != null && sameToken(cookie, token)) return "pass";
  return "block";
}

export const MAINTENANCE_HTML = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Yomushelf revient vite</title></head>
<body style="margin:0;background:#f6f0e7;color:#1d2433;font-family:system-ui,sans-serif">
<main style="max-width:420px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:24px">
<p style="font-size:40px;margin:0;color:#e0563a" aria-hidden="true">漫</p>
<h1 style="font-size:24px;margin:0">Yomushelf fait une petite mise à jour</h1>
<p style="margin:0;line-height:1.5">Tes mangas et tes lectures sont gardés. Reviens dans quelques minutes.</p>
</main></body></html>`;
