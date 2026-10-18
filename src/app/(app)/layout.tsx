import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accountGate } from "@/lib/server/consent";

// Every app screen waits for the age, the source and, under 15, a
// parent's consent (/bienvenue).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && (await accountGate(supabase, user.id)) !== "ready") redirect("/bienvenue");
  return <>{children}</>;
}
