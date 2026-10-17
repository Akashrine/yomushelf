// "Tu as aussi les tomes 1 à 28 ?" : after a tap on volume n, the run of
// unmarked volumes just below it, down to the nearest marked one (or 1).
// null when volume n - 1 is already marked or n is the first volume.
export function gapBelow(marked: Iterable<number>, n: number): { from: number; to: number } | null {
  const set = new Set(marked);
  if (n <= 1 || set.has(n - 1)) return null;
  let from = n - 1;
  while (from > 1 && !set.has(from - 1)) from--;
  return { from, to: n - 1 };
}

export function rangeLabel({ from, to }: { from: number; to: number }): string {
  return from === to ? `le tome ${from}` : `les tomes ${from} à ${to}`;
}
