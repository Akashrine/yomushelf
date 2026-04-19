import { ImageResponse } from "next/og";
import { fetchOgProfile } from "@/lib/og/data";
import type { TopCover } from "@/lib/og/data";

export const runtime = "edge";
export const revalidate = 3600;

const BG = "#0e0b0b";
const SURFACE = "#181212";
const ACCENT = "#c0392b";
const FG = "#f0ebe8";
const MUTED = "#7a6060";
const BORDER = "#2e2020";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const profile = await fetchOgProfile(slug);

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const covers = profile.top_covers.filter((c) => c.cover_url).slice(0, 8);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: 1200,
          height: 630,
          background: BG,
          fontFamily: "sans-serif",
        }}
      >
        {/* Left panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 400,
            height: 630,
            padding: "48px 40px",
            borderRight: `1px solid ${BORDER}`,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28, color: ACCENT }}>漫</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: FG }}>
              Yomushelf
            </span>
          </div>

          {/* Identity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Avatar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 36,
                background: ACCENT,
                fontSize: 26,
                fontWeight: 700,
                color: "white",
              }}
            >
              {profile.avatar_initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: FG }}>
                @{profile.username ?? profile.public_slug}
              </span>
              {profile.bio && (
                <span style={{ fontSize: 15, color: MUTED, lineHeight: 1.4 }}>
                  {profile.bio}
                </span>
              )}
            </div>

            {/* Stats */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "20px 0",
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <StatRow label="Séries" value={String(profile.total_series)} />
              <StatRow label="Tomes" value={String(profile.total_volumes)} />
              {Number(profile.volumes_read) > 0 && (
                <StatRow label="Lus" value={String(profile.volumes_read)} />
              )}
              {profile.highlights.completed_series > 0 && (
                <StatRow
                  label="Complétées"
                  value={String(profile.highlights.completed_series)}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <span style={{ fontSize: 13, color: MUTED }}>yomushelf.app</span>
        </div>

        {/* Right panel — covers grid */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: 32,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {covers.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                width: 740,
              }}
            >
              {covers.map((cover: TopCover) => (
                <div
                  key={cover.manga_id}
                  style={{
                    display: "flex",
                    width: 175,
                    height: 262,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover.cover_url!}
                    width={175}
                    height={262}
                    style={{ objectFit: "cover" }}
                    alt=""
                  />
                </div>
              ))}
            </div>
          ) : (
            <span style={{ color: MUTED, fontSize: 18 }}>
              Aucune couverture disponible
            </span>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 14, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: FG }}>{value}</span>
    </div>
  );
}
