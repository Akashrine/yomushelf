// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { fetchImageSafely, sniffImageType, UnsafeImageError } from "./safe-image";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const MAL = "https://cdn.myanimelist.net/images/manga/3/55539.jpg";

function stream(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
}

function image(bytes: Uint8Array, headers: Record<string, string> = { "content-type": "image/jpeg" }) {
  return new Response(stream([bytes]), { status: 200, headers });
}

function redirect(location: string) {
  return new Response(null, { status: 302, headers: { location } });
}

async function reason(p: Promise<unknown>) {
  try {
    await p;
    return "ok";
  } catch (e) {
    return e instanceof UnsafeImageError ? e.reason : `unexpected: ${String(e)}`;
  }
}

describe("fetchImageSafely : forbidden URLs never reach the network", () => {
  const cases = [
    ["plain HTTP", "http://cdn.myanimelist.net/images/a.jpg"],
    ["other host", "https://evil.example.com/a.jpg"],
    ["look-alike host", "https://cdn.myanimelist.net.evil.example.com/a.jpg"],
    ["cloud metadata IP", "https://169.254.169.254/latest/meta-data/"],
    ["localhost", "https://localhost/a.jpg"],
    ["credentials in URL", "https://user:pass@cdn.myanimelist.net/a.jpg"],
    ["custom port", "https://cdn.myanimelist.net:8443/a.jpg"],
    ["other scheme", "file:///etc/passwd"],
    ["data URL", "data:image/png;base64,iVBORw0KGgo="],
  ];
  for (const [label, url] of cases) {
    it(`refuses ${label}`, async () => {
      const fetchImpl = vi.fn();
      expect(await reason(fetchImageSafely(url, { fetchImpl }))).toBe("forbidden_url");
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  }
  it("refuses a malformed URL", async () => {
    const fetchImpl = vi.fn();
    expect(await reason(fetchImageSafely("not a url", { fetchImpl }))).toBe("invalid_url");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("fetchImageSafely : redirects", () => {
  it("refuses a redirect to a host outside the allowlist", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(redirect("https://evil.example.com/a.jpg"));
    expect(await reason(fetchImageSafely(MAL, { fetchImpl }))).toBe("forbidden_redirect");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refuses a redirect downgrading to HTTP", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(redirect("http://cdn.myanimelist.net/a.jpg"));
    expect(await reason(fetchImageSafely(MAL, { fetchImpl }))).toBe("forbidden_redirect");
  });

  it("follows a redirect to an allowed host, asking for manual redirects", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(redirect("https://books.googleusercontent.com/cover.jpg"))
      .mockResolvedValueOnce(image(JPEG));
    const out = await fetchImageSafely("https://books.google.com/books/content?id=x", { fetchImpl });
    expect(out.contentType).toBe("image/jpeg");
    expect(fetchImpl.mock.calls[0][1].redirect).toBe("manual");
    expect(fetchImpl.mock.calls[1][0]).toBe("https://books.googleusercontent.com/cover.jpg");
  });

  it("stops after too many redirects", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => redirect(MAL));
    expect(await reason(fetchImageSafely(MAL, { fetchImpl }))).toBe("too_many_redirects");
  });
});

describe("fetchImageSafely : size", () => {
  it("refuses a body larger than the limit even without Content-Length", async () => {
    const chunk = new Uint8Array(64 * 1024);
    chunk.set(JPEG);
    const chunks = Array.from({ length: 10 }, () => chunk);
    const fetchImpl = vi.fn().mockResolvedValue(new Response(stream(chunks), { status: 200 }));
    expect(await reason(fetchImageSafely(MAL, { fetchImpl, maxBytes: 256 * 1024 }))).toBe("too_large");
  });

  it("refuses early when Content-Length announces too much", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(image(JPEG, { "content-length": String(50 * 1024 * 1024) }));
    expect(await reason(fetchImageSafely(MAL, { fetchImpl }))).toBe("too_large");
  });

  it("does not trust a Content-Length that lies low", async () => {
    const big = new Uint8Array(300 * 1024);
    big.set(JPEG);
    const fetchImpl = vi.fn().mockResolvedValue(new Response(stream([big]), { status: 200, headers: { "content-length": "10" } }));
    expect(await reason(fetchImageSafely(MAL, { fetchImpl, maxBytes: 256 * 1024 }))).toBe("too_large");
  });
});

describe("fetchImageSafely : content", () => {
  it("refuses HTML served as image/jpeg", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(image(HTML));
    expect(await reason(fetchImageSafely(MAL, { fetchImpl }))).toBe("not_image");
  });

  it("refuses SVG", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(image(SVG, { "content-type": "image/svg+xml" }));
    expect(await reason(fetchImageSafely(MAL, { fetchImpl }))).toBe("not_image");
  });

  it("refuses an HTTP error status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }));
    expect(await reason(fetchImageSafely(MAL, { fetchImpl }))).toBe("http_error");
  });

  it("detects the real type from the bytes", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(HTML)).toBeNull();
  });
});

describe("fetchImageSafely : time", () => {
  it("aborts a download that takes too long", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
    );
    expect(await reason(fetchImageSafely(MAL, { fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 50 }))).toBe("timeout");
  });

  it("aborts a body that trickles too slowly", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(JPEG);
              init?.signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")));
            },
          }),
          { status: 200 }
        )
      )
    );
    expect(await reason(fetchImageSafely(MAL, { fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 50 }))).toBe("timeout");
  });
});

describe("fetchImageSafely : legitimate cover", () => {
  it("returns the bytes and the detected type", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(image(PNG, { "content-type": "image/jpeg" }));
    const out = await fetchImageSafely(MAL, { fetchImpl });
    expect(out.contentType).toBe("image/png");
    expect(out.bytes.byteLength).toBe(PNG.byteLength);
  });
});
