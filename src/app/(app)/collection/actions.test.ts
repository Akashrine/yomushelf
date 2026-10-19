// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const reading = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), count: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: "user" } } }) } }),
}));
vi.mock("@/lib/collection/readings-db", () => ({
  getReadingState: reading.get, setReadingState: reading.set, countVolumesRead: reading.count,
}));
import { saveReading, restoreReading } from "./actions";

const ref = { manga_id: "22222222-2222-4222-a222-222222222222", volume_number: 1 };
const previous = { status: "reading" as const, finished_on: null };
beforeEach(() => {
  reading.get.mockReset().mockResolvedValue(previous);
  reading.set.mockReset().mockResolvedValue({ error: null });
  reading.count.mockReset().mockResolvedValue(1);
});

it("does not mutate a reading when its previous state cannot be loaded", async () => {
  reading.get.mockRejectedValue(new Error("unavailable"));
  await expect(saveReading({ ...ref, intent: "clear" })).rejects.toThrow();
  expect(reading.set).not.toHaveBeenCalled();
});

it("keeps a confirmed save and its undo state when the count is unavailable", async () => {
  reading.count.mockRejectedValue(new Error("unavailable"));
  expect(await saveReading({ ...ref, intent: "finish" })).toEqual({
    success: true, changed: true, previous, volumesRead: null,
  });
  expect(reading.set).toHaveBeenCalledTimes(1);
});

it("also confirms an undo without inventing a zero count", async () => {
  reading.count.mockRejectedValue(new Error("unavailable"));
  expect(await restoreReading({ ...ref, previous: null })).toMatchObject({ success: true, volumesRead: null });
  expect(reading.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: "user" }), null);
});
