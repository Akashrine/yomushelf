import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

// The signed-in reader, once per request. getClaims() checks the session
// JWT's signature against the project's signing keys (ES256, JWKS cached
// by auth-js) : no call to the Auth server, unlike getUser(). PostgREST
// trusts the same JWT for RLS, so this is as strict as the writes it
// guards. Kept on getUser() : the password change and /api/events (needs
// created_at, not in the JWT).
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user: SessionUser | null = claims?.sub ? { id: claims.sub, email: claims.email ?? null } : null;
  return { supabase, user };
});
