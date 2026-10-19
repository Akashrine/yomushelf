"use server";

import { getSessionUser } from "@/lib/supabase/session";

type ShareType = "profile_link" | "collection_card" | "wrapped_card";
type ShareFormat = "landscape" | "story" | "link";
type SharePlatform =
  | "x"
  | "tiktok"
  | "instagram"
  | "whatsapp"
  | "discord"
  | "direct"
  | "copy"
  | null;

export async function logShareEvent(
  shareType: ShareType,
  format: ShareFormat,
  platform: SharePlatform
): Promise<void> {
  const { supabase, user } = await getSessionUser();
  if (!user) return;

  await supabase.from("share_events").insert({
    user_id: user.id,
    share_type: shareType,
    format,
    target_platform: platform ?? undefined,
  });
}
