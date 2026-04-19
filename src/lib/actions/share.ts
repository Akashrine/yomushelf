"use server";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("share_events").insert({
    user_id: user.id,
    share_type: shareType,
    format,
    target_platform: platform ?? undefined,
  });
}
