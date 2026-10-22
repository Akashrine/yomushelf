import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/session";
import { accountGate } from "@/lib/server/consent";

// Every app screen waits for the age, the source and, under 15, a
// parent's consent (/bienvenue).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await getSessionUser();
  if (user && (await accountGate(supabase, user.id)) !== "ready") redirect("/bienvenue");
  return <>{children}</>;
}
