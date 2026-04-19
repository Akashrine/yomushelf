type Serie = {
  manga_id: string;
  title: string;
  cover_url: string | null;
  volumes_owned: number;
};

export function WrappedCardTopSeries({ series }: { series: Serie[] }) {
  const top = series.slice(0, 3);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-6 text-center">
      <p
        className="text-xs uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        Tes top séries
      </p>

      <div className="flex items-end justify-center gap-3 w-full">
        {/* Podium order: 2nd, 1st, 3rd */}
        {[top[1], top[0], top[2]].map((s, podiumIdx) => {
          if (!s) return <div key={podiumIdx} className="w-24" />;
          const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
          const isFirst = rank === 1;
          return (
            <div
              key={s.manga_id}
              className="flex flex-col items-center gap-2"
              style={{ width: isFirst ? 120 : 95 }}
            >
              <div
                className="rounded-xl overflow-hidden relative"
                style={{
                  width: isFirst ? 120 : 95,
                  height: isFirst ? 180 : 142,
                  background: "#1a1010",
                  border: isFirst ? "2px solid #c0392b" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {s.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.cover_url}
                    alt={s.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center p-2 text-center"
                    style={{ fontSize: 11, color: "#c0392b", fontWeight: 700 }}
                  >
                    {s.title}
                  </div>
                )}
                <div
                  className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: isFirst ? "#c0392b" : "rgba(0,0,0,0.6)",
                    color: "white",
                    fontSize: 10,
                  }}
                >
                  {rank}
                </div>
              </div>
              <p
                className="text-center leading-tight"
                style={{
                  fontSize: 11,
                  color: isFirst ? "white" : "rgba(255,255,255,0.6)",
                  fontWeight: isFirst ? 600 : 400,
                  maxWidth: isFirst ? 120 : 95,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {s.title}
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                {s.volumes_owned} t.
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
