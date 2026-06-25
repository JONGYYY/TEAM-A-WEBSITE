import React from "react";

const PATHS: Record<string, React.ReactNode> = {
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.5 6-4 1.5 2.5-6 4-1.5Z" /></>,
  gauge: <><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="m13.4 10.6 3.6-3.6" /><path d="M4 18a8 8 0 1 1 16 0" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></>,
  map: <><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  grad: <><path d="m12 4 10 5-10 5L2 9l10-5Z" /><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></>,
  award: <><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3M3 12v5c0 1.7 2.7 3 6 3" /><ellipse cx="15" cy="14" rx="6" ry="3" /><path d="M21 14v5c0 1.5-2 2.7-5 3" /></>,
  bookmark: <><path d="M6 3h12v18l-6-4-6 4V3Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
  moon: <><path d="M21 12.8A8 8 0 1 1 11.2 3 6 6 0 0 0 21 12.8Z" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  check: <><path d="m4 12 5 5L20 6" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z" /></>,
  sparkle: <><path d="M12 3c.6 4.5 1.5 5.4 6 6-4.5.6-5.4 1.5-6 6-.6-4.5-1.5-5.4-6-6 4.5-.6 5.4-1.5 6-6Z" /></>,
  code: <><path d="m9 8-5 4 5 4M15 8l5 4-5 4" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  palette: <><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2.5-1.5H18a3 3 0 0 0 3-3c0-4.4-4-6-9-6Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="16.5" cy="11" r="1" /></>,
  heart: <><path d="M12 20s-7-4.3-9.3-8.5C1 8 3 4.5 6.5 4.5c2 0 3.5 1.5 5.5 3.5 2-2 3.5-3.5 5.5-3.5C21 4.5 23 8 21.3 11.5 19 15.7 12 20 12 20Z" /></>,
  book: <><path d="M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4V4Z" /><path d="M20 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20V4Z" /></>,
  megaphone: <><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M15 8a4 4 0 0 1 0 8" /></>,
  rocket: <><path d="M5 15c-1 2-1 4-1 4s2 0 4-1M14 5c3-3 6-3 6-3s0 3-3 6l-7 7-3-3 7-7Z" /><circle cx="15" cy="9" r="1.2" /></>,
  ruler: <><rect x="3" y="8" width="18" height="8" rx="1" transform="rotate(45 12 12)" /></>,
  truck: <><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  leaf: <><path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z" /><path d="M5 19c4-4 8-6 12-7" /></>,
  scale: <><path d="M12 3v18M5 21h14M6 7h12M6 7 3 13h6L6 7Zm12 0-3 6h6l-3-6Z" /></>,
  flag: <><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></>,
  warning: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v5M12 18h.01" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
  upload: <><path d="M12 21V9M7 14l5-5 5 5M5 3h14" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></>,
  command: <><path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  quote: <><path d="M7 7H4v6h5V9c0-1.5 0-2 1-2.5M18 7h-3v6h5V9c0-1.5 0-2 1-2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.spark}
    </svg>
  );
}
