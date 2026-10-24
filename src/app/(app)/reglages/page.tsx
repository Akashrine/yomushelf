import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/session";
import { AppShell } from "@/components/app/app-shell";
import { Settings } from "@/components/reglages/settings";

export const metadata: Metadata = { title: "Réglages" };

// Behind the gear in the header : the account, nothing else.
export default async function ReglagesPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("username, avatar_initials").eq("id", user.id).single();

  return (
    <AppShell active="reglages" avatarInitials={profile?.avatar_initials ?? undefined}>
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl sm:text-5xl" style={{ color: "var(--ink)" }}>Réglages</h1>
        <Settings username={profile?.username ?? null} email={user.email ?? ""} />
        <p className="flex flex-wrap gap-x-4 text-sm font-bold">
          <Link href="/confidentialite" className="inline-flex min-h-11 items-center underline decoration-2 underline-offset-4" style={{ color: "var(--ink)" }}>
            Confidentialité
          </Link>
          <Link href="/mentions-legales" className="inline-flex min-h-11 items-center underline decoration-2 underline-offset-4" style={{ color: "var(--ink)" }}>
            Mentions légales
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
