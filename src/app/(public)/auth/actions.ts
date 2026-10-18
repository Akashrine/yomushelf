"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logServerEvent } from "@/lib/server/analytics";

// The visit's source (SourceField), same rules as the client catalogue.
const sourceOf = (formData: FormData) => {
  const raw = formData.get("src");
  return typeof raw === "string" && /^[a-z0-9_.-]{1,40}$/.test(raw) ? raw : null;
};

const LoginSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

const SignupSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(8, "8 caractères minimum."),
  username: z.string().min(2, "2 caractères minimum.").max(30).optional(),
});

type AuthResult = { error: string } | never;

export async function signIn(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "invalid_credentials") {
      return { error: "Email ou mot de passe incorrect." };
    }
    return { error: "Erreur de connexion. Réessaie." };
  }

  redirect("/bibliotheque");
}

export async function signUp(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { username: parsed.data.username ?? "" },
      // The email link lands on /auth/confirm (see supabase/templates).
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/bibliotheque`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "Un compte existe déjà avec cet email." };
    }
    return { error: "Erreur lors de l'inscription. Réessaie." };
  }

  await logServerEvent("account_created", { method: "email" }, { accountCreatedAt: data.user?.created_at, src: sourceOf(formData) });

  // No email confirmation required : the account is ready and signed in.
  if (data.session) redirect("/bibliotheque");
  return { success: true };
}

export async function signInWithGoogle(formData: FormData) {
  const src = sourceOf(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback${src ? `?src=${src}` : ""}`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function resetPassword(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get("email");
  if (!email || typeof email !== "string") {
    return { error: "Email requis." };
  }

  const parsed = z.string().email("Email invalide.").safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/univers%23reglages`,
  });

  if (error) return { error: "Erreur. Vérifie ton email et réessaie." };
  return { success: true };
}
