// The taste map's territories : six families of genres a child can read
// at a glance. Every catalogue genre belongs to exactly one territory.

export type TerritoryKey = "aventure" | "imaginaire" | "frissons" | "sport" | "quotidien" | "emotions";

export type Territory = {
  key: TerritoryKey;
  label: string;
  hint: string; // one plain line : what you find there
  genres: string[];
};

export const TERRITORIES: Territory[] = [
  { key: "aventure", label: "Aventure et action", hint: "Voyages, combats, quêtes", genres: ["action", "aventure"] },
  { key: "imaginaire", label: "Imaginaire", hint: "Magie, esprits, futur", genres: ["fantasy", "surnaturel", "science-fiction"] },
  { key: "frissons", label: "Mystère et frissons", hint: "Enquêtes, peur, suspense", genres: ["mystere", "horreur", "psychologique"] },
  { key: "sport", label: "Sport", hint: "Équipes, matchs, dépassement", genres: ["sport"] },
  { key: "quotidien", label: "Rire et quotidien", hint: "Humour, vie de tous les jours, cuisine", genres: ["comedie", "tranche-de-vie", "cuisine"] },
  { key: "emotions", label: "Émotions et histoire", hint: "Drames, amours, autres époques", genres: ["drame", "romance", "historique"] },
];

const BY_GENRE = new Map<string, TerritoryKey>(TERRITORIES.flatMap((t) => t.genres.map((g) => [g, t.key] as const)));

export function territoryOfGenre(genre: string): TerritoryKey | null {
  return BY_GENRE.get(genre) ?? null;
}

export function territoriesOf(genres: string[]): TerritoryKey[] {
  return [...new Set(genres.map(territoryOfGenre).filter((t): t is TerritoryKey => t != null))];
}

export function territoryLabel(key: TerritoryKey): string {
  return TERRITORIES.find((t) => t.key === key)?.label ?? key;
}
