// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────
const state = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-a111-111111111111" } as { id: string } | null,
  existingByExternal: null as { id: string } | null,
  existingById: null as { id: string } | null,
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
    limit: () => q,
    maybeSingle: async () => ({
      data: table === "mangas" ? (filter === "contains" ? state.existingByExternal : state.existingById) : null,
      error: state.lookupError,
    }),
    upsert: async (row: Record<string, unknown>) => {
      state.upserts.push(row);
      return { error: state.saveError };
    },
    insert: async () => ({ error: null }),
  });
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => query(table),
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
});
