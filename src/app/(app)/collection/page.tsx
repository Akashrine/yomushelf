import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings, getSeriesMeta } from "@/lib/supabase/queries";
import { buildShelves } from "@/lib/collection/reading";
import { LibraryShell } from "@/components/bibliotheque/library-shell";
import { ReaderHome } from "@/components/collection/reader-home";

export const metadata: Metadata = { title: "Accueil" };

// Reader home. Everything shown here comes from the server render :
// after a reading is saved the page is refreshed, never guessed.
export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [volumes, readings, series, { data: profile }] = await Promise.all([
    getOwnedVolumes(supabase, user.id),
    getReadings(supabase, user.id),
    getSeriesMeta(supabase, user.id),
    supabase.from("profiles").select("username, avatar_initials").eq("id", user.id).single(),
  ]);

  const shelves = buildShelves(series, volumes, readings);
  const name = profile?.username;

  return (
    <LibraryShell
      username={profile?.username ?? null}
      avatarInitials={profile?.avatar_initials ?? "?"}
      active="collection"
    >
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">{name ? `Salut ${name} !` : "Salut !"}</h1>
      <div className="mx-auto max-w-xl">
        <ReaderHome shelves={shelves} />
      </div>
    </LibraryShell>
  );
}
