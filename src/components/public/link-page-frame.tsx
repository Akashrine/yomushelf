import Link from "next/link";

// Pages a parent opens from an email link (consent, family list) : the
// logo, then one panel.
export function LinkPageFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="manga-halftone relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-16" style={{ color: "var(--ink)" }}>
      <div className="relative flex w-full max-w-md flex-col gap-8">
        <Link href="/" className="flex min-h-11 items-center justify-center gap-2 font-display text-3xl tracking-wide">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ background: "var(--ink)", color: "var(--pop)" }} aria-hidden="true">
            漫
          </span>
          Yomushelf
        </Link>
        <div className="manga-panel flex flex-col gap-5 rounded-3xl p-6 text-[0.95rem] font-medium leading-relaxed sm:p-7">
          <h1 className="text-4xl leading-none">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
