import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AjouterClient } from "@/components/ajouter/ajouter-client";

export const metadata: Metadata = { title: "Ajouter un manga" };

export default async function AjouterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <AjouterClient />;
}
