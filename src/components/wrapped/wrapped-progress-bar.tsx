export function WrappedProgressBar({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex gap-1 px-4 pt-4">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="flex-1 h-0.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              background: "white",
              width: i < current ? "100%" : i === current ? "100%" : "0%",
              transitionDelay: i === current ? "0ms" : "0ms",
            }}
          />
        </div>
      ))}
    </div>
  );
}
