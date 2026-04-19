"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateUsername, updateProfileVisibility, signOutAction } from "@/app/(app)/profil/actions";
import { trackEvent } from "@/lib/analytics";

type Stats = {
  total_series: number;
  total_volumes_owned: number;
  total_budget_eur: number;
  volumes_read: number;
} | null;

type Props = {
  email: string;
  username: string | null;
  avatarInitials: string;
  memberSince: string;
  stats: Stats;
  isPublic: boolean;
  bio: string | null;
  publicSlug: string | null;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://yomushelf.app";

export function ProfilClient({
  email, username, avatarInitials, memberSince, stats,
  isPublic: initialIsPublic, bio: initialBio, publicSlug,
}: Props) {
  const [name, setName] = useState(username ?? "");
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [bio, setBio] = useState(initialBio ?? "");
  const [bioSaved, setBioSaved] = useState(false);
  const [visError, setVisError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const [isPending, startTransition] = useTransition();
  const memberYear = new Date(memberSince).getFullYear();
  const publicUrl = publicSlug ? `${APP_URL}/u/${publicSlug}` : null;

  function handleSaveName() {
    setNameSaved(false);
    setNameError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("username", name);
      const result = await updateUsername(fd);
      if (!result.success) setNameError(result.error);
      else { setNameSaved(true); setTimeout(() => setNameSaved(false), 2000); }
    });
  }

  function handleTogglePublic(checked: boolean) {
    if (checked && !isPublic) {
      setShowConfirmModal(true);
    } else if (!checked) {
      applyVisibility(false, bio);
    }
  }

  function applyVisibility(pub: boolean, bioVal: string) {
    setVisError(null);
    trackEvent(pub ? "profile_made_public" : "profile_made_private");
    startTransition(async () => {
      const result = await updateProfileVisibility({ is_public: pub, bio: bioVal || undefined });
      if (!result.success) setVisError(result.error);
      else {
        setIsPublic(pub);
        setBioSaved(true);
        setTimeout(() => setBioSaved(false), 2000);
      }
    });
  }

  function handleSaveBio() {
    applyVisibility(isPublic, bio);
  }

  function handleCopyUrl() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  function handleSignOut() {
    startTransition(async () => { await signOutAction(); });
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        className="sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/bibliotheque" className="text-sm transition-opacity hover:opacity-70" style={{ color: "var(--muted)" }}>
          ← Bibliothèque
        </Link>
        <h1 className="text-sm font-semibold ml-auto">Mon profil</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 sm:px-6 py-8 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {avatarInitials}
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Membre depuis {memberYear}</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden" style={{ background: "var(--border)" }}>
            {[
              { label: "Séries", value: stats.total_series },
              { label: "Tomes possédés", value: stats.total_volumes_owned ?? 0 },
              { label: "Budget total", value: `${Number(stats.total_budget_eur ?? 0).toFixed(0)} €` },
              { label: "Tomes lus", value: stats.volumes_read ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-3" style={{ background: "var(--surface)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--muted)" }}>{label}</p>
                <p className="text-lg font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pseudo */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--muted)" }}>Pseudo</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameSaved(false); setNameError(null); }}
            placeholder="ton_pseudo"
            maxLength={30}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
          {nameError && <p className="text-xs" style={{ color: "#e74c3c" }}>{nameError}</p>}
          <button
            type="button"
            onClick={handleSaveName}
            disabled={isPending || name === username}
            className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {nameSaved ? "✓ Enregistré" : isPending ? "Sauvegarde…" : "Enregistrer"}
          </button>
        </div>

        {/* ─── Visibilité ─── */}
        <div className="rounded-xl p-4 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--muted)" }}>Visibilité</h2>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Profil public</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {isPublic ? "Ton profil est visible par tous." : "Ton profil est privé."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => handleTogglePublic(!isPublic)}
              disabled={isPending}
              className="relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 shrink-0"
              style={{ background: isPublic ? "var(--accent)" : "var(--border)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
                style={{
                  background: "white",
                  transform: isPublic ? "translateX(20px)" : "translateX(0)",
                }}
              />
            </button>
          </div>

          {/* Bio — shown only when public or has existing bio */}
          {(isPublic || initialBio) && (
            <div className="space-y-2">
              <label className="text-xs" style={{ color: "var(--muted)" }}>
                Bio · {bio.length}/140
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 140))}
                placeholder="Collectionneur de mangas depuis 2010…"
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
              {visError && <p className="text-xs" style={{ color: "#e74c3c" }}>{visError}</p>}
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={isPending || (bio === (initialBio ?? ""))}
                className="w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                {bioSaved ? "✓ Enregistré" : "Enregistrer la bio"}
              </button>
            </div>
          )}

          {/* URL publique */}
          {isPublic && publicUrl && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
            >
              <Link
                href={`/u/${publicSlug}`}
                target="_blank"
                className="flex-1 text-xs truncate transition-opacity hover:opacity-70"
                style={{ color: "var(--muted)" }}
              >
                {publicUrl}
              </Link>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="shrink-0 text-xs font-medium transition-colors"
                style={{ color: urlCopied ? "#22c55e" : "var(--accent)" }}
              >
                {urlCopied ? "✓ Copié" : "Copier"}
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--muted)" }}>Email</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{email}</p>
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isPending}
          className="w-full py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#e74c3c" }}
        >
          Se déconnecter
        </button>
      </div>

      {/* Confirmation modal — premier opt-in */}
      {showConfirmModal && (
        <ConfirmPublicModal
          bio={bio}
          setBio={setBio}
          stats={stats}
          onConfirm={() => {
            setShowConfirmModal(false);
            applyVisibility(true, bio);
          }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}

function ConfirmPublicModal({
  bio, setBio, stats,
  onConfirm, onCancel,
}: {
  bio: string;
  setBio: (v: string) => void;
  stats: Stats;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onCancel} />
      <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-[420px] z-50 rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", transform: "var(--t, none)", ["--t" as string]: "translate(-50%,-50%)" }}
      >
        <h2 className="text-base font-bold mb-1">Rendre ton profil public ?</h2>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Les visiteurs pourront voir :
        </p>

        <ul className="space-y-1.5 mb-5">
          {[
            "Ton pseudo et ta bio",
            stats ? `Tes stats — ${stats.total_series} séries · ${stats.total_volumes_owned} tomes` : "Tes stats agrégées",
            "Tes 20 premières couvertures",
            "Ton genre favori",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <span style={{ color: "var(--accent)" }}>✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1.5 mb-5">
          {[
            "Ton email",
            "Ton budget total",
            "Tes dates d'achat",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm">
              <span style={{ color: "var(--muted)" }}>✗</span>
              <span style={{ color: "var(--muted)" }}>{item} (jamais exposé)</span>
            </div>
          ))}
        </div>

        <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>
          Bio (optionnel) · {bio.length}/140
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 140))}
          placeholder="Collectionneur de mangas depuis 2010…"
          rows={2}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none mb-4"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Rendre public
          </button>
        </div>
      </div>
    </>
  );
}
