// Deterministic spine colors : warm = read, lavender = waiting to be read.
// Each series keeps the same tint everywhere so a pile looks like real books.

const READ_TINTS = ["#ff6a3d", "#f2453a", "#ff8a4c", "#ffad4d", "#e8553e", "#ff7f66"];
const UNREAD_TINTS = ["#9b8cff", "#8676f2", "#b1a6ff", "#7d6ef0", "#a99cff", "#9386f8"];

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function spineColor(mangaId: string, read: boolean): string {
  const palette = read ? READ_TINTS : UNREAD_TINTS;
  return palette[hashString(mangaId) % palette.length];
}

// Stable pseudo-random in [0, 1) for one volume, used to jitter the pile.
export function spineJitter(mangaId: string, volume: number): number {
  return (hashString(`${mangaId}:${volume}`) % 1000) / 1000;
}
