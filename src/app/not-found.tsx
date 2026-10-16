import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <p className="text-4xl font-bold" style={{ color: "var(--accent)" }} aria-hidden="true">漫</p>
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p style={{ color: "var(--muted)" }}>Cette page n&apos;existe pas, ou elle n&apos;est pas à toi.</p>
      <Link href="/bibliotheque" className="flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold text-white" style={{ background: "var(--accent)" }}>
        Retour à ma bibliothèque
      </Link>
    </main>
  );
}
