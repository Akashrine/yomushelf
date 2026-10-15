// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-a111-111111111111" } as { id: string } | null,
  volume: null as Record<string, unknown> | null,
  error: null as { code: string } | null,
  writes: 0,
  filters: [] as [string, unknown][],
}));
const readings = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/collection/readings-db", () => ({
  getReadingState: readings.get,
  setReadingState: readings.set,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => {
      let patch: Record<string, unknown> | undefined;
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { state.filters.push([key, value]); return query; },
        maybeSingle: async () => {
          if (state.error) return { data: null, error: state.error };
          if (patch && state.volume) { state.writes++; state.volume = { ...state.volume, ...patch }; }
          return { data: state.volume, error: null };
        },
        insert: async (row: Record<string, unknown>) => {
          if (state.error) return { error: state.error };
          if (state.volume) return { error: { code: "23505" } };
          state.writes++; state.volume = row;
          return { error: null };
        },
        update: (row: Record<string, unknown>) => { patch = row; return query; },
      };
      return query;
    },
  }),
}));

import { upsertUserVolume } from "./actions";

const manga = "22222222-2222-4222-a222-222222222222";
function form(fields: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries({ manga_id: manga, volume_number: "3", ...fields })) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  state.user = { id: "11111111-1111-4111-a111-111111111111" };
  state.volume = null;
  state.error = null;
  state.writes = 0;
  state.filters = [];
  readings.get.mockReset().mockResolvedValue(null);
  readings.set.mockReset().mockResolvedValue({ error: null });
});

describe("volume additions and explicit edits", () => {
  it("preserves all existing details and reading when the add form submits a duplicate", async () => {
    const existing = { price_eur: 4.5, acquisition_type: "gift", acquired_at: "2020-01-01" };
    state.volume = { ...existing };
    const result = await upsertUserVolume(form({ price_eur: "", acquisition_type: "", reading: "none" }));
    expect(result.success).toBe(false);
    expect(state.volume).toEqual(existing);
    expect(state.writes).toBe(0);
    expect(readings.set).not.toHaveBeenCalled();
  });

  it("also refuses to replace a duplicate with newly supplied values", async () => {
    state.volume = { price_eur: 4.5, acquisition_type: "gift" };
    expect((await upsertUserVolume(form({ price_eur: "8", acquisition_type: "bought" }))).success).toBe(false);
    expect(state.volume).toEqual({ price_eur: 4.5, acquisition_type: "gift" });
  });

  it("adds a new volume using the signed-in account and its entered details", async () => {
    expect(await upsertUserVolume(form({ price_eur: "3,50", acquisition_type: "bought", user_id: "someone-else" }))).toEqual({ success: true });
    expect(state.volume).toMatchObject({ user_id: state.user!.id, manga_id: manga, volume_number: 3, price_eur: 3.5, acquisition_type: "bought" });
  });

  it("allows an explicit edit to clear details, preserving the acquisition date and reading", async () => {
    state.volume = { price_eur: 4.5, acquisition_type: "gift", acquired_at: "2020-01-01" };
    expect(await upsertUserVolume(form({ mode: "edit", price_eur: "", acquisition_type: "" }))).toEqual({ success: true });
    expect(state.volume).toMatchObject({ price_eur: null, acquisition_type: null, acquired_at: "2020-01-01" });
    expect(state.filters).toEqual(expect.arrayContaining([["user_id", state.user!.id], ["manga_id", manga], ["volume_number", 3]]));
    expect(readings.set).not.toHaveBeenCalled();
  });

  it("does not recreate a volume removed while its editing form was open", async () => {
    expect((await upsertUserVolume(form({ mode: "edit" }))).success).toBe(false);
    expect(state.volume).toBeNull();
  });

  it("does not write when signed out", async () => {
    state.user = null;
    expect(await upsertUserVolume(form())).toEqual({ success: false, error: "Non authentifié." });
    expect(state.writes).toBe(0);
  });

  it("returns an error when the database refuses the addition", async () => {
    state.error = { code: "42501" };
    expect((await upsertUserVolume(form())).success).toBe(false);
    expect(state.volume).toBeNull();
  });

  it("reports a partial save honestly if reading verification fails", async () => {
    readings.get.mockRejectedValue(new Error("unavailable"));
    const result = await upsertUserVolume(form({ reading: "read_earlier" }));
    expect(result).toMatchObject({ success: false, error: expect.stringContaining("Tome enregistré") });
    expect(state.volume).not.toBeNull();
    expect(readings.set).not.toHaveBeenCalled();
  });
});
