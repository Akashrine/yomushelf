import { describe, it, expect } from "vitest";
import { isAllowedMalEntry, malImportRefusal } from "./mal";

describe("isAllowedMalEntry", () => {
  it("keeps Japanese manga safe for everyone", () => {
    expect(isAllowedMalEntry({ nsfw: "white", media_type: "manga" })).toBe(true);
    expect(isAllowedMalEntry({ nsfw: "white", media_type: "one_shot" })).toBe(true);
  });

  it("refuses adult content, non-comic formats and unknown flags", () => {
    expect(isAllowedMalEntry({ nsfw: "black", media_type: "manga" })).toBe(false);
    expect(isAllowedMalEntry({ nsfw: "gray", media_type: "manga" })).toBe(false);
    expect(isAllowedMalEntry({ nsfw: "white", media_type: "manhwa" })).toBe(true); // origin is not a reason
    expect(isAllowedMalEntry({ nsfw: "white", media_type: "light_novel" })).toBe(false);
    expect(isAllowedMalEntry({ nsfw: "white", media_type: "doujinshi" })).toBe(false);
    expect(isAllowedMalEntry({})).toBe(false);
  });
});

describe("malImportRefusal", () => {
  it("gives a distinct reason for type and content, never for origin", () => {
    expect(malImportRefusal({ nsfw: "white", media_type: "light_novel" })).toBe("type");
    expect(malImportRefusal({ nsfw: "white", media_type: "doujinshi" })).toBe("type");
    expect(malImportRefusal({ nsfw: "white", media_type: "manhwa" })).toBeNull();
    expect(malImportRefusal({ nsfw: "white", media_type: "manhua" })).toBeNull();
    expect(malImportRefusal({ nsfw: "gray", media_type: "manga" })).toBe("content");
    expect(malImportRefusal({ media_type: "manga" })).toBe("content");
    expect(malImportRefusal({ nsfw: "white", media_type: "manga" })).toBeNull();
  });
});
