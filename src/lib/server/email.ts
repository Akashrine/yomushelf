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

const BUTTON = "display:inline-block;background:#12151d;color:#ffd23f;font-weight:bold;font-size:17px;text-decoration:none;padding:14px 22px;border-radius:12px";
const P = "font-size:16px;line-height:1.5";

function htmlShell(inner: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f1e7;font-family:Arial,Helvetica,sans-serif;color:#12151d">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-size:22px;font-weight:bold;margin:0 0 20px">Yomushelf</p>
${inner}
<p style="font-size:15px;margin-top:28px">L'équipe Yomushelf</p>
</div></body></html>`;
}

// Under 15 : the child asked to send their list to the family. The parent
// decides, from their own page.
export function familyListRequestEmail({ link, username, until }: { link: string; username: string | null; until: string }) {
  const who = username ? `Ton enfant (pseudo « ${username} »)` : "Ton enfant";
  const subject = "Ton enfant aimerait partager sa liste d'envies";
  const text = [
    "Bonjour,",
    "",
    `${who} aimerait envoyer sa liste de mangas à la famille, pour Noël par exemple.`,
    "Avant 15 ans, c'est toi qui partages : ton enfant ne peut pas le faire lui-même.",
    "",
    "Sur ta page, tu crées un lien privé à transmettre (SMS, messagerie). La famille y voit les tomes souhaités et peut cocher « Je l'offre » pour éviter les doublons. Ton enfant ne voit pas ce qui est coché : la surprise reste entière.",
    "",
    `Créer le lien : ${link}`,
    "",
    `Le lien s'arrête seul le ${until}, et tu peux l'arrêter avant. Si tu ne veux pas partager, ignore ce message.`,
    "",
    "L'équipe Yomushelf",
  ].join("\n");
  const html = htmlShell(`<p style="${P}">Bonjour,</p>
<p style="${P}">${escapeHtml(who)} aimerait envoyer sa liste de mangas à la famille, pour Noël par exemple. Avant 15 ans, c'est toi qui partages : ton enfant ne peut pas le faire lui-même.</p>
<p style="${P}">Sur ta page, tu crées un lien privé à transmettre (SMS, messagerie). La famille y voit les tomes souhaités et peut cocher « Je l'offre » pour éviter les doublons. Ton enfant ne voit pas ce qui est coché : la surprise reste entière.</p>
<p style="margin:28px 0"><a href="${escapeHtml(link)}" style="${BUTTON}">Créer le lien de la liste</a></p>
<p style="font-size:14px;line-height:1.5;color:#4a4f5c">Le lien s'arrête seul le ${escapeHtml(until)}, et tu peux l'arrêter avant. Si tu ne veux pas partager, ignore ce message.</p>`);
  return { subject, text, html };
}

// The link is ready : a copy for the parent, with the page to stop it.
export function familyListReadyEmail({ listLink, manageLink, displayName, until }: { listLink: string; manageLink: string; displayName: string; until: string }) {
  const subject = `La liste de ${displayName} est prête à partager`;
  const text = [
    "Bonjour,",
    "",
    `Voici le lien de la liste de ${displayName}, à transmettre à la famille :`,
    listLink,
    "",
    `Il marche jusqu'au ${until}. Toute personne qui a ce lien voit la liste : ne le publie pas sur un réseau social.`,
    "",
    `Pour créer un nouveau lien ou arrêter le partage : ${manageLink}`,
    "",
    "L'équipe Yomushelf",
  ].join("\n");
  const html = htmlShell(`<p style="${P}">Bonjour,</p>
<p style="${P}">Voici le lien de la liste de ${escapeHtml(displayName)}, à transmettre à la famille :</p>
<p style="${P};word-break:break-all"><a href="${escapeHtml(listLink)}" style="color:#12151d;font-weight:bold">${escapeHtml(listLink)}</a></p>
<p style="${P}">Il marche jusqu'au ${escapeHtml(until)}. Toute personne qui a ce lien voit la liste : ne le publie pas sur un réseau social.</p>
<p style="margin:28px 0"><a href="${escapeHtml(manageLink)}" style="${BUTTON}">Gérer le partage</a></p>
<p style="font-size:14px;line-height:1.5;color:#4a4f5c">Ce bouton permet de créer un nouveau lien ou d'arrêter le partage.</p>`);
  return { subject, text, html };
}
