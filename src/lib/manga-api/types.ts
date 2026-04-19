// Normalized manga result — shared by MAL, Google Books, and DB
export type MangaSearchResult = {
  source: "mal" | "google_books" | "db";
  external_id: string;       // MAL id (string) or ISBN-13
  title: string;
  title_fr?: string;         // alternative title in French if available
  author: string | null;
  publisher_fr: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed" | "paused";
  avg_price_eur: number;
  genre_primary: string | null;
  cover_url: string | null;  // always a remote URL — must be cached before storing
  external_ids: {
    mal_id?: number;
    isbn_13?: string;
    nautiljon_slug?: string;
  };
};

// MAL API raw types
export type MALMangaNode = {
  id: number;
  title: string;
  main_picture?: {
    medium: string;
    large: string;
  };
  alternative_titles?: {
    synonyms?: string[];
    en?: string;
    ja?: string;
  };
  start_date?: string;
  end_date?: string;
  status?: "finished" | "currently_publishing" | "not_yet_published" | "on_hiatus" | "discontinued";
  num_volumes?: number;
  genres?: Array<{ id: number; name: string }>;
  authors?: Array<{ node: { id: number; first_name: string; last_name: string }; role: string }>;
  serialization?: Array<{ node: { id: number; name: string }; role: string }>;
};

// Google Books raw types
export type GoogleBooksVolume = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    categories?: string[];
    pageCount?: number;
  };
};
