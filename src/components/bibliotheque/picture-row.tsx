"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AppIcon } from "@/components/app/app-icon";

// "En images" : the series' illustrations in a row ; a tap shows one full
// screen, with big arrows to flip through them.
export function PictureRow({ title, pictures }: { title: string; pictures: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open != null && !dialog.open) dialog.showModal();
    if (open == null && dialog.open) dialog.close();
  }, [open]);

  const step = (d: number) => setOpen((i) => (i == null ? i : (i + d + pictures.length) % pictures.length));

  return (
    <section aria-labelledby="h-pictures" className="flex flex-col gap-3">
      <h2 id="h-pictures" className="text-2xl sm:text-3xl">En images</h2>
      <ul className="no-scrollbar -mx-4 flex snap-x scroll-pl-4 gap-4 overflow-x-auto px-4 pb-3 pt-1 sm:-mx-6 sm:scroll-pl-6 sm:px-6">
        {pictures.map((src, i) => (
          <li key={src} className="w-36 shrink-0 snap-start sm:w-44">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Voir l'image ${i + 1} sur ${pictures.length} de ${title}`}
              className="manga-panel-sm manga-press relative block w-full overflow-hidden rounded-xl"
              style={{ aspectRatio: "2/3", background: "var(--surface-raised)" }}
            >
              <Image src={src} alt="" fill sizes="(min-width: 640px) 176px, 144px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={ref}
        onClose={() => setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        aria-label={`Images de ${title}`}
        className="m-0 h-dvh max-h-none w-full max-w-none p-0 backdrop:bg-black"
        style={{ background: "var(--ink)" }}
      >
        {open != null && (
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
              {/* Page counter as a sticker : yellow on ink, ink text */}
              <p className="rounded-xl px-3 py-1 text-base font-bold tabular-nums" style={{ background: "var(--pop)", color: "var(--ink)", border: "2px solid var(--surface)" }}>
                {open + 1} / {pictures.length}
              </p>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Fermer"
                className="manga-press flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "var(--surface)", color: "var(--ink)", border: "2px solid var(--surface)" }}
              >
                <AppIcon name="close" size={22} />
              </button>
            </div>
            <div className="relative m-4 flex-1">
              <Image src={pictures[open]} alt={`${title}, image ${open + 1}`} fill sizes="100vw" className="object-contain" />
            </div>
            {pictures.length > 1 && (
              <div className="grid grid-cols-2 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button type="button" onClick={() => step(-1)} aria-label="Image précédente" className="manga-press flex min-h-14 items-center justify-center rounded-2xl" style={{ background: "var(--surface)", color: "var(--ink)", border: "3px solid var(--surface)" }}>
                  <AppIcon name="arrow-left" size={24} />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Image suivante" className="manga-press flex min-h-14 items-center justify-center rounded-2xl" style={{ background: "var(--surface)", color: "var(--ink)", border: "3px solid var(--surface)" }}>
                  <span className="rotate-180"><AppIcon name="arrow-left" size={24} /></span>
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </section>
  );
}
