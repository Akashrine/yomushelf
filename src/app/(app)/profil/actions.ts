"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/session";
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

  const { supabase, user } = await getSessionUser();
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

// Libraries are private : profiles can no longer be made public. Kept as
// an explicit refusal for old clients still calling it.
export async function updateProfileVisibility(data: { is_public: boolean; bio?: string }): Promise<Result> {
  if (data?.is_public) return { success: false, error: "Les profils publics ne sont plus proposés." };
  return { success: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ─────────────────────────────────────────
// changePassword — also the landing of the "mot de passe oublié" email.
// ─────────────────────────────────────────

const PasswordSchema = z
  .object({
    password: z.string().min(8, "8 caractères minimum.").max(72, "72 caractères maximum."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Les deux mots de passe ne sont pas identiques.", path: ["confirm"] });

export async function changePassword(formData: FormData): Promise<Result> {
  const parsed = PasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { success: false, error: "Le mot de passe n'a pas été changé. Réessaie." };
  return { success: true };
}
