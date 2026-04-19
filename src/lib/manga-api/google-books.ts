import type { GoogleBooksVolume, MangaSearchResult } from "./types";

const GB_BASE = "https://www.googleapis.com/books/v1/volumes";

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
  const url = `${GB_BASE}?q=isbn:${clean}&maxResults=1`;

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;

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
    genre_primary: "Shōnen",
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
