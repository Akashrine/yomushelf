import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accountGate, serviceClient } from "@/lib/server/consent";
import { CONSENT_DAYS, HEARD_FROM, frenchDate, maskEmail, type GateStep } from "@/lib/account/gate";
import { chooseAgeBand, chooseHeardFrom, restartAge } from "./actions";
import { signOut } from "@/app/(public)/auth/actions";
import { ParentEmailForm } from "@/components/bienvenue/parent-email-form";
import { ResendForm } from "@/components/bienvenue/resend-form";

// One title per step : the route announcer reads it to screen readers.
const TITLES: Record<GateStep, string> = {
  age: "Ton âge",
  source: "Comment tu as connu Yomushelf",
  parent: "Accord d'un parent",
  pending: "On attend ton parent",
  ready: "Bienvenue",
};

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const step = user ? await accountGate(supabase, user.id) : "age";
  return { title: TITLES[step], robots: { index: false } };
}

const CHOICE =
  "manga-panel-sm manga-press flex min-h-14 w-full items-center justify-center rounded-2xl px-4 text-center text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const LINK = "inline-flex min-h-11 items-center text-sm font-semibold underline decoration-2 underline-offset-4";

// Asked once, after sign-up (email or Google) : age, source, then a
// parent's consent under 15. The app layout sends here until it is done.
export default async function BienvenuePage({ searchParams }: { searchParams: Promise<{ changer?: string; envoye?: string; verifie?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const step = await accountGate(supabase, user.id);
  if (step === "ready") redirect("/bibliotheque");
  const params = await searchParams;

  let pending: { email: string; deadline: string } | null = null;
  if (step === "pending") {
    const service = serviceClient();
    const [{ data: consent }, { data: profile }] = await Promise.all([
      service.from("parental_consents").select("parent_email").eq("user_id", user.id).single(),
      service.from("profiles").select("age_band_set_at").eq("id", user.id).single(),
    ]);
    const start = profile?.age_band_set_at ? new Date(profile.age_band_set_at) : new Date();
    pending = {
      email: maskEmail(consent?.parent_email ?? ""),
      deadline: frenchDate(new Date(start.getTime() + CONSENT_DAYS * 86_400_000)),
    };
  }
  const showParentForm = step === "parent" || (step === "pending" && params.changer === "1");

  return (
    <main className="manga-halftone relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-16" style={{ color: "var(--ink)" }}>
      <span aria-hidden="true" className="manga-speedlines pointer-events-none absolute inset-0" />
      <div className="relative flex w-full max-w-sm flex-col gap-8">
        <p className="flex items-center justify-center gap-2 font-display text-3xl tracking-wide">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ background: "var(--ink)", color: "var(--pop)" }} aria-hidden="true">
            漫
          </span>
          Yomushelf
        </p>

        <div className="manga-panel relative flex flex-col gap-6 rounded-3xl p-6 pt-8 sm:p-7 sm:pt-9">
          {step === "age" && (
            <>
              <Heading title="Tu as quel âge ?" text="Un parent crée le compte pour son enfant ? Réponds pour l'enfant." />
              <form action={chooseAgeBand} className="flex flex-col gap-3">
                <button type="submit" name="band" value="under_15" className={CHOICE} style={{ background: "var(--pop)", color: "var(--ink)" }}>
                  Moins de 15 ans
                </button>
                <button type="submit" name="band" value="15_plus" className={CHOICE} style={{ background: "var(--surface)", color: "var(--ink)" }}>
                  15 ans ou plus
                </button>
              </form>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Pas de date de naissance. Avant 15 ans, on demandera l&apos;accord d&apos;un parent.
              </p>
            </>
          )}

          {step === "source" && (
            <>
              <Heading title="Comment tu as connu Yomushelf ?" text="Une seule réponse, la première qui te vient." />
              <form action={chooseHeardFrom} className="grid grid-cols-2 gap-2.5">
                {HEARD_FROM.map((h) => (
                  <button
                    key={h.key}
                    type="submit"
                    name="answer"
                    value={h.key}
                    className={`${CHOICE} text-sm ${h.key === "autre" ? "col-span-2" : ""}`}
                    style={{ background: "var(--surface)", color: "var(--ink)" }}
                  >
                    {h.label}
                  </button>
                ))}
              </form>
            </>
          )}

          {showParentForm && (
            <>
              <Heading
                title="Il faut l'accord d'un parent."
                text="Avant 15 ans, la loi demande qu'un parent dise oui. Écris son email : on lui envoie un lien."
              />
              <ParentEmailForm />
              {step === "pending" && (
                <a href="/bienvenue" className={LINK}>
                  Annuler, garder l&apos;adresse d&apos;avant
                </a>
              )}
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Ton parent est à côté de toi ? Il peut confirmer tout de suite depuis son téléphone.
              </p>
            </>
          )}

          {step === "pending" && !showParentForm && pending && (
            <>
              <Heading
                title="On attend ton parent."
                text={`Email envoyé à ${pending.email}. Dès que ton parent a dit oui, ta bibliothèque s'ouvre.`}
              />
              {params.verifie === "1" && (
                <p role="status" className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: "var(--surface)", color: "var(--ink)", border: "2px solid var(--ink)" }}>
                  Pas encore d&apos;accord. Demande à ton parent d&apos;ouvrir l&apos;email et de toucher « Je donne mon accord ».
                </p>
              )}
              {params.envoye === "1" && (
                <p role="status" className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: "var(--pop)", color: "var(--ink)", border: "2px solid var(--ink)" }}>
                  C&apos;est parti. Pense à regarder les courriers indésirables.
                </p>
              )}
              {/* A full page load : the gate is read again on the server. */}
              <a href="/bienvenue?verifie=1" className={`manga-button ${CHOICE}`} style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
                C&apos;est bon, j&apos;ai l&apos;accord
              </a>
              <ResendForm />
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Sans accord avant le {pending.deadline}, le compte et ses données seront supprimés.
              </p>
              <a href="/bienvenue?changer=1" className={LINK}>
                Changer l&apos;adresse du parent
              </a>
            </>
          )}

          {(step === "parent" || step === "pending") && (
            <form action={restartAge}>
              <button type="submit" className={LINK}>
                Mauvais âge ? Corriger
              </button>
            </form>
          )}
        </div>

        <form action={signOut} className="flex justify-center">
          <button type="submit" className={LINK}>
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-4xl leading-none">{title}</h1>
      <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
        {text}
      </p>
    </div>
  );
}
