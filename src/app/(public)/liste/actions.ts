"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { serviceClient } from "@/lib/server/consent";
import { hashLinkToken, isLinkToken } from "@/lib/server/link-token";
import { offerSecret } from "@/lib/server/wishlist-share";

// "Je l'offre" and "Annuler" on the family's page. The link is the only
// credential ; the result comes back as ?etat=… next to the volume.
const OfferSchema = z.object({
  token: z.string().refine(isLinkToken),
  item: z.string().uuid(),
});

function parse(formData: FormData) {
  const parsed = OfferSchema.safeParse({ token: formData.get("token"), item: formData.get("item") });
  if (!parsed.success) redirect("/liste/invalide");
  return parsed.data;
}

const back = (token: string, item: string, etat: string): never =>
  redirect(`/liste/${token}?etat=${etat}&tome=${item}#tome-${item}`);

export async function offerItem(formData: FormData) {
  const { token, item } = parse(formData);
  const secret = await offerSecret({ create: true });
  const { data, error } = await serviceClient().rpc("reserve_wishlist_item", {
    p_token_hash: hashLinkToken(token),
    p_item_id: item,
    p_undo_hash: hashLinkToken(secret!),
  });
  if (error) back(token, item, "erreur");
  // Link stopped : the page says so. Volume removed meanwhile : said above the list.
  if (data === "not_found") redirect(`/liste/${token}?etat=retire&tome=${item}`);
  back(token, item, data === "reserved" ? "offert" : data === "taken" ? "deja" : "trop");
}

export async function cancelOffer(formData: FormData) {
  const { token, item } = parse(formData);
  const secret = await offerSecret({ create: false });
  if (!secret) back(token, item, "pas-toi");
  const { data, error } = await serviceClient().rpc("release_wishlist_item", {
    p_token_hash: hashLinkToken(token),
    p_item_id: item,
    p_undo_hash: hashLinkToken(secret!),
  });
  if (error) back(token, item, "erreur");
  back(token, item, data === "released" ? "annule" : data === "busy" ? "trop" : "pas-toi");
}
