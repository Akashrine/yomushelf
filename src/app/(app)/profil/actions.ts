"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Result = { success: true } | { success: false; error: string };

const UsernameSchema = z.object({
  username: z
    .string()
    .min(2, "2 caractères minimum.")
    .max(30, "30 caractères maximum.")
    .regex(/^[a-zA-Z0-9_\-]+$/, "Lettres, chiffres, _ et - uniquement."),
});

export async function updateUsername(formData: FormData): Promise<Result> {
  const parsed = UsernameSchema.safeParse({ username: formData.get("username") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data.username })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { success: false, error: "Ce pseudo est déjà pris." };
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
  return { success: true };
}

const VisibilitySchema = z.object({
  is_public: z.boolean(),
  bio: z.string().max(140, "140 caractères maximum.").optional(),
});

export async function updateProfileVisibility(data: {
  is_public: boolean;
  bio?: string;
}): Promise<Result> {
  const parsed = VisibilitySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("profiles")
    .update({
      is_public: parsed.data.is_public,
      bio: parsed.data.bio ?? null,
    })
    .eq("id", user.id);

  if (error) return { success: false, error: "Erreur lors de la mise à jour." };
  return { success: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
