import { ImageResponse } from "next/og";

export const alt = "Yomushelf : ses mangas, et où il en est";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link preview for shares of the site (the old /og-image.png never existed).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0e0b0b",
          color: "#f0ebe8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, color: "#a8918c", marginBottom: 32 }}>Yomushelf</div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.1 }}>Ses mangas,</div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.1, color: "#c0392b" }}>et où il en est.</div>
        <div style={{ display: "flex", fontSize: 34, color: "#a8918c", marginTop: 40 }}>
          Sa collection et sa lecture, tome par tome.
        </div>
      </div>
    ),
    size
  );
}
