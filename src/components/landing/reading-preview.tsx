import Image from "next/image";

// Illustration of reading progress : last volume read, the next one.
export function ReadingPreview({ cover }: { cover?: { title: string; cover_url: string } }) {
  const read = 7;
  const total = 9;
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
          <p className="text-sm" style={{ color: "var(--muted)" }}>Lu jusqu&apos;au tome {read}</p>
        </div>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ background: "var(--surface-raised)" }}
        role="img"
        aria-label={`${read} tomes lus sur ${total}`}
      >
        <div className="h-full rounded-full" style={{ width: `${(read / total) * 100}%`, background: "var(--read)" }} />
      </div>
      <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "var(--surface-raised)" }}>
        <span className="text-sm" style={{ color: "var(--muted)" }}>Prochain à lire</span>
        <span className="font-semibold">Tome {read + 1}</span>
      </div>
    </div>
  );
}
