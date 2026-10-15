import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getOwnedVolumes, getReadings, getSeriesMeta, getUserCollection } from "./queries";
import { countVolumesRead, getReadingState } from "@/lib/collection/readings-db";

function client(result: { data: unknown; error: unknown; count?: number | null }) {
  const query = {
    select: () => query, eq: () => query, order: () => query,
    maybeSingle: async () => result,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(resolve(result)),
  };
  return { from: () => query } as unknown as SupabaseClient<Database>;
}

const loaders = [
  ["volumes", (db: SupabaseClient<Database>) => getOwnedVolumes(db, "user")],
  ["readings", (db: SupabaseClient<Database>) => getReadings(db, "user")],
  ["series", (db: SupabaseClient<Database>) => getSeriesMeta(db, "user")],
  ["one collection", (db: SupabaseClient<Database>) => getUserCollection(db, "user", "manga")],
  ["one reading", (db: SupabaseClient<Database>) => getReadingState(db, { userId: "user", mangaId: "manga", volumeNumber: 1 })],
  ["reading count", (db: SupabaseClient<Database>) => countVolumesRead(db, "user")],
] as const;

describe("collection load failures", () => {
  it.each(loaders)("does not present a failed %s query as empty data", async (_name, load) => {
    const db = client({ data: null, count: null, error: { message: "internal database details" } });
    await expect(load(db)).rejects.toThrow();
    await expect(load(db)).rejects.not.toThrow("internal database details");
  });

  it("still accepts a genuinely empty collection", async () => {
    const db = client({ data: [], error: null, count: 0 });
    expect(await getOwnedVolumes(db, "user")).toEqual([]);
    expect(await getReadings(db, "user")).toEqual([]);
    expect(await getSeriesMeta(db, "user")).toEqual([]);
    expect(await countVolumesRead(db, "user")).toBe(0);
  });

  it("still accepts an absent reading", async () => {
    expect(await getReadingState(client({ data: null, error: null }), { userId: "user", mangaId: "manga", volumeNumber: 1 })).toBeNull();
  });
});
