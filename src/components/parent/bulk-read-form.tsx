"use client";

import { ReadUpTo } from "@/components/collection/read-up-to";

type Props = { series: { manga_id: string; title: string }[] };

// Readings from before Yomushelf, one series at a time.
export function BulkReadForm({ series }: Props) {
  if (series.length === 0) return null;
  return (
    <div className="manga-panel rounded-3xl p-5">
      <p className="mb-3 text-sm font-medium" style={{ color: "var(--muted)" }}>
        Pour une série lue avant d&apos;utiliser Yomushelf. Les lectures sont notées sans date.
      </p>
      <ReadUpTo series={series} />
    </div>
  );
}
