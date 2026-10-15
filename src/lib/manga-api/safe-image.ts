// Downloads a cover image from a trusted provider, and nothing else.
//
// Every URL (the first one and each redirect target) must be HTTPS on an
// allowed host, without credentials or custom port. The body is read as a
// stream and cut off past MAX_IMAGE_BYTES whatever Content-Length says,
// the whole download is bounded in time, and the bytes must be a JPEG,
// PNG or WebP image (checked on the content, not on the declared type).

export const ALLOWED_IMAGE_HOSTS = new Set([
  "cdn.myanimelist.net", // MyAnimeList covers
  "books.google.com", // Google Books thumbnails
  "books.googleusercontent.com", // Google Books thumbnails (redirect target)
]);

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TIMEOUT_MS = 8_000;
export const MAX_REDIRECTS = 3;

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

export type UnsafeImageReason =
  | "invalid_url"
  | "forbidden_url"
  | "forbidden_redirect"
  | "too_many_redirects"
  | "http_error"
  | "too_large"
  | "not_image"
  | "timeout";

export class UnsafeImageError extends Error {
  constructor(public readonly reason: UnsafeImageReason, detail?: string) {
    super(detail ? `${reason}: ${detail}` : reason);
    this.name = "UnsafeImageError";
  }
}

export function assertAllowedImageUrl(raw: string, base?: URL): URL {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    throw new UnsafeImageError("invalid_url");
  }
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    !ALLOWED_IMAGE_HOSTS.has(url.hostname.toLowerCase())
  ) {
    throw new UnsafeImageError("forbidden_url", url.hostname);
  }
  return url;
}

// Magic numbers. SVG and anything text-based are refused on purpose.
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // WEBP
  ) {
    return "image/webp";
  }
  return null;
}

async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) {
    await res.body?.cancel().catch(() => {});
    throw new UnsafeImageError("too_large");
  }
  if (!res.body) {
    const all = new Uint8Array(await res.arrayBuffer());
    if (all.byteLength > max) throw new UnsafeImageError("too_large");
    return all;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      throw new UnsafeImageError("too_large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export type SafeImageOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
};

export async function fetchImageSafely(
  rawUrl: string,
  { fetchImpl = fetch, timeoutMs = IMAGE_TIMEOUT_MS, maxBytes = MAX_IMAGE_BYTES }: SafeImageOptions = {}
): Promise<{ bytes: Uint8Array; contentType: ImageType }> {
  let url = assertAllowedImageUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetchImpl(url.toString(), {
        redirect: "manual", // every hop is checked against the allowlist
        signal: controller.signal,
        headers: { Accept: "image/jpeg, image/png, image/webp" },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        await res.body?.cancel().catch(() => {});
        if (!location) throw new UnsafeImageError("http_error", `redirect without location`);
        try {
          url = assertAllowedImageUrl(location, url);
        } catch {
          throw new UnsafeImageError("forbidden_redirect", location);
        }
        res = null;
        continue;
      }
      break;
    }
    if (!res) throw new UnsafeImageError("too_many_redirects");
    if (!res.ok) throw new UnsafeImageError("http_error", String(res.status));

    const bytes = await readCapped(res, maxBytes);
    const contentType = sniffImageType(bytes);
    if (!contentType) throw new UnsafeImageError("not_image");
    return { bytes, contentType };
  } catch (err) {
    if (err instanceof UnsafeImageError) throw err;
    if (controller.signal.aborted) throw new UnsafeImageError("timeout");
    throw new UnsafeImageError("http_error", err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}
