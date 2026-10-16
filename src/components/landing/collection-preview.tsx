import Image from "next/image";

const OWNED = new Set([1, 2, 3, 4, 5, 6, 7, 9, 10]);
const VOLUMES = Array.from({ length: 12 }, (_, i) => i + 1);

// Illustration of a series on the shelf : owned volumes lit, missing ones
// dashed, the gap called out like in the app.
export function CollectionPreview({ cover }: { cover?: { title: string; cover_url: string } }) {
  return (
    <div className="flex flex-col gap-5 rounded-xl p-5 sm:p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-4">
        {cover && (
          <div className="relative aspect-2/3 w-14 shrink-0 overflow-hidden rounded-md" style={{ border: "1px solid var(--border)" }}>
            <Image src={cover.cover_url} alt="" fill sizes="56px" className="object-cover" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{cover?.title ?? "Sa série"}</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>9 tomes sur 12</p>
        </div>
      </div>
      <ul className="grid grid-cols-6 gap-2" aria-label="Tomes de la série">
        {VOLUMES.map((n) => {
          const owned = OWNED.has(n);
          return (
            <li
              key={n}
              className="flex aspect-2/3 items-center justify-center rounded-md text-sm font-semibold"
              style={
                owned
                  ? { background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--foreground)" }
                  : { border: "1px dashed var(--muted)", color: "var(--muted)" }
              }
            >
              <span className="sr-only">{owned ? `Tome ${n}, possédé` : `Tome ${n}, manquant`}</span>
              <span aria-hidden="true">{n}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Il manque le <span style={{ color: "var(--gold)" }}>tome 8</span>.
      </p>
    </div>
  );
}
