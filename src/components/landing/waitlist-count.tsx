import { createClient } from "@/lib/supabase/server";

export async function WaitlistCount() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_waitlist_count");
  const count = Number(data ?? 0);

  if (count < 10) {
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Sois parmi les premiers.
      </p>
    );
  }

  return (
    <p className="text-sm" style={{ color: "var(--muted)" }}>
      <span className="font-semibold" style={{ color: "var(--foreground)" }}>
        {count.toLocaleString("fr-FR")}
      </span>{" "}
      collectionneurs déjà inscrits
    </p>
  );
}
