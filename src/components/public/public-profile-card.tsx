import type { OgProfile } from "@/lib/og/data";
import { ShareSheetTrigger } from "./share-sheet";

type Props = { profile: OgProfile; slug: string };

export function PublicProfileCard({ profile, slug }: Props) {
  const memberYear = new Date(profile.member_since).getFullYear();

  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Avatar */}
      <div
        className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
        style={{ background: "var(--accent)", color: "white" }}
      >
        {profile.avatar_initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold leading-tight">
              @{profile.username ?? slug}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Membre depuis {memberYear}
            </p>
          </div>
          <ShareSheetTrigger slug={slug} username={profile.username ?? slug} />
        </div>

        {profile.bio && (
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--muted)" }}>
            {profile.bio}
          </p>
        )}
      </div>
    </div>
  );
}
