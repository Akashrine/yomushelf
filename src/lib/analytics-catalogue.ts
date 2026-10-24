import { z } from "zod";

// Every event Yomushelf records, and the only properties each may carry.
// First-party, cookieless, never tied to a person (no user id, no
// visitor id, no IP), no free
// text (never a search query or a title typed by a child). An event or a
// property not listed here is refused by /api/events.

const path = z.string().max(80).regex(/^\/[\w\-/]*$/);
const source = z.string().regex(/^[a-z0-9_.-]{1,40}$/); // tiktok, instagram, direct, google…
const count = z.number().int().min(0).max(10_000);

export const EVENTS = {
  // Landing
  landing_viewed: z.object({}),
  landing_cta_clicked: z.object({ position: z.enum(["header", "hero", "deck_end", "final"]) }),
  demo_swiped: z.object({ choice: z.enum(["wish", "pass", "skip"]) }),
  demo_completed: z.object({ wishes: count }),
  // Account
  signup_viewed: z.object({}),
  account_created: z.object({ method: z.enum(["email", "google"]) }),
  email_confirmed: z.object({}),
  age_answered: z.object({ band: z.enum(["under_15", "15_plus"]) }),
  heard_from_answered: z.object({
    answer: z.enum(["ami", "parent", "librairie", "mediatheque_cdi", "salon", "reseaux", "google", "autre"]),
  }),
  parent_consent_requested: z.object({}),
  parent_consent_given: z.object({}),
  parent_consent_refused: z.object({ when: z.enum(["pending", "given"]) }),
  // App
  app_opened: z.object({ screen: z.enum(["collection", "decouvrir", "serie", "ajouter", "univers", "reglages", "autre"]) }),
  quick_add_done: z.object({ series: count, volumes: count, welcome: z.boolean() }),
  volume_toggled: z.object({ action: z.enum(["add", "remove"]), tab: z.enum(["tomes", "lectures"]) }),
  fill_prompt_answered: z.object({ answer: z.enum(["yes", "no"]), tab: z.enum(["tomes", "lectures"]), volumes: count }),
  series_viewed: z.object({ presence: z.enum(["on_shelf", "archived", "absent"]) }),
  wish_added: z.object({ from: z.enum(["serie", "decouvrir_hero"]) }),
  deck_opened: z.object({}),
  deck_swiped: z.object({ choice: z.enum(["wish", "pass", "skip"]) }),
  discover_filtered: z.object({ age: z.enum(["all", "8", "10", "12", "14"]) }),
  discover_searched: z.object({}),
  pictures_opened: z.object({}),
  similar_clicked: z.object({}),
  // Wrapped (kept from the earlier version)
} as const;

export type EventName = keyof typeof EVENTS;
export type EventProps<N extends EventName> = z.infer<(typeof EVENTS)[N]>;

// What every event may add about where the visit came from.
export const ContextSchema = z.object({
  src: source.optional(), // first-touch source of this browsing session
  path: path.optional(), // route, ids stripped
  device: z.enum(["mobile", "desktop"]).optional(),
});

export const BatchSchema = z.object({
  events: z
    .array(z.object({ name: z.string().max(40), props: z.record(z.string(), z.unknown()).default({}), path: path.optional() }))
    .min(1)
    .max(10),
  context: ContextSchema.default({}),
});

export type ValidEvent = { name: EventName; properties: Record<string, unknown>; path?: string };

// Keeps the known events with their declared properties only.
export function validateEvents(raw: { name: string; props: Record<string, unknown>; path?: string }[]): ValidEvent[] {
  return raw.flatMap((e) => {
    if (!Object.hasOwn(EVENTS, e.name)) return [];
    const parsed = EVENTS[e.name as EventName].strict().safeParse(e.props);
    if (!parsed.success) return [];
    return [{ name: e.name as EventName, properties: parsed.data as Record<string, unknown>, ...(e.path ? { path: e.path } : {}) }];
  });
}

// "2026-W42" : the week an account was created. Lets retention be read per
// sign-up cohort without tying any event to a person.
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Link tokens (consent, family list : 43 base64url characters) are
// credentials : never recorded.
const LINK_TOKEN = /(?<=\/)[A-Za-z0-9_-]{43}(?=$|[/?#])/g;
export const redactLinkTokens = (s: string) => s.replace(LINK_TOKEN, "jeton");

// "/bibliotheque/021acb54-…" → "/bibliotheque/id" : no series id in events.
export function cleanPath(pathname: string): string {
  return redactLinkTokens(pathname).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "id").replace(/[^\w\-/]/g, "").slice(0, 80) || "/";
}

// utm_source first, then the referrer's site, else "direct".
export function sourceFrom(search: string, referrer: string, ownHost: string): string {
  const utm = new URLSearchParams(search).get("utm_source") ?? new URLSearchParams(search).get("src");
  if (utm) return normalizeSource(utm);
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").replace(/^m\./, "").replace(/^l\./, "");
    if (!host || host === ownHost.replace(/^www\./, "")) return "direct";
    const known: Record<string, string> = {
      "tiktok.com": "tiktok",
      "instagram.com": "instagram",
      "facebook.com": "facebook",
      "youtube.com": "youtube",
      "t.co": "twitter",
      "x.com": "twitter",
      "reddit.com": "reddit",
      "google.com": "google",
      "google.fr": "google",
      "bing.com": "bing",
      "duckduckgo.com": "duckduckgo",
      "discord.com": "discord",
    };
    return known[host] ?? normalizeSource(host);
  } catch {
    return "direct";
  }
}

function normalizeSource(raw: string): string {
  const s = raw.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40);
  return s || "direct";
}
