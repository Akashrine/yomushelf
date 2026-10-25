// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────
const state = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-a111-111111111111" } as { id: string } | null,
  existingByExternal: null as { id: string } | null,
  existingById: null as ({ id: string } & Record<string, unknown>) | null,
  ageBand: "15_plus" as string | null,
  profileError: false,
  onShelf: false,
  quota: true,
  inserted: [] as Record<string, unknown>[],
  upserts: [] as Record<string, unknown>[],
  lookupError: null as { code: string } | null,
  saveError: null as { code: string } | null,
}));

function query(table: string) {
  const q: Record<string, unknown> = {};
  let filter: "contains" | "eq" | null = null;
  Object.assign(q, {
    select: () => q,
    eq: () => ((filter = filter ?? "eq"), q),
    contains: () => ((filter = "contains"), q),
    is: () => q,
    limit: () => q,
    maybeSingle: async () => ({
      data:
        table === "mangas"
          ? filter === "contains"
            ? state.existingByExternal
            : state.existingById
          : table === "user_collections" && state.onShelf
            ? { manga_id: "on-shelf" }
            : null,
      error: state.lookupError,
    }),
    // profiles : the reader's age band
    single: async () =>
      state.profileError ? { data: null, error: { code: "08006" } } : { data: table === "profiles" ? { age_band: state.ageBand } : null, error: null },
    upsert: async (row: Record<string, unknown>) => {
      state.upserts.push(row);
      return { error: state.saveError };
    },
    insert: async () => ({ error: null }),
    // ensureOnShelf : update(...).eq(...).eq(...).not(...) brings an archived series back
    update: () => q,
    not: async () => ({ error: null }),
  });
  return q;
}

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: state.user ? { claims: { sub: state.user.id } } : null }) },
    from: (table: string) => query(table),
    // Catalogue search used to recognise a series from a bookstore record
    rpc: async () => ({ data: [], error: null }),
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        state.inserted.push(row);
        return { select: () => ({ single: async () => ({ data: { id: row.id }, error: null }) }) };
      },
    }),
  }),
}));

const getMangaByIdMAL = vi.fn();
vi.mock("@/lib/manga-api/mal", () => ({ getMangaByIdMAL: (id: number) => getMangaByIdMAL(id) }));
const lookupByIsbn = vi.fn();
vi.mock("@/lib/manga-api/google-books", () => ({ lookupByIsbn: (isbn: string) => lookupByIsbn(isbn) }));
const cacheCoverToStorage = vi.fn();
vi.mock("@/lib/manga-api/storage", () => ({
  cacheCoverToStorage: (url: string, id: string) => cacheCoverToStorage(url, id),
}));
const consumeImportQuota = vi.fn();
vi.mock("@/lib/rate-limit/import-quota", () => ({
  consumeImportQuota: (userId: string, kind: string) => consumeImportQuota(userId, kind),
}));
vi.mock("@/lib/supabase/queries", () => ({
  getUserCollection: async () => null,
  updateCollectionVolumes: async () => ({ error: null }),
}));

import { addMangaFromExternalSource, lookupIsbn } from "./actions";

const MAL_META = {
  source: "mal" as const,
  external_id: "13",
  title: "One Piece",
  author: "Oda Eiichiro",
  publisher_fr: null,
  total_volumes: null,
  status: "ongoing" as const,
  avg_price_eur: 7.5,
  genre_primary: "Shounen",
  cover_url: "https://cdn.myanimelist.net/images/manga/2/253146.jpg",
  external_ids: { mal_id: 13 },
};

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  state.user = { id: "11111111-1111-4111-a111-111111111111" };
  state.existingByExternal = null;
  state.existingById = null;
  state.ageBand = "15_plus";
  state.profileError = false;
  state.onShelf = false;
  state.inserted = [];
  state.upserts = [];
  state.lookupError = null;
  state.saveError = null;
  getMangaByIdMAL.mockReset().mockResolvedValue(MAL_META);
  lookupByIsbn.mockReset().mockResolvedValue(null);
  cacheCoverToStorage.mockReset().mockResolvedValue("https://storage.example/covers/x.jpg");
  consumeImportQuota.mockReset().mockResolvedValue(true);
});

