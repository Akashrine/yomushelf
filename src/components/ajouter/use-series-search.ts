"use client";

import { useEffect, useState } from "react";
import type { SearchHit } from "@/lib/manga-api/merge";

// Debounced catalogue search (shared catalogue, own private series, then
// MyAnimeList). Only the answer to what is typed now is exposed : no stale
// list, and no "Rien trouvé" before the search has even run.
export function useSeriesSearch(limit = 12) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [remoteDown, setRemoteDown] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // short queries show nothing
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/mangas/search?q=${encodeURIComponent(q)}&limit=${limit}`, { signal: ctrl.signal });
        const json = (await res.json()) as { results?: SearchHit[]; remote_unavailable?: boolean; error?: string };
        if (!res.ok) throw new Error(json.error ?? "search");
        setResults(json.results ?? []);
        setSearchedFor(q);
        setRemoteDown(Boolean(json.remote_unavailable));
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setSearchError("La recherche ne répond pas. Vérifie ta connexion et réessaie.");
          setSearchedFor(q);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, limit]);

  const ready = query.trim().length >= 2;
  const answered = ready && searchedFor === query.trim();
  return {
    query,
    setQuery,
    answered,
    results: answered && !searchError ? results : [],
    error: answered ? searchError : null,
    waiting: searching || (ready && !answered),
    remoteDown,
    reset: () => {
      setQuery("");
      setResults([]);
      setSearchedFor(null);
    },
  };
}
