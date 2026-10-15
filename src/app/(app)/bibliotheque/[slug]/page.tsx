import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getReadings } from "@/lib/supabase/queries";
import { SerieDetail } from "@/components/bibliotheque/serie-detail";

export default async function SeriePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: manga } = await supabase
    .from("mangas")
    .select("id, title, author, publisher_fr, total_volumes, status, genre_primary, cover_url")
    .eq("id", slug)
    .single();

  if (!manga) notFound();

  const [volumes, readings, { data: wishes }] = await Promise.all([
    getOwnedVolumes(supabase, user.id, manga.id),
    getReadings(supabase, user.id, manga.id),
    supabase
      .from("wishlist_items")
      .select("volume_number")
      .eq("user_id", user.id)
      .eq("manga_id", manga.id),
  ]);

  return (
    <SerieDetail
      manga={manga}
      volumes={volumes}
      readings={readings}
      wishedVolumes={(wishes ?? []).flatMap((w) => (w.volume_number == null ? [] : [w.volume_number]))}
    />
  );
}
