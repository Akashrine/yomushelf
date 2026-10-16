import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { ShelfCover } from "@/components/landing/shelf-3d";

// Series the landing shows to parents : all-ages titles only, picked by hand
// (catalogue ages are not verified for every series yet). The first five
// also make the static shelf.
const LANDING_TITLES = [
  "One Piece",
  "Chi - Une vie de chat",
  "Doraemon",
  "Pokémon - La Grande Aventure",
  "Dragon Ball",
  "Détective Conan",
  "Yotsuba&!",
  "Card Captor Sakura",
  "Yo-kai Watch",
];

// Anonymous client without cookies : the page stays static (revalidated)
// and only shared catalogue rows are readable under RLS.
export async function getLandingCovers(): Promise<ShelfCover[]> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase
    .from("mangas")
    .select("title, cover_url")
    .in("title", LANDING_TITLES)
    .is("created_by", null)
    .is("merged_into", null)
    .not("cover_url", "is", null);
  if (error || !data) return [];
  // one cover per title (the catalogue still holds a few duplicates), in list order
  const byTitle = new Map(data.map((m) => [m.title, m.cover_url as string]));
  return LANDING_TITLES.filter((t) => byTitle.has(t)).map((title) => ({ title, cover_url: byTitle.get(title)! }));
}
