"use client";

import { useState } from "react";
import { logShareEvent } from "@/lib/actions/share";
import { trackEvent } from "@/lib/analytics";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://yomushelf.app";

export function WrappedCardShare({
  year,
  slug,
  username,
}: {
  year: number;
  slug: string | null;
  username: string | null;
}) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const ogUrl = slug ? `${APP_URL}/og/wrapped/${slug}/${year}` : null;
  const profileUrl = slug ? `${APP_URL}/u/${slug}` : APP_URL;

  async function handleDownload() {
    if (!ogUrl) return;
    setDownloading(true);
    void logShareEvent("wrapped_card", "story", "direct");
    trackEvent("wrapped_shared", { year, platform: "download" });
    try {
      const res = await fetch(ogUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yomushelf-wrapped-${year}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    void logShareEvent("wrapped_card", "story", "direct");
    trackEvent("wrapped_shared", { year, platform: "link" });
    const shareData = {
      title: `Mon Wrapped ${year} sur Yomushelf`,
      text: `Découvre mon année manga ${year} 📚`,
      url: profileUrl,
    };
    if (typeof navigator.share !== "undefined") {
      try {
        await navigator.share(shareData);
        return;
      } catch { /* fallback */ }
    }
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleTikTok() {
    void logShareEvent("wrapped_card", "story", "tiktok");
    // TikTok : download first, then user uploads manually
    handleDownload();
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 40%, #c0392b22 0%, transparent 70%)",
        }}
      />

      <p
        className="text-xs uppercase tracking-widest relative z-10"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        Partage ton année
      </p>

      {/* Image preview */}
      {ogUrl ? (
        <div
          className="relative z-10 rounded-xl overflow-hidden"
          style={{
            width: 135,
            height: 240,
            background: "#181212",
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundImage: `url(${ogUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : (
        <div
          className="relative z-10 w-32 h-56 rounded-xl flex items-center justify-center"
          style={{ background: "#181212", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span style={{ fontSize: 32 }}>漫</span>
        </div>
      )}

      {/* Actions */}
      <div className="relative z-10 flex flex-col gap-2 w-full max-w-xs">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || !ogUrl}
          className="w-full py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity"
          style={{ background: "#c0392b", color: "white" }}
        >
          {downloading ? "Téléchargement…" : "⬇ Télécharger l'image"}
        </button>

        <button
          type="button"
          onClick={handleTikTok}
          disabled={downloading || !ogUrl}
          className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
          }}
        >
          🎵 Partager sur TikTok
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{
            background: "transparent",
            color: copied ? "#22c55e" : "rgba(255,255,255,0.4)",
          }}
        >
          {copied ? "✓ Lien copié" : "🔗 Copier le lien"}
        </button>
      </div>
    </div>
  );
}
