"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePassword, signOutAction, updateProfileVisibility, updateUsername } from "@/app/(app)/profil/actions";

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";

export function Settings({
  username,
  email,
  publicSlug,
}: {
  username: string | null;
  email: string;
  publicSlug: string | null; // set only while an old public profile is still visible
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pseudo, setPseudo] = useState(username ?? "");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ field: "pseudo" | "pwd" | "public"; ok: boolean; text: string } | null>(null);

  function submit(field: "pseudo" | "pwd" | "public", action: (fd: FormData) => Promise<{ success: boolean; error?: string }>, fd: FormData, ok: string) {
    setMsg(null);
    startTransition(async () => {
      const result = await action(fd).catch(() => ({ success: false as const, error: NETWORK_ERROR }));
      if (!result.success) {
        setMsg({ field, ok: false, text: result.error ?? NETWORK_ERROR });
        return;
      }
      setMsg({ field, ok: true, text: ok });
      if (field === "pwd") {
        setPwd("");
        setConfirm("");
      }
      router.refresh();
    });
  }

  const input = "min-h-12 w-full rounded-xl px-3 text-base outline-none focus:ring-2";
  const inputStyle = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" };
  const feedback = (field: "pseudo" | "pwd" | "public") =>
    msg?.field === field && (
      <p className="text-sm" role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--read)" : "var(--accent-hover)" }}>
        {msg.text}
      </p>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form
        className="flex flex-col gap-3 rounded-2xl p-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("username", pseudo.trim());
          submit("pseudo", updateUsername, fd, "Pseudo enregistré.");
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Pseudo
          <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} className={input} style={inputStyle} autoComplete="nickname" />
        </label>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Un pseudo suffit, pas besoin de ton vrai nom.</p>
        <button type="submit" disabled={isPending} className="min-h-11 self-start rounded-xl px-4 text-sm font-bold disabled:opacity-60" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          Enregistrer
        </button>
        {feedback("pseudo")}
      </form>

      <form
        className="flex flex-col gap-3 rounded-2xl p-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("password", pwd);
          fd.set("confirm", confirm);
          submit("pwd", changePassword, fd, "Mot de passe changé.");
        }}
      >
        <p className="text-sm font-semibold">Changer mon mot de passe</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Compte : {email}</p>
        <label className="flex flex-col gap-1 text-sm">
          Nouveau mot de passe
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className={input} style={inputStyle} autoComplete="new-password" minLength={8} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Encore une fois
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} style={inputStyle} autoComplete="new-password" />
        </label>
        <button type="submit" disabled={isPending || !pwd} className="min-h-11 self-start rounded-xl px-4 text-sm font-bold disabled:opacity-60" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          Changer le mot de passe
        </button>
        {feedback("pwd")}
      </form>

      {publicSlug && (
        <form
          className="flex flex-col gap-3 rounded-2xl p-4 md:col-span-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          onSubmit={(e) => {
            e.preventDefault();
            submit("public", () => updateProfileVisibility({ is_public: false }), new FormData(), "Ton profil est privé.");
          }}
        >
          <p className="text-sm font-semibold">Ton profil est public</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Tout le monde peut voir tes séries à l&apos;adresse /u/{publicSlug}.
          </p>
          <button type="submit" disabled={isPending} className="min-h-11 self-start rounded-xl px-4 text-sm font-bold disabled:opacity-60" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
            Rendre mon profil privé
          </button>
          {feedback("public")}
        </form>
      )}

      <form action={signOutAction} className="md:col-span-2">
        <button type="submit" className="min-h-11 rounded-xl px-4 text-sm font-semibold" style={{ border: "1px solid var(--border)", color: "var(--accent-hover)" }}>
          Me déconnecter
        </button>
      </form>
    </div>
  );
}
