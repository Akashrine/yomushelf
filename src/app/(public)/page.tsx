import type { Metadata } from "next";
import { Suspense } from "react";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { WaitlistCount } from "@/components/landing/waitlist-count";
import { CoverMosaic } from "@/components/landing/cover-mosaic";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Yomushelf — Ta collection manga",
  description:
    "L'app pour suivre ta collection physique de mangas : ce que tu possèdes, où tu en es, combien tu as dépensé.",
};

// ─── Feature cards ────────────────────────────────────────────
const FEATURES = [
  {
    icon: "📚",
    title: "Ta bibliothèque, enfin claire",
    body: "Tous tes tomes au même endroit. Vois en un coup d'œil ce que tu as, ce qu'il te manque, et où tu en es dans chaque série.",
  },
  {
    icon: "📷",
    title: "Ajoute un tome en 2 secondes",
    body: "Scanne le code-barres avec ton téléphone. L'app reconnaît le tome et l'ajoute à ta collection sans friction.",
  },
  {
    icon: "💶",
    title: "Ton budget manga, transparent",
    body: "Suis combien tu as investi dans ta passion. Anticipe les achats à venir. Pas de mauvaise surprise à la caisse.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--background)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: "var(--accent)" }}
          >
            漫
          </span>
          <span className="text-base font-semibold tracking-tight">Yomushelf</span>
        </div>
        <a
          href="/login"
          className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          style={{ color: "var(--muted)" }}
        >
          Connexion
        </a>
      </header>

      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-6 pt-16 pb-24 lg:pt-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: text + form */}
              <div className="flex flex-col gap-8">
                {/* Badge */}
                <div className="inline-flex w-fit">
                  <span
                    className="text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    Bientôt disponible
                  </span>
                </div>

                {/* Headline */}
                <div className="flex flex-col gap-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight">
                    Ta collection manga,
                    <br />
                    <span style={{ color: "var(--accent)" }}>enfin maîtrisée.</span>
                  </h1>
                  <p
                    className="text-lg leading-relaxed max-w-md"
                    style={{ color: "var(--muted)" }}
                  >
                    40 sorties par semaine. Des séries de 40 tomes. Un budget qui fout le camp.
                    Yomushelf te remet aux commandes.
                  </p>
                </div>

                {/* Waitlist form */}
                <div className="flex flex-col gap-3 max-w-md">
                  <WaitlistForm source="landing_hero" />
                  <Suspense fallback={null}>
                    <WaitlistCount />
                  </Suspense>
                </div>
              </div>

              {/* Right: cover mosaic */}
              <div className="hidden lg:block h-[520px] overflow-hidden">
                <CoverMosaic />
              </div>
            </div>
          </div>

          {/* Gradient blob */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ background: "var(--accent)" }}
          />
        </section>

        {/* ── FEATURES ── */}
        <section
          className="py-24"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-4 mb-14 max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Ce que Yomushelf fait pour toi
              </h2>
              <p className="text-base" style={{ color: "var(--muted)" }}>
                Conçu pour les collectionneurs qui achètent en librairie et jonglent
                avec plusieurs séries en parallèle.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <article
                  key={f.title}
                  className="flex flex-col gap-4 rounded-xl p-6"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="font-semibold text-base leading-snug">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    {f.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── PAIN POINTS ── */}
        <section
          className="py-24"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
        >
          <div className="mx-auto max-w-3xl px-6 text-center flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Tu te reconnais ?
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              {[
                "Tu achètes un tome en double parce que tu ne savais plus ce que tu avais.",
                "Tu ne sais plus où tu en es dans ta lecture depuis 6 mois.",
                "Ton budget manga est un mystère total.",
                "Tu rates des sorties parce que tu perds le fil des séries.",
              ].map((pain) => (
                <div
                  key={pain}
                  className="flex gap-3 items-start rounded-xl p-4"
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span style={{ color: "var(--accent)" }} className="mt-0.5 text-sm">✕</span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    {pain}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-base font-medium">
              Yomushelf règle ça.{" "}
              <span style={{ color: "var(--accent)" }}>Simplement.</span>
            </p>
          </div>
        </section>

        {/* ── CTA FOOTER ── */}
        <section
          className="py-24"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="mx-auto max-w-xl px-6 text-center flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Sois parmi les premiers.
              </h2>
              <p className="text-base" style={{ color: "var(--muted)" }}>
                L'accès est limité au lancement. Inscris-toi maintenant,
                on te prévient dès que c'est ouvert.
              </p>
            </div>
            <WaitlistForm source="landing_footer" />
            <Suspense fallback={null}>
              <WaitlistCount />
            </Suspense>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer
        className="px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span style={{ color: "var(--accent)" }}>漫</span>
          <span>Yomushelf</span>
        </div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Fait avec soin pour les collectionneurs FR · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
