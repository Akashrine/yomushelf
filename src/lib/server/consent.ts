import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gateStep, type GateStep } from "@/lib/account/gate";
import type { Database } from "@/lib/types/database";

// Age, source and parental consent live in columns and a table that only
// the service role writes (migration 20261022000100). Every caller checks
// the session first.
export function serviceClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Where a signed-in reader stands. One profile read ; the consent table is
// read only for a reader under 15 still waiting.
export async function accountGate(supabase: SupabaseClient<Database>, userId: string): Promise<GateStep> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("age_band, heard_from, parent_consent_at")
    .eq("id", userId)
    .maybeSingle();
  let requested = false;
  if (profile?.age_band === "under_15" && profile.heard_from && !profile.parent_consent_at) {
    const { data } = await serviceClient().from("parental_consents").select("user_id").eq("user_id", userId).maybeSingle();
    requested = !!data;
  }
  return gateStep(profile, requested);
}
