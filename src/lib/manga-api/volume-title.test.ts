import { describe, it, expect } from "vitest";
import { splitVolumeTitle } from "./volume-title";

describe("splitVolumeTitle", () => {
  it.each([
    ["One Piece - Tome 12", "One Piece", 12],
    ["One Piece T12", "One Piece", 12],
    ["Naruto, tome 5", "Naruto", 5],
    ["Spy x Family Vol. 3", "Spy x Family", 3],
    ["Dragon Ball (édition originale) - Tome 1", "Dragon Ball (édition originale)", 1],
    ["Blue Lock 7", "Blue Lock", 7],
    ["Frieren", "Frieren", null],
    ["Kaiju n°8", "Kaiju n°8", null],
    ["Kaiju n°8 - Tome 3", "Kaiju n°8", 3],
  ])("%s", (raw, series, volume) => {
    expect(splitVolumeTitle(raw)).toEqual({ series, volume });
  });
});
