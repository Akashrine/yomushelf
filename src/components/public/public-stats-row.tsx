import type { OgProfile } from "@/lib/og/data";

export function PublicStatsRow({ profile }: { profile: OgProfile }) {
  return (
    <div
      className="grid grid-cols-3 gap-px rounded-xl overflow-hidden"
      style={{ background: "var(--border)" }}
    >
      <Stat label="Séries" value={profile.total_series} />
      <Stat label="Tomes" value={profile.total_volumes} />
      <Stat label="Lus" value={profile.volumes_read} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex flex-col items-center py-4 px-3"
      style={{ background: "var(--surface)" }}
    >
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: "var(--muted)" }}>
        {label}
      </span>
    </div>
  );
}
