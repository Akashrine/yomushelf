"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePassword, signOutAction, updateUsername } from "@/app/(app)/profil/actions";

const NETWORK_ERROR = "Impossible de confirmer l'enregistrement. Vérifie ta connexion puis réessaie.";

export function Settings({ username, email }: { username: string | null; email: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pseudo, setPseudo] = useState(username ?? "");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ field: "pseudo" | "pwd"; ok: boolean; text: string } | null>(null);

  function submit(field: "pseudo" | "pwd", action: (fd: FormData) => Promise<{ success: boolean; error?: string }>, fd: FormData, ok: string) {
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

  const input =
    "min-h-12 w-full rounded-xl px-3 font-sans text-base font-normal outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";
  const inputStyle = { background: "white", border: "2px solid var(--ink)", color: "var(--ink)" };
  const card = "manga-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5";
  const save =
    "manga-panel-sm manga-press min-h-12 self-start rounded-2xl px-5 text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60";
  const saveStyle = { background: "var(--pop)", color: "var(--ink)" };
  const feedback = (field: "pseudo" | "pwd") =>
    msg?.field === field && (
      <p className="text-sm font-semibold" role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--success)" : "var(--danger)" }}>
        {msg.text}
      </p>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form
        className={card}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("username", pseudo.trim());
          submit("pseudo", updateUsername, fd, "Pseudo enregistré.");
        }}
      >
        <label className="flex flex-col gap-1.5" style={{ color: "var(--ink)" }}>
          <span className="font-display text-2xl tracking-wide">Pseudo</span>
          <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} className={input} style={inputStyle} autoComplete="nickname" />
        </label>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Un pseudo suffit, pas besoin de ton vrai nom.</p>
        <button type="submit" disabled={isPending} className={save} style={saveStyle}>
          Enregistrer
        </button>
        {feedback("pseudo")}
      </form>

      <form
        className={card}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("password", pwd);
          fd.set("confirm", confirm);
          submit("pwd", changePassword, fd, "Mot de passe changé.");
        }}
      >
        <p className="font-display text-2xl tracking-wide" style={{ color: "var(--ink)" }}>Changer mon mot de passe</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Compte : {email}</p>
        <label className="flex flex-col gap-1.5 text-sm font-bold" style={{ color: "var(--ink)" }}>
          Nouveau mot de passe
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className={input} style={inputStyle} autoComplete="new-password" minLength={8} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-bold" style={{ color: "var(--ink)" }}>
          Encore une fois
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} style={inputStyle} autoComplete="new-password" />
        </label>
        <button type="submit" disabled={isPending || !pwd} className={save} style={saveStyle}>
          Changer le mot de passe
        </button>
        {feedback("pwd")}
      </form>

      <form action={signOutAction} className="md:col-span-2">
        <button
          type="submit"
          className="manga-press min-h-12 rounded-2xl px-5 text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          style={{ background: "var(--surface)", border: "2px solid var(--danger)", boxShadow: "3px 3px 0 var(--danger)", color: "var(--danger)" }}
        >
          Me déconnecter
        </button>
      </form>
    </div>
  );
}