describe("addMangaFromExternalSource", () => {
  it("does not import a duplicate when the catalogue lookup fails", async () => {
    state.lookupError = { code: "08006" };
    expect((await addMangaFromExternalSource(form({ source: "mal", mal_id: "13" }))).success).toBe(false);
    expect(getMangaByIdMAL).not.toHaveBeenCalled();
    expect(state.inserted).toHaveLength(0);
  });

  it("does not announce success when adding the series to the collection fails", async () => {
    state.existingById = { id: "33333333-3333-4333-a333-333333333333" };
    state.saveError = { code: "42501" };
    expect((await addMangaFromExternalSource(form({ source: "db", manga_id: state.existingById.id }))).success).toBe(false);
  });
  it("refuses a visitor who is not signed in, before any lookup or write", async () => {
    state.user = null;
    const res = await addMangaFromExternalSource(form({ source: "mal", mal_id: "13" }));
    expect(res).toEqual({ success: false, error: "Non authentifié." });
    expect(getMangaByIdMAL).not.toHaveBeenCalled();
    expect(cacheCoverToStorage).not.toHaveBeenCalled();
    expect(state.inserted).toHaveLength(0);
  });

  it("imports a legitimate series from the provider data, ignoring injected fields", async () => {
    const res = await addMangaFromExternalSource(
      form({
        source: "mal",
        mal_id: "13",
        title: "<script>pwned</script>",
        cover_url: "https://169.254.169.254/latest/meta-data/",
        author: "attacker",
      })
    );
    expect(res.success).toBe(true);
    expect(getMangaByIdMAL).toHaveBeenCalledWith(13);
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({ title: "One Piece", author: "Oda Eiichiro", external_ids: { mal_id: 13 } });
    // Only the provider's own cover URL is ever downloaded
    expect(cacheCoverToStorage).toHaveBeenCalledTimes(1);
    expect(cacheCoverToStorage.mock.calls[0][0]).toBe(MAL_META.cover_url);
  });

  it("refuses the old payload that carried a title and a cover URL", async () => {
    const res = await addMangaFromExternalSource(
      form({ title: "Fake series", cover_url: "https://evil.example.com/x.jpg" })
    );
    expect(res).toEqual({ success: false, error: "Données invalides." });
    expect(state.inserted).toHaveLength(0);
    expect(cacheCoverToStorage).not.toHaveBeenCalled();
  });

  it("reuses an existing catalogue entry without spending quota", async () => {
    state.existingByExternal = { id: "22222222-2222-4222-a222-222222222222" };
    const res = await addMangaFromExternalSource(form({ source: "mal", mal_id: "13" }));
    expect(res).toEqual({ success: true, manga_id: "22222222-2222-4222-a222-222222222222" });
    expect(consumeImportQuota).not.toHaveBeenCalled();
    expect(state.inserted).toHaveLength(0);
  });

  it("stops at the per-account quota, before calling the provider", async () => {
    consumeImportQuota.mockResolvedValue(false);
    const res = await addMangaFromExternalSource(form({ source: "mal", mal_id: "13" }));
    expect(res.success).toBe(false);
    expect(consumeImportQuota).toHaveBeenCalledWith(state.user!.id, "import");
    expect(getMangaByIdMAL).not.toHaveBeenCalled();
    expect(state.inserted).toHaveLength(0);
  });

  it("does not create anything when the provider does not know the id", async () => {
    getMangaByIdMAL.mockResolvedValue(null);
    const res = await addMangaFromExternalSource(form({ source: "mal", mal_id: "999999999" }));
    expect(res).toEqual({ success: false, error: "Série introuvable." });
    expect(state.inserted).toHaveLength(0);
  });

  it("refuses an unknown catalogue id", async () => {
    const res = await addMangaFromExternalSource(form({ source: "db", manga_id: "33333333-3333-4333-a333-333333333333" }));
    expect(res).toEqual({ success: false, error: "Série introuvable." });
  });

  it("adds a known catalogue series without any provider call", async () => {
    state.existingById = { id: "33333333-3333-4333-a333-333333333333" };
    const res = await addMangaFromExternalSource(form({ source: "db", manga_id: "33333333-3333-4333-a333-333333333333" }));
    expect(res).toEqual({ success: true, manga_id: "33333333-3333-4333-a333-333333333333" });
    expect(getMangaByIdMAL).not.toHaveBeenCalled();
    expect(state.upserts).toHaveLength(1);
  });
});

