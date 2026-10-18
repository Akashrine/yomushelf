import { Resend } from "resend";

// Transactional emails sent by the app itself (Supabase Auth sends the
// account ones). Never throws : the caller tells the reader to retry.
export async function sendEmail(message: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    // Local development without Resend : the link is in the server log.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email] to ${message.to} — ${message.subject}\n${message.text}`);
      return true;
    }
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({ from, ...message });
    return !error;
  } catch {
    return false;
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// The email a parent receives when a reader under 15 signs up.
export function parentConsentEmail({ link, username, deadline }: { link: string; username: string | null; deadline: string }) {
  const who = username ? `Ton enfant (pseudo « ${username} »)` : "Ton enfant";
  const subject = "Ton enfant veut utiliser Yomushelf : ton accord est demandé";
  const text = [
    "Bonjour,",
    "",
    `${who} vient de créer un compte sur Yomushelf, une app gratuite pour suivre sa collection de mangas : ses tomes, ses lectures, ses envies.`,
    "Avant 15 ans, la loi demande l'accord d'un parent.",
    "",
    "Ce qu'il faut savoir :",
    "- pas de publicité, pas de profil public, pas de messagerie ;",
    "- Découvrir ne propose que des séries recommandées pour la jeunesse par le CNLJ (BnF) ;",
    "- tu peux retirer ton accord à tout moment avec ce même lien : le compte est alors supprimé.",
    "",
    `Voir et donner ton accord : ${link}`,
    "",
    `Sans réponse avant le ${deadline}, le compte et ses données sont supprimés. Si tu ne connais pas cet enfant, ignore ce message.`,
    "",
    "L'équipe Yomushelf",
  ].join("\n");
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f1e7;font-family:Arial,Helvetica,sans-serif;color:#12151d">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-size:22px;font-weight:bold;margin:0 0 20px">Yomushelf</p>
<p style="font-size:16px;line-height:1.5">Bonjour,</p>
<p style="font-size:16px;line-height:1.5">${escapeHtml(who)} vient de créer un compte sur Yomushelf, une app gratuite pour suivre sa collection de mangas : ses tomes, ses lectures, ses envies. Avant 15 ans, la loi demande l'accord d'un parent.</p>
<ul style="font-size:15px;line-height:1.6;padding-left:20px">
<li>Pas de publicité, pas de profil public, pas de messagerie.</li>
<li>Découvrir ne propose que des séries recommandées pour la jeunesse par le CNLJ (BnF).</li>
<li>Tu peux retirer ton accord à tout moment avec ce même lien : le compte est alors supprimé.</li>
</ul>
<p style="margin:28px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#12151d;color:#ffd23f;font-weight:bold;font-size:17px;text-decoration:none;padding:14px 22px;border-radius:12px">Voir et donner mon accord</a></p>
<p style="font-size:14px;line-height:1.5;color:#4a4f5c">Sans réponse avant le ${escapeHtml(deadline)}, le compte et ses données sont supprimés. Si tu ne connais pas cet enfant, ignore ce message.</p>
<p style="font-size:15px;margin-top:28px">L'équipe Yomushelf</p>
</div></body></html>`;
  return { subject, text, html };
}
