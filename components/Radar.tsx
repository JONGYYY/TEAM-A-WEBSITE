"use client";

import { motion } from "framer-motion";

export function Radar({
  data,
  size = 280,
  onSelect,
}: {
  data: { label: string; value: number }[];
  size?: number;
  onSelect?: (index: number) => void;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 46;
  const n = data.length;
  const max = 5;

  const point = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const radius = (val / max) * r;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const rings = [1, 2, 3, 4, 5];
  const polygon = data.map((d, i) => point(i, d.value).join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={data.map((_, i) => point(i, ring).join(",")).join(" ")}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={1}
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, max);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--hairline)" strokeWidth={1} />;
      })}
      <motion.polygon
        points={polygon}
        fill="color-mix(in srgb, var(--marigold) 22%, transparent)"
        stroke="var(--marigold)"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "center" }}
      />
      {data.map((d, i) => {
        const [x, y] = point(i, d.value);
        return <circle key={i} cx={x} cy={y} r={3.5} fill="var(--marigold)" />;
      })}
      {data.map((d, i) => {
        const [x, y] = point(i, max + 0.55);
        const clickable = !!onSelect;
        return (
          <g
            key={i}
            onClick={clickable ? () => onSelect!(i) : undefined}
            style={clickable ? { cursor: "pointer" } : undefined}
          >
            {clickable && (
              <rect
                x={x - 34}
                y={y - 10}
                width={68}
                height={20}
                rx={10}
                fill="transparent"
              />
            )}
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.04em",
                fill: clickable ? "var(--ink-soft)" : "var(--ink-faint)",
                textTransform: "uppercase",
                fontWeight: clickable ? 600 : 400,
              }}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
