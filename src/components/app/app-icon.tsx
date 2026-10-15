type IconName =
  | "home"
  | "books"
  | "star"
  | "plus"
  | "coin"
  | "wallet"
  | "book-open"
  | "moon"
  | "gift"
  | "handshake"
  | "check"
  | "trash"
  | "sparkles"
  | "close";

type Props = {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
};

// Small inline icon set (24×24, stroke-based) — no icon dependency.
export function AppIcon({ name, size = 20, className, strokeWidth = 2, filled = false }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
        </svg>
      );
    case "books":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="4" height="16" rx="1" />
          <rect x="8.5" y="4" width="4" height="16" rx="1" />
          <path d="m14.5 5.2 3.8-1 3.2 14.8-3.8 1z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common} fill={filled ? "currentColor" : "none"}>
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "coin":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="7" rx="7" ry="3" />
          <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
          <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6" />
          <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" />
        </svg>
      );
    case "book-open":
      return (
        <svg {...common}>
          <path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5Z" />
          <path d="M12 6.5v13" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common} fill={filled ? "currentColor" : "none"}>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      );
    case "gift":
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13" />
          <path d="M12 8S10.5 3.5 8 4.2C6 4.8 7 8 12 8Zm0 0s1.5-4.5 4-3.8C18 4.8 17 8 12 8Z" />
        </svg>
      );
    case "handshake":
      return (
        <svg {...common}>
          <path d="m11 17 2 2a1.4 1.4 0 0 0 2-2" />
          <path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a2.8 2.8 0 0 0-4 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a4 4 0 0 1 4.6-.7l.4.2a4 4 0 0 0 2 .5H21" />
          <path d="M21 4v10h-2M3 4h8M3 4v10l6.5 6.5a1.4 1.4 0 0 0 2-2" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common} fill={filled ? "currentColor" : "none"}>
          <path d="M12 3c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6Z" />
          <path d="M19 15c.25 1.6 1 2.4 2.5 2.5-1.5.25-2.25 1-2.5 2.5-.25-1.5-1-2.25-2.5-2.5 1.5-.1 2.25-.9 2.5-2.5Z" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
  }
}
