"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type MangaRow = {
  id: string;
  title: string;
  author: string | null;
  publisher_fr: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  avg_price_eur: number;
  genre_primary: string | null;
  cover_url: string | null;
  top_50_rank: number | null;
};

type CollectionRow = {
  id: string;
  owned_volumes: number[];
  last_read_volume: number | null;
  status: "not_started" | "reading" | "caught_up" | "completed" | "dropped";
  updated_at: string;
  mangas: MangaRow | null;
};

type Props = {
  collections: CollectionRow[];
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Non commencé",
  reading: "En cours",
  caught_up: "À jour",
  completed: "Terminé",
  dropped: "Abandonné",
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "var(--muted)",
  reading: "#3b82f6",
  caught_up: "#22c55e",
  completed: "var(--accent)",
  dropped: "#6b7280",
};

type FilterStatus = "all" | "reading" | "caught_up" | "completed" | "dropped" | "not_started";

export function LibraryGrid({ collections }: Props) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<"updated" | "title" | "volumes">("updated");

  const filtered = useMemo(() => {
    let items = collections;

    if (filterStatus !== "all") {
      items = items.filter((c) => c.status === filterStatus);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) =>
          c.mangas?.title.toLowerCase().includes(q) ||
          c.mangas?.author?.toLowerCase().includes(q)
      );
    }

    return [...items].sort((a, b) => {
      if (sortBy === "title") {
        return (a.mangas?.title ?? "").localeCompare(b.mangas?.title ?? "");
      }
      if (sortBy === "volumes") {
        return (b.owned_volumes?.length ?? 0) - (a.owned_volumes?.length ?? 0);
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [collections, filterStatus, search, sortBy]);

  if (collections.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          placeholder="Rechercher une série…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            <option value="all">Tous les statuts</option>
            <option value="reading">En cours</option>
            <option value="caught_up">À jour</option>
            <option value="not_started">Non commencé</option>
            <option value="completed">Terminé</option>
            <option value="dropped">Abandonné</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "updated" | "title" | "volumes")}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            <option value="updated">Récents</option>
            <option value="title">Titre A→Z</option>
            <option value="volumes">Tomes possédés</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
        {filtered.length} série{filtered.length !== 1 ? "s" : ""}
        {filterStatus !== "all" || search ? " filtrées" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--muted)" }}>
          Aucune série ne correspond à ta recherche.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filtered.map((col) => (
            <MangaCard key={col.id} collection={col} />
          ))}
        </div>
      )}
    </div>
  );
}

function MangaCard({ collection }: { collection: CollectionRow }) {
  const manga = collection.mangas;
  if (!manga) return null;

  const owned = collection.owned_volumes?.length ?? 0;
  const total = manga.total_volumes;
  const slug = manga.id;

  return (
    <Link
      href={`/bibliotheque/${slug}`}
      className="group block rounded-xl overflow-hidden transition-all duration-150 active:scale-[0.97]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Cover */}
      <div
        className="w-full"
        style={{
          aspectRatio: "2/3",
          background: manga.cover_url
            ? `url(${manga.cover_url}) center/cover no-repeat, #1a1010`
            : "linear-gradient(160deg,#1a1010 0%,#0e0b0b 100%)",
          position: "relative",
        }}
      >
        {!manga.cover_url && (
          <div className="absolute inset-0 flex items-end p-2">
            <span className="text-[10px] font-bold leading-tight line-clamp-3" style={{ color: "var(--accent)" }}>
              {manga.title}
            </span>
          </div>
        )}
        {/* Status dot */}
        <div
          className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full"
          style={{ background: STATUS_COLORS[collection.status] }}
          title={STATUS_LABELS[collection.status]}
        />
      </div>

      {/* Info */}
      <div className="px-2 py-1.5">
        <p className="text-[11px] font-medium leading-tight line-clamp-2 group-hover:opacity-80 transition-opacity">
          {manga.title}
        </p>
        <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: "var(--muted)" }}>
          {owned}{total ? `/${total}` : ""} t.
        </p>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📚</div>
      <h2 className="text-lg font-semibold mb-2">Ta bibliothèque est vide</h2>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Commence par ajouter tes séries manga.
      </p>
      <Link
        href="/ajouter"
        className="px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
      >
        + Ajouter un manga
      </Link>
    </div>
  );
}
