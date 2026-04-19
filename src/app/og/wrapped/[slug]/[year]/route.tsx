import { ImageResponse } from "next/og";
import { fetchOgWrapped } from "@/lib/og/data";

export const runtime = "edge";
export const revalidate = 3600;

const BG = "#0e0b0b";
const SURFACE = "#181212";
const ACCENT = "#c0392b";
const ACCENT2 = "#e74c3c";
const FG = "#f0ebe8";
const MUTED = "#7a6060";
const BORDER = "#2e2020";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; year: string }> }
) {
  const { slug, year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year)) return new Response("Invalid year", { status: 400 });

  const wrapped = await fetchOgWrapped(slug, year);
  if (!wrapped) return new Response("Not found", { status: 404 });

  const hasData = wrapped.total_volumes_added >= 10;
  const delta = wrapped.delta_vs_previous_year_pct;
  const top3 = wrapped.top_3_series.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 1080,
          height: 1920,
          background: BG,
          fontFamily: "sans-serif",
          padding: "72px 64px",
          position: "relative",
        }}
      >
        {/* Accent glow top */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 600,
            borderRadius: 300,
            background: `radial-gradient(circle, ${ACCENT}33 0%, transparent 70%)`,
          }}
        />

        {/* Logo + year label */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginBottom: 48,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 32, color: ACCENT }}>漫</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: FG }}>Yomushelf</span>
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            Wrapped {year}
          </span>
        </div>

        {/* Username */}
        <span style={{ fontSize: 28, color: MUTED, marginBottom: 48 }}>
          @{wrapped.username ?? slug}
        </span>

        {/* Big number */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 160,
              fontWeight: 700,
              color: FG,
              lineHeight: 1,
              letterSpacing: -4,
            }}
          >
            {hasData ? wrapped.total_volumes_added : "0"}
          </span>
          <span
            style={{
              fontSize: 24,
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: 4,
            }}
          >
            tomes ajoutés en {year}
          </span>
        </div>

        {/* Delta badge */}
        {delta !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 20,
              background: delta >= 0 ? "#22c55e22" : "#e74c3c22",
              border: `1px solid ${delta >= 0 ? "#22c55e44" : "#e74c3c44"}`,
              marginBottom: 64,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: delta >= 0 ? "#22c55e" : ACCENT2,
              }}
            >
              {delta >= 0 ? "+" : ""}{delta.toFixed(0)}% vs {year - 1}
            </span>
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            width: 80,
            height: 2,
            background: BORDER,
            borderRadius: 1,
            margin: "0 0 64px",
          }}
        />

        {/* Top 3 series */}
        {top3.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
              width: "100%",
              marginBottom: 64,
            }}
          >
            <span
              style={{
                fontSize: 16,
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: 4,
              }}
            >
              Top séries
            </span>
            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              {top3.map((s, i) => (
                <div
                  key={s.manga_id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    width: 240,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 240,
                      height: 360,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: SURFACE,
                      border: i === 0 ? `2px solid ${ACCENT}` : `1px solid ${BORDER}`,
                      position: "relative",
                    }}
                  >
                    {s.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.cover_url}
                        width={240}
                        height={360}
                        style={{ objectFit: "cover" }}
                        alt=""
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span style={{ color: ACCENT, fontSize: 14, fontWeight: 700, textAlign: "center", padding: 8 }}>
                          {s.title}
                        </span>
                      </div>
                    )}
                    {i === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          background: ACCENT,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "white",
                        }}
                      >
                        1
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      color: i === 0 ? FG : MUTED,
                      fontWeight: i === 0 ? 700 : 400,
                      textAlign: "center",
                      maxWidth: 230,
                    }}
                  >
                    {s.title.length > 20 ? s.title.slice(0, 20) + "…" : s.title}
                  </span>
                  <span style={{ fontSize: 12, color: MUTED }}>
                    {s.volumes_owned} t.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top genre */}
        {wrapped.top_genre && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 28px",
              borderRadius: 28,
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              marginBottom: 48,
            }}
          >
            <span style={{ fontSize: 16, color: MUTED }}>Genre dominant ·</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: FG }}>
              {wrapped.top_genre}
            </span>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
          <span style={{ fontSize: 20, color: MUTED }}>yomushelf.app</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
