// A bookstore record names a volume ("One Piece - Tome 12"), not a series.
// Splits it into the series title and the volume number, when written.
// Heuristic : callers also try the full title ("Kaiju No. 8" is a title).

const VOLUME_MARKER =
  /[\s,.:\-–—(]*\b(?:tome|tomes|t|vol|volume)\s*\.?\s*(\d{1,3})\b\)?\s*$/i;
const TRAILING_NUMBER = /[\s,\-–—:]+(\d{1,3})\s*$/;

export function splitVolumeTitle(raw: string): { series: string; volume: number | null } {
  const title = raw.replace(/\s+/g, " ").trim();
  const m = title.match(VOLUME_MARKER) ?? title.match(TRAILING_NUMBER);
  if (!m || m.index === undefined) return { series: title, volume: null };
  const series = title.slice(0, m.index).replace(/[\s,.:\-–—(]+$/, "").trim();
  const volume = Number(m[1]);
  if (!series || !Number.isInteger(volume) || volume < 1) return { series: title, volume: null };
  return { series, volume };
}
