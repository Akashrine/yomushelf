import Link from "next/link";

const INK = "var(--ink, #12151d)";
const POP = "var(--pop, #ffd23f)";

export default function NotFound() {
  return (
    <main className="manga-halftone flex min-h-screen items-center justify-center px-6 py-12" style={{ color: INK }}>
      <div className="flex w-full max-w-md flex-col gap-8">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
          style={{ background: INK, color: POP }}
          aria-hidden="true"
        >
          漫
        </span>
        {/* Speech bubble */}
        <div className="manga-panel relative flex flex-col gap-3 rounded-3xl px-6 pb-6 pt-9">
          <span
            aria-hidden="true"
            className="manga-sticker font-display absolute -top-5 left-5 rounded-xl px-3 py-0.5 text-2xl tracking-wide"
            style={{ background: POP, color: INK, transform: "rotate(-6deg)", fontWeight: 400 }}
          >
            404 !
          </span>
          <h1 className="text-4xl">Page introuvable</h1>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            Cette page n&apos;existe pas, ou elle n&apos;est pas à toi.
          </p>
          <span
            aria-hidden="true"
            className="absolute -bottom-3.75 left-12 h-6 w-6 rotate-45"
            style={{ background: "var(--surface)", borderRight: `3px solid ${INK}`, borderBottom: `3px solid ${INK}` }}
          />
        </div>
        <Link
          href="/bibliotheque"
          className="manga-button flex min-h-14 items-center justify-center rounded-2xl px-6 text-lg font-bold"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          Retour à ma bibliothèque
        </Link>
      </div>
    </main>
  );
}
