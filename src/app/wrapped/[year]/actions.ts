"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type WrappedData = {
  year: number;
  total_volumes_added: number;
  total_budget_spent: number;
  top_3_series: {
    manga_id: string;
    title: string;
    cover_url: string | null;
    volumes_owned: number;
  }[];
  top_genre: string | null;
  delta_vs_previous_year_pct: number | null;
};

type Result =
  | { success: true; data: WrappedData }
  | { success: false; error: string };

export async function ensureWrappedSnapshot(year: number): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  // generate_wrapped is service-role only (no grant to authenticated)
  const service = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: genError } = await service.rpc("generate_wrapped", {
    p_user_id: user.id,
    p_year: year,
  });

  if (genError) return { success: false, error: "Erreur lors du calcul." };

  // Fetch snapshot (RLS allows user to read own)
  const { data: snap } = await supabase
    .from("wrapped_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .eq("year", year)
    .single();

  if (!snap) return { success: false, error: "Snapshot introuvable." };

  return {
    success: true,
    data: {
      year: snap.year,
      total_volumes_added: snap.total_volumes_added,
      total_budget_spent: Number(snap.total_budget_spent),
      top_3_series: (snap.top_3_series as WrappedData["top_3_series"]) ?? [],
      top_genre: snap.top_genre,
      delta_vs_previous_year_pct: snap.delta_vs_previous_year_pct
        ? Number(snap.delta_vs_previous_year_pct)
        : null,
    },
  };
}
