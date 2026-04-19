"use client";

import { useState, useTransition, useCallback } from "react";
import { logShareEvent } from "@/lib/actions/share";
import { trackEvent } from "@/lib/analytics";

type Format = "landscape" | "story" | "link";
type Platform = "x" | "tiktok" | "instagram" | "whatsapp" | "discord" | "copy" | "direct";

const FORMATS: { id: Format; label: string; sub: string; ratio: string }[] = [
  { id: "landscape", label: "Paysage", sub: "1200 × 630", ratio: "16/9" },
  { id: "story", label: "Story", sub: "1080 × 1920", ratio: "9/16" },
  { id: "link", label: "Lien", sub: "yomushelf.app", ratio: "link" },
];

const SOCIALS: { id: Platform; label: string; emoji: string }[] = [
  { id: "x", label: "X", emoji: "𝕏" },
  { id: "whatsapp", label: "WhatsApp", emoji: "💬" },
  { id: "discord", label: "Discord", emoji: "🎮" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
  { id: "instagram", label: "Instagram", emoji: "📷" },
];

type Props = { slug: string; username: string };

export function ShareSheetTrigger({ slug, username }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); trackEvent("share_opened", { type: "profile" }); }}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
      >
        Partager
      </button>

      {open && (
        <ShareSheet slug={slug} username={username} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ShareSheet({
  slug,
  username,
  onClose,
}: Props & { onClose: () => void }) {
  const [format, setFormat] = useState<Format>("landscape");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [, startTransition] = useTransition();

  const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://yomushelf.app"}/u/${slug}`;

  const ogUrl = (fmt: Exclude<Format, "link">) =>
    `${process.env.NEXT_PUBLIC_APP_URL ?? "https://yomushelf.app"}/og/${fmt === "landscape" ? "profile" : "story"}/${slug}`;

  const log = useCallback(
    (fmt: Format, platform: Platform | null) => {
      startTransition(async () => {
        await logShareEvent("profile_link", fmt, platform);
      });
    },
    []
  );

  async function handleDownload() {
    if (format === "link") return;
    setDownloading(true);
    log(format, "direct");
    trackEvent("share_downloaded", { format });
    try {
      const res = await fetch(ogUrl(format));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yomushelf-${username}-${format}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    log(format, "copy");
    trackEvent("share_link_copied", { format });
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleWebShare() {
    log(format, "direct");
    if (typeof navigator.share !== "undefined") {
      try {
        await navigator.share({
          title: `@${username} sur Yomushelf`,
          text: `Découvre ma collection manga 📚`,
          url: profileUrl,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    handleCopy();
  }

  function handleSocial(platform: Platform) {
    log(format, platform);
    trackEvent("share_social_clicked", { platform, format });
    const text = encodeURIComponent(`Découvre ma collection manga sur Yomushelf 📚`);
    const url = encodeURIComponent(profileUrl);

    const intents: Partial<Record<Platform, string>> = {
      x: `https://x.com/intent/tweet?text=${text}&url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      discord: null as unknown as string,
      tiktok: null as unknown as string,
      instagram: null as unknown as string,
    };

    const intent = intents[platform];
    if (intent) {
      window.open(intent, "_blank", "noopener");
    } else {
      // TikTok, Instagram, Discord → Web Share API ou copie
      handleWebShare();
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      {/* Sheet — bottom on mobile, centered on desktop */}
      <div
        className="fixed z-50 bottom-0 inset-x-0 sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2"
        style={{
          // @ts-expect-error CSS variable
          "--translate": "translate(-50%,-50%)",
        }}
      >
        <div
          className="w-full sm:w-[440px] rounded-t-2xl sm:rounded-2xl p-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            transform: "var(--translate, none)",
          }}
        >
          {/* Handle */}
          <div
            className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden"
            style={{ background: "var(--border)" }}
          />

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold">Partager</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-lg leading-none transition-opacity hover:opacity-60"
              style={{ color: "var(--muted)" }}
            >
              ✕
            </button>
          </div>

          {/* Format selector */}
          <div className="flex gap-2 mb-5">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFormat(f.id); trackEvent("share_format_selected", { format: f.id }); }}
                className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                style={{
                  background: format === f.id ? "var(--surface-raised)" : "transparent",
                  border: `1px solid ${format === f.id ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {/* Format preview */}
                {f.ratio === "link" ? (
                  <div
                    className="flex items-center justify-center rounded-md"
                    style={{
                      width: 52,
                      height: 52,
                      background: "var(--surface-raised)",
                      fontSize: 22,
                    }}
                  >
                    🔗
                  </div>
                ) : (
                  <div
                    className="rounded-md overflow-hidden"
                    style={{
                      width: f.ratio === "16/9" ? 68 : 38,
                      height: f.ratio === "16/9" ? 38 : 56,
                      background: "linear-gradient(135deg, #1a1010 0%, #2e1010 100%)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: "var(--accent)",
                      fontWeight: 700,
                    }}
                  >
                    漫
                  </div>
                )}
                <span className="text-[11px] font-semibold">{f.label}</span>
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>{f.sub}</span>
              </button>
            ))}
          </div>

          {/* Primary actions */}
          <div className="flex gap-2 mb-4">
            {format !== "link" && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-opacity"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {downloading ? "Téléchargement…" : "⬇ Télécharger"}
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: copied ? "#22c55e22" : "var(--surface-raised)",
                border: `1px solid ${copied ? "#22c55e44" : "var(--border)"}`,
                color: copied ? "#22c55e" : "var(--foreground)",
              }}
            >
              {copied ? "✓ Lien copié" : "🔗 Copier le lien"}
            </button>
          </div>

          {/* Social icons */}
          <div
            className="pt-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
              Partager sur
            </p>
            <div className="flex gap-2">
              {SOCIALS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSocial(s.id)}
                  className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all hover:opacity-80"
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                  }}
                  title={s.label}
                >
                  <span style={{ fontSize: 20 }}>{s.emoji}</span>
                  <span className="text-[9px]" style={{ color: "var(--muted)" }}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
