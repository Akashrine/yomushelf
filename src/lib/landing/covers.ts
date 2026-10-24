import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { DeckCard } from "@/lib/discovery/deck";

// The landing's try-it deck : series picked by hand among those whose age is
// verified (CNLJ selection), so parents never read "âge non vérifié" here ;
// each with a short reason like the ones Découvrir gives.
const LANDING_DECK: { title: string; reason: string }[] = [
  { title: "One Piece", reason: "Le manga le plus lu en France" },
  { title: "Chi - Une vie de chat", reason: "Doux et drôle, parfait pour commencer" },
  { title: "Dragon Ball", reason: "La grande aventure de Goku" },
  { title: "Yotsuba&!", reason: "Pour rire à chaque page" },
  { title: "Naruto", reason: "Ninjas, amitié et persévérance" },
];

// Anonymous client without cookies : the page stays static (revalidated)
// and only shared catalogue rows are readable under RLS. Null without
// Supabase settings (a preview build without its variables) : the page
// still builds instead of failing the deployment.
function anonCatalogueClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient<Database>(url, key, { auth: { persistSession: false } }) : null;
}

export async function getLandingDeck(): Promise<DeckCard[]> {
  const supabase = anonCatalogueClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("mangas")
    .select("id, title, author, genres, demographic, audience_min_age, audience_age_source, audience_age_scope, audience_age_volumes, audience_age_year, total_volumes, status, top_50_rank, cover_url")
    .in("title", LANDING_DECK.map((d) => d.title))
    .is("created_by", null)
    .is("merged_into", null)
    .not("cover_url", "is", null);
  if (error || !data) return [];
  // one card per title, in list order ; among duplicates of a title, the most
  // complete row (verified age, then ranked) — the other one says "âge non vérifié"
  const score = (m: (typeof data)[number]) => (m.audience_age_source === "cnlj" ? 2 : 0) + (m.top_50_rank ? 1 : 0);
  const byTitle = new Map<string, (typeof data)[number]>();
  for (const m of data) {
    const kept = byTitle.get(m.title);
    if (!kept || score(m) > score(kept)) byTitle.set(m.title, m);
  }
  return LANDING_DECK.flatMap(({ title, reason }) => {
    const m = byTitle.get(title);
    return m ? [{ entry: { ...m, genres: m.genres ?? [] }, reason }] : [];
  });
}

// Figures the landing quotes : curated series, and those with a CNLJ age
// for the whole series. Null when unknown : the page then says nothing
// rather than a stale number.
export async function getCatalogueFigures(): Promise<{ series: number; verifiedAge: number } | null> {
  const supabase = anonCatalogueClient();
  if (!supabase) return null;
  const curated = () => supabase.from("mangas").select("id", { count: "exact", head: true }).is("created_by", null).is("merged_into", null).eq("curated", true);
  const [all, aged] = await Promise.all([curated(), curated().eq("audience_age_source", "cnlj").eq("audience_age_scope", "series")]);
  if (all.error || aged.error || all.count == null || aged.count == null) return null;
  return { series: all.count, verifiedAge: aged.count };
}
