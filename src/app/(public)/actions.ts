"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWaitlistLimiter } from "@/lib/rate-limit";

const JoinWaitlistSchema = z.object({
  email: z.string().email("Email invalide."),
  source: z
    .enum(["landing_hero", "landing_footer", "tiktok_campaign", "other"])
    .default("landing_hero"),
});

type JoinWaitlistResult =
  | { success: true }
  | { success: false; error: string };

export async function joinWaitlist(
  formData: FormData
): Promise<JoinWaitlistResult> {
  const parsed = JoinWaitlistSchema.safeParse({
    email: formData.get("email"),
    source: formData.get("source") ?? "landing_hero",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Rate limit by IP
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

  const limiter = getWaitlistLimiter();
  const { success: allowed } = await limiter.limit(ip);
  if (!allowed) {
    return { success: false, error: "Trop de tentatives. Réessaie dans une minute." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("waitlist_entries").insert({
    email: parsed.data.email,
    source: parsed.data.source,
  });

  if (error) {
    if (error.code === "23505") {
      // unique violation — email already registered
      return { success: true }; // silent success to avoid enumeration
    }
    return { success: false, error: "Une erreur est survenue. Réessaie." };
  }

  return { success: true };
}
