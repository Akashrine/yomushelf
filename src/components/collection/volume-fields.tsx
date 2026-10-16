"use client";

import { useId, useState } from "react";
import { AppIcon } from "@/components/app/app-icon";
import type { AcquisitionType } from "@/lib/types/database";

// How a volume arrived and its price. Both optional : a kid adding a
// volume can skip them, a parent can fill them later.
export type VolumeFieldsValue = {
  price: string; // raw input, "7,20"
  acquisition: AcquisitionType | null;
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
  { value: "borrowed", label: "Emprunté", icon: "handshake", color: "var(--borrow)" },
] as const;

const COMMON_PRICES = [6.9, 7.2, 7.5];

export function formatPriceInput(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function VolumeFields({ value, onChange, suggestedPrice, disabled }: Props) {
  const priceId = useId();
  const priceHintId = useId();
  const [priceOpen, setPriceOpen] = useState(value.price !== "");

  const chips = [
    ...new Set([...(suggestedPrice != null ? [suggestedPrice] : []), ...COMMON_PRICES]),
  ].slice(0, 4);

  const priceLabel =
    value.acquisition === "gift"
      ? "Son prix en magasin"
      : value.acquisition === "bought"
      ? "Prix payé"
      : "Son prix";

  return (
    <div className="flex flex-col gap-5">
      <fieldset disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold">
          Comment il est arrivé ? <span className="font-normal" style={{ color: "var(--muted)" }}>(facultatif)</span>
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {ACQUISITIONS.map((opt) => {
            const on = value.acquisition === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={on}
                // Tapping the selected choice again clears it.
                onClick={() => onChange({ ...value, acquisition: on ? null : opt.value })}
                className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: on ? `color-mix(in srgb, ${opt.color} 16%, transparent)` : "var(--background)",
                  border: `1.5px solid ${on ? opt.color : "var(--border)"}`,
                  color: on ? opt.color : "var(--muted)",
                }}
              >
                <AppIcon name={opt.icon} size={22} />
                <span style={{ color: on ? "var(--foreground)" : undefined }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* A borrowed volume goes back : no price */}
      {value.acquisition === "borrowed" ? (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(94,200,242,0.08)", color: "var(--borrow)" }}>
          Un tome emprunté se rend. Ta lecture, elle, reste comptée.
        </p>
      ) : !priceOpen ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPriceOpen(true)}
          className="flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-sm font-semibold"
          style={{ border: "1px dashed var(--border)", color: "var(--muted)" }}
        >
          <AppIcon name="plus" size={16} />
          Ajouter son prix (facultatif)
        </button>
      ) : (
        <div>
          <label htmlFor={priceId} className="mb-2 block text-sm font-semibold">
            {priceLabel}
          </label>
          <div
            className="flex items-center rounded-xl px-4 focus-within:ring-2"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
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
              onChange={(e) => onChange({ ...value, price: e.target.value.replace(/[^\d.,]/g, "") })}
              disabled={disabled}
              aria-describedby={priceHintId}
              className="w-full bg-transparent py-3 text-2xl font-bold tabular-nums outline-none"
              style={{ color: "var(--foreground)" }}
            />
            <span className="text-xl font-bold" style={{ color: "var(--muted)" }}>€</span>
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
                  className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums transition-transform active:scale-95"
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
            Le prix au dos, c&apos;est le prix neuf. Si tu l&apos;as payé moins cher, note le vrai prix.
          </p>
        </div>
      )}
    </div>
  );
}

// "Tu l'as déjà lu ?" asked when a volume is added. "Oui" stores a
// reading with an unknown date : it was read before today.
export type AlreadyReadChoice = "none" | "read_earlier";

export function AlreadyReadField({
  value,
  onChange,
  disabled,
}: {
  value: AlreadyReadChoice;
  onChange: (next: AlreadyReadChoice) => void;
  disabled?: boolean;
}) {
  const options = [
    { value: "none", label: "Pas encore", icon: "moon", color: "var(--sleep)" },
    { value: "read_earlier", label: "Oui, déjà lu", icon: "check", color: "var(--read)" },
  ] as const;
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold">Tu l&apos;as déjà lu ?</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const on = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(opt.value)}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all active:scale-95"
              style={{
                background: on ? `color-mix(in srgb, ${opt.color} 16%, transparent)` : "var(--background)",
                border: `1.5px solid ${on ? opt.color : "var(--border)"}`,
                color: on ? "var(--foreground)" : "var(--muted)",
              }}
            >
              <span style={{ color: opt.color }}>
                <AppIcon name={opt.icon} size={20} />
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
