// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { lookupByIsbn } from "./google-books";

afterEach(() => vi.unstubAllGlobals());
it("distinguishes provider failure from an ISBN that is not found", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
  await expect(lookupByIsbn("9782723488525")).rejects.toThrow("Google Books unavailable");
});
it("returns no match when the provider successfully finds no book", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ totalItems: 0 })));
  expect(await lookupByIsbn("9782723488525")).toBeNull();
});
