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

  if (!profile) return new Response("Not found", { status: 404 });

  const covers = profile.top_covers.filter((c) => c.cover_url).slice(0, 9);

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
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 64,
          }}
        >
          <span style={{ fontSize: 40, color: ACCENT }}>漫</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: FG }}>
            Yomushelf
          </span>
        </div>

        {/* Avatar + name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 100,
            height: 100,
            borderRadius: 50,
            background: ACCENT,
            fontSize: 36,
            fontWeight: 700,
            color: "white",
            marginBottom: 24,
          }}
        >
          {profile.avatar_initials}
        </div>
        <span style={{ fontSize: 40, fontWeight: 700, color: FG, marginBottom: 12 }}>
          @{profile.username ?? profile.public_slug}
        </span>
        {profile.bio && (
          <span
            style={{
              fontSize: 22,
              color: MUTED,
              textAlign: "center",
              maxWidth: 700,
              marginBottom: 16,
            }}
          >
            {profile.bio}
          </span>
        )}

        {/* Divider */}
        <div
          style={{
            width: 120,
            height: 2,
            background: ACCENT,
            borderRadius: 1,
            margin: "48px 0",
          }}
        />

        {/* Big stats */}
        <div
          style={{
            display: "flex",
            gap: 80,
            marginBottom: 80,
          }}
        >
          <BigStat value={String(profile.total_series)} label="séries" />
          <BigStat value={String(profile.total_volumes)} label="tomes" />
          {Number(profile.volumes_read) > 0 && (
            <BigStat value={String(profile.volumes_read)} label="lus" />
          )}
        </div>

        {/* Top genre badge */}
        {profile.highlights.top_genre && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 24px",
              borderRadius: 24,
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              marginBottom: 64,
            }}
          >
            <span style={{ fontSize: 16, color: MUTED }}>Genre favori ·</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: FG }}>
              {profile.highlights.top_genre}
            </span>
          </div>
        )}

        {/* Covers 3×3 */}
        {covers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, width: 952, justifyContent: "center", marginBottom: 64 }}>
            {covers.map((cover: TopCover) => (
              <div
                key={cover.manga_id}
                style={{
                  display: "flex",
                  width: 300,
                  height: 450,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover.cover_url!}
                  width={300}
                  height={450}
                  style={{ objectFit: "cover" }}
                  alt=""
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
          <span style={{ fontSize: 22, color: MUTED }}>yomushelf.app</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 80, fontWeight: 700, color: FG, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 20, color: MUTED, textTransform: "uppercase", letterSpacing: 3 }}>
        {label}
      </span>
    </div>
  );
}
