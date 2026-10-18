import { createClient } from "@supabase/supabase-js";
import { EVENTS, ContextSchema, type EventName, type EventProps } from "@/lib/analytics-catalogue";

// Server-side events : what must be counted even when the browser never
// reports it (an account created, an email confirmed). Never throws : a
// lost event must not break sign-up.
export async function logServerEvent<N extends EventName>(
  name: N,
  props: EventProps<N>,
  opts: { userId?: string | null; src?: string | null } = {}
): Promise<void> {
  try {
    const parsed = EVENTS[name].strict().safeParse(props);
    if (!parsed.success) return;
    const context = ContextSchema.safeParse({ src: opts.src ?? undefined });
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await service.from("analytics_events").insert({
      user_id: opts.userId ?? null,
      event_name: name,
      properties: { ...(parsed.data as object), ...(context.success ? context.data : {}) },
    });
  } catch {
    // measurement only
  }
}
