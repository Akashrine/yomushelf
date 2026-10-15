import { AppIcon } from "@/components/app/app-icon";

type Props = {
  label: string;
  value: string;
  detail?: string;
  icon: React.ComponentProps<typeof AppIcon>["name"];
  color: string; // css color for accent
  sleeping?: boolean; // floating "z" decoration
};

export function StatTile({ label, value, detail, icon, color, sleeping }: Props) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
      style={{
        background: `radial-gradient(120% 100% at 100% 0%, color-mix(in srgb, ${color} 16%, transparent) 0%, transparent 60%), var(--surface)`,
        border: "1px solid var(--border)",
      }}
    >
      <div className="relative w-fit" style={{ color }}>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          <AppIcon name={icon} size={22} filled={icon === "moon"} />
        </span>
        {sleeping && (
          <span aria-hidden="true" className="absolute -right-3 -top-2 text-xs font-black">
            <span className="zzz absolute">z</span>
            <span className="zzz absolute left-2 -top-1" style={{ animationDelay: "0.9s" }}>z</span>
            <span className="zzz absolute left-4 -top-2" style={{ animationDelay: "1.8s" }}>z</span>
          </span>
        )}
      </div>
      <p className="mt-4 text-sm font-semibold" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="mt-0.5 text-3xl font-black tabular-nums sm:text-4xl" style={{ color: "var(--foreground)" }}>
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          {detail}
        </p>
      )}
    </section>
  );
}
