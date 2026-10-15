import { formatEur } from "@/lib/collection/value";
import type { VolumeSavedEvent } from "@/components/collection/volume-sheet";

export type CelebrationContent = { message: string; sub?: string };

// What to cheer about after a volume was saved. null = nothing to celebrate.
export function celebrationFor(event: VolumeSavedEvent): CelebrationContent | null {
  switch (event.kind) {
    case "added": {
      const message = `Tome ${event.volume} ajouté !`;
      if (event.acquisition === "borrowed") return { message, sub: "Bonne lecture !" };
      if (event.price == null) return { message, sub: "Pense à noter son prix" };
      if (event.acquisition === "gift") {
        return { message, sub: `Un cadeau qui vaut ${formatEur(event.price)}` };
      }
      return { message, sub: `+${formatEur(event.price)} dans ta collection` };
    }
    case "read":
      return { message: `Tome ${event.volume} lu, bravo !`, sub: "Un de moins qui dort" };
    default:
      return null;
  }
}
