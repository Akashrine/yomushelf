import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnedVolumes, getUserCollection } from "@/lib/supabase/queries";
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
    .select("id, title, author, publisher_fr, total_volumes, status, avg_price_eur, genre_primary, cover_url, top_50_rank")
    .eq("id", slug)
    .single();

  if (!manga) notFound();

  const [collection, volumes, { data: wishes }] = await Promise.all([
    getUserCollection(supabase, user.id, manga.id),
    getOwnedVolumes(supabase, user.id, manga.id),
    supabase
      .from("wishlist_items")
      .select("volume_number")
      .eq("user_id", user.id)
      .eq("manga_id", manga.id),
  ]);

  return (
    <SerieDetail
      manga={manga}
      collection={collection}
      volumes={volumes}
      wishedVolumes={(wishes ?? []).flatMap((w) => (w.volume_number == null ? [] : [w.volume_number]))}
    />
  );
}
