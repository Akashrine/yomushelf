import { z } from "zod";

// Accepts "7,20", "7.2", "" (unknown price) — kids type commas.
export const priceField = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    if (v == null || v.trim() === "") return null;
    const n = Number(v.replace(",", ".").replace("€", "").trim());
    if (!Number.isFinite(n) || n < 0 || n > 999) {
      ctx.addIssue({ code: "custom", message: "Prix invalide." });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

// Same bound as the volume_number check in the database : a typo like
// "2000000000" must not reach a series page that draws one tile per volume.
export const MAX_VOLUME = 500;
export const volumeNumberField = z
  .number({ error: "Numéro de tome invalide." })
  .int("Numéro de tome invalide.")
  .positive("Numéro de tome invalide.")
  .max(MAX_VOLUME, `${MAX_VOLUME} tomes maximum.`);

// "" = not specified (null in the database). "other" is never offered in the
// UI but older rows keep it, so an untouched form sends it back unchanged.
export const acquisitionTypeField = z
  .enum(["bought", "gift", "borrowed", "other", ""])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

// A known date, or "unknown" to forget one. Never in the future.
export const isoDateField = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."), z.literal("unknown")])
  .optional()
  .transform((v) => (v === "unknown" ? null : v))
  .refine((v) => v == null || v <= new Date().toISOString().slice(0, 10), "La date ne peut pas être dans le futur.");

// What the reader says about a volume while adding or editing it.
//   unchanged     : leave the reading as it is
//   none          : not read (removes a reading)
//   reading       : in progress
//   read_earlier  : already read, date unknown
export const readingChoiceField = z
  .enum(["unchanged", "none", "reading", "read_earlier"])
  .default("unchanged");

export const VolumeDetailsSchema = z.object({
  price_eur: priceField,
  acquisition_type: acquisitionTypeField,
  acquired_at: isoDateField,
  reading: readingChoiceField,
});

// FormData → plain object, turning missing fields into undefined (not null)
// so zod defaults apply.
export function formValues(formData: FormData, keys: string[]) {
  return Object.fromEntries(
    keys.map((k) => {
      const v = formData.get(k);
      return [k, v == null ? undefined : String(v)];
    })
  );
}
