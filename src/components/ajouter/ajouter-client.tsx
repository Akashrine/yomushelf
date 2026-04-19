"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addMangaFromExternalSource, lookupIsbn } from "@/app/(app)/ajouter/actions";

type SearchResult = {
  id?: string;
  external_id?: string;
  source?: string;
  title: string;
  author: string | null;
  publisher_fr: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  avg_price_eur?: number;
  genre_primary: string | null;
  cover_url: string | null;
  external_ids?: { mal_id?: number; isbn_13?: string };
};

type ConfirmState = {
  manga: SearchResult;
  volumeNumber: string;
} | null;

const STATUS_LABELS = {
  ongoing: "En cours",
  completed: "Terminée",
  paused: "En pause",
};

export function AjouterClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [isPending, startTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);
  const [isbnQuery, setIsbnQuery] = useState("");
  const [tab, setTab] = useState<"search" | "isbn">("search");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/mangas/search?q=${encodeURIComponent(q)}&limit=12`);
      if (!res.ok) throw new Error();
      const json = await res.json() as { results: SearchResult[] };
      setResults(json.results ?? []);
    } catch {
      setSearchError("Erreur lors de la recherche.");
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  }

  function handleIsbnLookup() {
    if (!isbnQuery.trim()) return;
    startTransition(async () => {
      setAddError(null);
      const fd = new FormData();
      fd.set("isbn", isbnQuery);
      const result = await lookupIsbn(fd);
      if (!result.success) {
        setAddError(result.error);
        return;
      }
      setConfirm({
        manga: result.manga as SearchResult,
        volumeNumber: result.volume_number ? String(result.volume_number) : "",
      });
    });
  }

  function handleConfirmAdd() {
    if (!confirm) return;
    setAddError(null);
    startTransition(async () => {
      const fd = new FormData();
      const m = confirm.manga;

      // If manga already exists in our DB, pass its id directly — no insert needed
      if (m.id) {
        fd.set("existing_manga_id", m.id);
      } else {
        fd.set("title", m.title);
        if (m.author) fd.set("author", m.author);
        if (m.publisher_fr) fd.set("publisher_fr", m.publisher_fr);
        if (m.total_volumes) fd.set("total_volumes", String(m.total_volumes));
        fd.set("status", m.status);
        if (m.cover_url) fd.set("cover_url", m.cover_url);
        if (m.genre_primary) fd.set("genre_primary", m.genre_primary);
        if (m.external_ids?.mal_id) fd.set("mal_id", String(m.external_ids.mal_id));
        if (m.external_ids?.isbn_13) fd.set("isbn_13", m.external_ids.isbn_13);
      }
      if (confirm.volumeNumber) fd.set("volume_number", confirm.volumeNumber);

      const result = await addMangaFromExternalSource(fd);
      if (!result.success) {
        setAddError(result.error);
        return;
      }
      router.push(`/bibliotheque/${result.manga_id}`);
    });
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/bibliotheque" className="text-sm transition-opacity hover:opacity-70" style={{ color: "var(--muted)" }}>
          ← Bibliothèque
        </Link>
        <h1 className="text-sm font-semibold ml-auto">Ajouter un manga</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "var(--surface)" }}>
          {(["search", "isbn"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === t ? "var(--surface-raised)" : "transparent",
                color: tab === t ? "var(--foreground)" : "var(--muted)",
              }}
            >
              {t === "search" ? "🔍 Recherche" : "📷 ISBN / Code-barres"}
            </button>
          ))}
        </div>

        {/* Search tab */}
        {tab === "search" && (
          <div>
            <input
              type="search"
              placeholder="Titre, auteur…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />

            {searching && (
              <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Recherche…</p>
            )}
            {searchError && (
              <p className="text-sm text-center py-4" style={{ color: "#e74c3c" }}>{searchError}</p>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((manga, i) => (
                  <button
                    key={manga.id ?? manga.external_id ?? i}
                    type="button"
                    onClick={() => setConfirm({ manga, volumeNumber: "" })}
                    className="w-full flex gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.99]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <div
                      className="shrink-0 rounded-lg overflow-hidden"
                      style={{
                        width: 44,
                        aspectRatio: "2/3",
                        background: manga.cover_url
                          ? `url(${manga.cover_url}) center/cover no-repeat, #1a1010`
                          : "linear-gradient(160deg,#1a1010 0%,#0e0b0b 100%)",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-1">{manga.title}</p>
                      {manga.author && (
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--muted)" }}>{manga.author}</p>
                      )}
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {manga.publisher_fr && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface-raised)", color: "var(--muted)" }}>
                            {manga.publisher_fr}
                          </span>
                        )}
                        {manga.total_volumes && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface-raised)", color: "var(--muted)" }}>
                            {manga.total_volumes} t.
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface-raised)", color: "var(--muted)" }}>
                          {STATUS_LABELS[manga.status]}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 self-center text-xs font-medium" style={{ color: "var(--accent)" }}>
                      + Ajouter
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!searching && query && results.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
                  Aucun résultat pour « {query} ».
                </p>
              </div>
            )}
          </div>
        )}

        {/* ISBN tab */}
        {tab === "isbn" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Saisis l'ISBN-13 imprimé au dos du tome (ou scanne le code-barres avec l'appareil photo).
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                inputMode="numeric"
                placeholder="978-2-XXX-XXXXX-X"
                value={isbnQuery}
                onChange={(e) => setIsbnQuery(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <button
                type="button"
                onClick={handleIsbnLookup}
                disabled={isPending || !isbnQuery.trim()}
                className="px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {isPending ? "…" : "Chercher"}
              </button>
            </div>
            {addError && tab === "isbn" && (
              <p className="text-xs text-center" style={{ color: "#e74c3c" }}>{addError}</p>
            )}
          </div>
        )}
      </main>

      {/* Confirm drawer */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setConfirm(null)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-base font-semibold mb-1">{confirm.manga.title}</h2>
            {confirm.manga.author && (
              <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>{confirm.manga.author}</p>
            )}

            <label className="text-xs block mb-1.5" style={{ color: "var(--muted)" }}>
              Tome spécifique (optionnel)
            </label>
            <input
              type="number"
              min="1"
              placeholder="N° du tome — laisser vide pour ajouter la série"
              value={confirm.volumeNumber}
              onChange={(e) => setConfirm({ ...confirm, volumeNumber: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-4"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />

            {addError && (
              <p className="text-xs mb-3 text-center" style={{ color: "#e74c3c" }}>{addError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setConfirm(null); setAddError(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {isPending ? "Ajout…" : "Ajouter à ma collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
