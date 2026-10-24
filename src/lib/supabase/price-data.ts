import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { PriceRow } from "@/lib/univers/prices";

type Supabase = SupabaseClient<Database>;
const COLUMNS = "id, publisher_fr, list_price_eur";

// What the price index needs, and only that : every priced shared series
// (for publisher medians), page by page past PostgREST's 1000-row cap,
// plus the reader's series of interest (their publisher, for an unpriced
// one). A failure throws : the page shows its error, never "no price".
export async function loadPriceRows(supabase: Supabase, ids: string[]): Promise<PriceRow[]> {
  const rows: PriceRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("mangas")
      .select(COLUMNS)
      .is("created_by", null)
      .is("merged_into", null)
      .not("list_price_eur", "is", null)
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error("Impossible de charger les prix.");
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 100) {
    const { data, error } = await supabase.from("mangas").select(COLUMNS).in("id", unique.slice(i, i + 100));
    if (error) throw new Error("Impossible de charger les prix.");
    rows.push(...data);
  }
  return rows;
}