describe("lookupIsbn", () => {
  it("does not treat a failed local lookup as an unknown ISBN", async () => {
    state.lookupError = { code: "08006" };
    expect((await lookupIsbn(form({ isbn: "9782723488525" }))).success).toBe(false);
    expect(lookupByIsbn).not.toHaveBeenCalled();
  });

  it("returns a readable error when the provider throws", async () => {
    lookupByIsbn.mockRejectedValue(new Error("network"));
    expect(await lookupIsbn(form({ isbn: "9782723488525" }))).toEqual({ success: false, error: "Le catalogue en ligne ne répond pas. Réessaie plus tard." });
  });
  it("refuses a visitor who is not signed in", async () => {
    state.user = null;
    expect(await lookupIsbn(form({ isbn: "9782723488525" }))).toEqual({ success: false, error: "Non authentifié." });
    expect(lookupByIsbn).not.toHaveBeenCalled();
  });

  it("is rate limited per account", async () => {
    consumeImportQuota.mockResolvedValue(false);
    const res = await lookupIsbn(form({ isbn: "9782723488525" }));
    expect(res.success).toBe(false);
    expect(consumeImportQuota).toHaveBeenCalledWith(state.user!.id, "isbn_lookup");
    expect(lookupByIsbn).not.toHaveBeenCalled();
  });

  it("rejects something that is not an ISBN", async () => {
    expect(await lookupIsbn(form({ isbn: "https://evil.example" }))).toEqual({ success: false, error: "ISBN invalide." });
  });

  it("refuses an entry the shared catalogue does not accept and points to a private entry", async () => {
    getMangaByIdMAL.mockResolvedValue({ refused: "content" });
    const res = await addMangaFromExternalSource(form({ source: "mal", mal_id: "42" }));
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/fiche personnelle/);
    expect(state.inserted).toHaveLength(0);
    expect(cacheCoverToStorage).not.toHaveBeenCalled();
  });

  it("never creates a shared series from a bookstore record it cannot match", async () => {
    lookupByIsbn.mockResolvedValue({ ...MAL_META, source: "google_books", title: "Série inconnue - Tome 3", external_ids: { isbn_13: "9782344000000" } });
    const res = await addMangaFromExternalSource(form({ source: "google_books", isbn: "9782344000000" }));
    expect(res.success).toBe(false);
    expect(state.inserted).toHaveLength(0);
  });
});

describe("a reader under 15", () => {
  const SERIES = "33333333-3333-4333-a333-333333333333";
  const verified = { id: SERIES, created_by: null, audience_min_age: 9, audience_age_source: "cnlj", audience_age_scope: "series" };
  beforeEach(() => {
    state.ageBand = "under_15";
  });

  it("adds a catalogue series whose age is verified", async () => {
    state.existingById = verified;
    expect((await addMangaFromExternalSource(form({ source: "db", manga_id: SERIES }))).success).toBe(true);
  });

  it("is refused a catalogue series without a verified age, whatever the request", async () => {
    state.existingById = { id: SERIES, created_by: null, audience_min_age: null, audience_age_source: null, audience_age_scope: null };
    const res = await addMangaFromExternalSource(form({ source: "db", manga_id: SERIES }));
    expect(res.success).toBe(false);
    expect(state.upserts).toHaveLength(0);
  });

  it("is refused a series verified only for some volumes, or for 15 and over", async () => {
    state.existingById = { ...verified, audience_age_scope: "volume" };
    expect((await addMangaFromExternalSource(form({ source: "db", manga_id: SERIES }))).success).toBe(false);
    state.existingById = { ...verified, audience_min_age: 15 };
    expect((await addMangaFromExternalSource(form({ source: "db", manga_id: SERIES }))).success).toBe(false);
  });

  it("keeps a series already on the shelf, even without a verified age", async () => {
    state.existingById = { id: SERIES, created_by: null, audience_min_age: null, audience_age_source: null, audience_age_scope: null };
    state.onShelf = true;
    expect((await addMangaFromExternalSource(form({ source: "db", manga_id: SERIES }))).success).toBe(true);
  });

  it("never reaches an online provider : refused before the quota and the call", async () => {
    const res = await addMangaFromExternalSource(form({ source: "mal", mal_id: "13" }));
    expect(res.success).toBe(false);
    expect(consumeImportQuota).not.toHaveBeenCalled();
    expect(getMangaByIdMAL).not.toHaveBeenCalled();
    expect(state.inserted).toHaveLength(0);
  });

  it("reuses a catalogue series known by its MyAnimeList id only when allowed", async () => {
    state.existingByExternal = { id: SERIES };
    state.existingById = { id: SERIES, created_by: null, audience_min_age: null, audience_age_source: null, audience_age_scope: null };
    expect((await addMangaFromExternalSource(form({ source: "mal", mal_id: "13" }))).success).toBe(false);
    state.existingById = verified;
    expect((await addMangaFromExternalSource(form({ source: "mal", mal_id: "13" }))).success).toBe(true);
  });

  it("is restricted too while the age question is not answered (fail closed)", async () => {
    state.ageBand = null;
    const res = await addMangaFromExternalSource(form({ source: "mal", mal_id: "13" }));
    expect(res.success).toBe(false);
    expect(getMangaByIdMAL).not.toHaveBeenCalled();
  });

  it("is told to retry, not refused, when the account cannot be checked", async () => {
    state.profileError = true;
    const res = await addMangaFromExternalSource(form({ source: "db", manga_id: SERIES }));
    expect(res).toEqual({ success: false, error: "Impossible de vérifier ton compte. Réessaie." });
    expect(state.upserts).toHaveLength(0);
  });
});

