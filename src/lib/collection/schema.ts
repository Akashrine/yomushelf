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

export const acquisitionTypeField = z
  .enum(["bought", "gift", "borrowed", "other"])
  .default("bought");

export const readStatusField = z.enum(["unread", "reading", "read"]).default("unread");

export const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

export const VolumeDetailsSchema = z.object({
  price_eur: priceField,
  acquisition_type: acquisitionTypeField,
  read_status: readStatusField,
  acquired_at: isoDateField,
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
