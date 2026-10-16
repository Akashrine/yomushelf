import type { GoogleBooksVolume, MangaSearchResult } from "./types";

const GB_BASE = "https://www.googleapis.com/books/v1/volumes";

// Without a key every call shares Google's anonymous daily quota, which is
// usually exhausted (429). GOOGLE_BOOKS_API_KEY gives the project its own.
function withKey(url: string): string {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  return key ? `${url}&key=${encodeURIComponent(key)}` : url;
}

// Thumbnails come as http:// with a page-curl effect ; https, no curl.
export function cleanThumbnail(raw: string): string {
  return raw.replace("http://", "https://").replace("&edge=curl", "");
}

function extractIsbn13(volume: GoogleBooksVolume): string | null {
  return (
    volume.volumeInfo.industryIdentifiers?.find((i) => i.type === "ISBN_13")
      ?.identifier ?? null
  );
}

export async function lookupByIsbn(
  isbn: string
): Promise<MangaSearchResult | null> {
  const clean = isbn.replace(/[-\s]/g, "");
  const url = withKey(`${GB_BASE}?q=isbn:${clean}&maxResults=1`);

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("Google Books unavailable");

  const data = (await res.json()) as {
    totalItems: number;
    items?: GoogleBooksVolume[];
  };

  if (!data.items?.length) return null;

  const vol = data.items[0];
  const info = vol.volumeInfo;

  const author = info.authors?.join(", ") ?? null;
  const isbn13 = extractIsbn13(vol) ?? clean;

  // Detect FR publisher
  const publisherFr = detectFrPublisher(info.publisher ?? "");

  // Cover: remove zoom param for better quality
  const rawCover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
  const cover_url = rawCover
    ? rawCover.replace("&zoom=1", "").replace("zoom=1&", "").replace("http://", "https://")
    : null;

  return {
    source: "google_books",
    external_id: isbn13,
    title: info.title,
    author,
    publisher_fr: publisherFr,
    total_volumes: null, // Google Books doesn't know manga series length
    status: "ongoing",
    avg_price_eur: 7.5,
    genre_primary: null, // unknown : never guessed
    cover_url,
    external_ids: { isbn_13: isbn13 },
  };
}

const FR_PUBLISHERS: Record<string, string> = {
  glénat: "Glénat",
  glenat: "Glénat",
  kana: "Kana",
  "ki-oon": "Ki-oon",
  kioon: "Ki-oon",
  panini: "Panini",
  pika: "Pika",
  kurokawa: "Kurokawa",
  delcourt: "Delcourt",
  tonkam: "Tonkam",
  ototo: "Ototo",
  mana: "Mana",
  meian: "Meian",
};

function detectFrPublisher(raw: string): string | null {
  const lower = raw.toLowerCase();
  for (const [key, value] of Object.entries(FR_PUBLISHERS)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

export type GoogleBooksItem = {
  title: string;
  subtitle?: string;
  publisher?: string;
  language?: string;
  isbn13: string | null;
  thumbnail: string | null;
};

// One page of a plain-text search (the intitle:/inpublisher: operators
// return empty pages too often). The API answers 503 at random : retried
// with backoff. Returns null when it never answered.
export async function searchBooks(
  query: string,
  startIndex: number,
  { attempts = 5, wait = (ms: number) => new Promise((r) => setTimeout(r, ms)) } = {}
): Promise<GoogleBooksItem[] | null> {
  const url = withKey(
    `${GB_BASE}?q=${encodeURIComponent(query)}&printType=books&maxResults=40&startIndex=${startIndex}`
  );
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { items?: GoogleBooksVolume[] };
        return (data.items ?? []).map((v) => ({
          title: v.volumeInfo.title,
          subtitle: v.volumeInfo.subtitle,
          publisher: v.volumeInfo.publisher,
          language: v.volumeInfo.language,
          isbn13: extractIsbn13(v),
          thumbnail: v.volumeInfo.imageLinks?.thumbnail ?? null,
        }));
      }
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      // network error : retry
    }
    await wait(1500 * (attempt + 1));
  }
  return null;
}
