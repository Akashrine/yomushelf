"use client";

import { useId } from "react";
import { AppIcon } from "@/components/app/app-icon";
import type { AcquisitionType, VolumeReadStatus } from "@/lib/types/database";

export type VolumeFieldsValue = {
  price: string; // raw input, "7,20"
  acquisition: AcquisitionType;
  read: VolumeReadStatus;
};

type Props = {
  value: VolumeFieldsValue;
  onChange: (next: VolumeFieldsValue) => void;
  suggestedPrice?: number | null;
  disabled?: boolean;
};

const ACQUISITIONS = [
  { value: "bought", label: "Acheté", icon: "wallet", color: "var(--read)" },
  { value: "gift", label: "Offert", icon: "gift", color: "var(--gift)" },
  { value: "borrowed", label: "Prêté", icon: "handshake", color: "var(--borrow)" },
] as const;

const READ_STATES = [
  { value: "unread", label: "Pas encore", icon: "moon", color: "var(--sleep)" },
  { value: "reading", label: "En cours", icon: "book-open", color: "var(--gold)" },
  { value: "read", label: "Lu !", icon: "check", color: "var(--read)" },
] as const;

const COMMON_PRICES = [6.9, 7.2, 7.5];

export function formatPriceInput(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function VolumeFields({ value, onChange, suggestedPrice, disabled }: Props) {
  const priceId = useId();
  const priceHintId = useId();

  const chips = [
    ...new Set([...(suggestedPrice != null ? [suggestedPrice] : []), ...COMMON_PRICES]),
  ].slice(0, 4);

  const priceLabel =
    value.acquisition === "gift" ? "Son prix en magasin" : "Prix payé";
  const priceHint =
    value.acquisition === "gift"
      ? "Offert, il ne t'a rien coûté. Mais il a une valeur : regarde le prix au dos."
      : "Le prix est souvent écrit au dos du tome.";

  return (
    <div className="flex flex-col gap-5">
      {/* How it arrived */}
      <fieldset disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold">Comment il est arrivé ?</legend>
        <div className="grid grid-cols-3 gap-2">
          {ACQUISITIONS.map((opt) => (
            <ChoiceButton
              key={opt.value}
              name={`${priceId}-acquisition`}
              checked={value.acquisition === opt.value}
              onSelect={() => onChange({ ...value, acquisition: opt.value })}
              color={opt.color}
              icon={opt.icon}
              label={opt.label}
            />
          ))}
        </div>
      </fieldset>

      {/* Price — a borrowed volume goes back, so it has no value for us */}
      {value.acquisition === "borrowed" ? (
        <p
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(94,200,242,0.08)", color: "var(--borrow)" }}
        >
          Un tome prêté se rend. Il compte dans tes lectures, pas dans ta collection.
        </p>
      ) : (
        <div>
          <label htmlFor={priceId} className="mb-2 block text-sm font-semibold">
            {priceLabel}
          </label>
          <div className="flex items-center gap-2">
            <div
              className="flex flex-1 items-center rounded-xl px-4 focus-within:ring-2"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                // ring color for keyboard focus
                ["--tw-ring-color" as string]: "var(--gold)",
              }}
            >
              <input
                id={priceId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="7,20"
                value={value.price}
                onChange={(e) =>
                  onChange({ ...value, price: e.target.value.replace(/[^\d.,]/g, "") })
                }
                disabled={disabled}
                aria-describedby={priceHintId}
                className="w-full bg-transparent py-3 text-2xl font-bold tabular-nums outline-none"
                style={{ color: "var(--foreground)" }}
              />
              <span className="text-xl font-bold" style={{ color: "var(--muted)" }}>
                €
              </span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map((p) => {
              const formatted = formatPriceInput(p);
              const active = value.price === formatted;
              return (
                <button
                  key={p}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...value, price: formatted })}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums transition-transform active:scale-95"
                  style={{
                    background: active ? "rgba(248,192,74,0.16)" : "var(--surface-raised)",
                    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                    color: active ? "var(--gold)" : "var(--foreground)",
                  }}
                >
                  {formatted} €
                  {p === suggestedPrice && (
                    <span className="ml-1 text-[10px] font-medium" style={{ color: "var(--muted)" }}>
                      comme le dernier
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p id={priceHintId} className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            {priceHint}
          </p>
        </div>
      )}

      {/* Read */}
      <fieldset disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold">Tu l&apos;as lu ?</legend>
        <div className="grid grid-cols-3 gap-2">
          {READ_STATES.map((opt) => (
            <ChoiceButton
              key={opt.value}
              name={`${priceId}-read`}
              checked={value.read === opt.value}
              onSelect={() => onChange({ ...value, read: opt.value })}
              color={opt.color}
              icon={opt.icon}
              label={opt.label}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function ChoiceButton({
  name,
  checked,
  onSelect,
  color,
  icon,
  label,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  color: string;
  icon: React.ComponentProps<typeof AppIcon>["name"];
  label: string;
}) {
  return (
    <label
      className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-sm font-semibold transition-all active:scale-95 has-[:focus-visible]:ring-2"
      style={{
        background: checked ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--background)",
        border: `1.5px solid ${checked ? color : "var(--border)"}`,
        color: checked ? color : "var(--muted)",
        ["--tw-ring-color" as string]: color,
      }}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <AppIcon name={icon} size={22} />
      <span style={{ color: checked ? "var(--foreground)" : undefined }}>{label}</span>
    </label>
  );
}
