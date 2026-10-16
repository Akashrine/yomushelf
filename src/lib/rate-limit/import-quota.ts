import { createClient } from "@supabase/supabase-js";

// Per-account limits, enforced in Postgres (consume_import_quota).
export const IMPORT_QUOTAS = {
  // New entries in the shared catalogue
  import: { limit: 10, windowSeconds: 60 * 60 },
  // ISBN lookups against Google Books
  isbn_lookup: { limit: 30, windowSeconds: 60 },
  // Searches that also ask MyAnimeList (local search stays unlimited)
  remote_search: { limit: 30, windowSeconds: 60 },
} as const;

export type ImportQuotaKind = keyof typeof IMPORT_QUOTAS;

// true = allowed and recorded. Fails closed : if the quota cannot be
// checked, the import is refused rather than left unlimited.
export async function consumeImportQuota(userId: string, kind: ImportQuotaKind): Promise<boolean> {
  const { limit, windowSeconds } = IMPORT_QUOTAS[kind];
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await service.rpc("consume_import_quota", {
    p_user_id: userId,
    p_kind: kind,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[import-quota] check failed", error.message);
    return false;
  }
  return data === true;
}
