"use client";

import s from "./DonutChart.module.css";

export interface DonutSlice {
  outcomeId: string;
  label: string;
  count: number;
  pct: number;
}

/** Theme-aware slice colors that read well in both light and dark modes. */
const PALETTE = [
  "var(--ivy-bright)",
  "var(--marigold)",
  "var(--clay)",
  "#2bb3a3",
  "#b06bff",
  "#4a90e2",
  "#e6739f",
  "#8bc34a",
];

export function sliceColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

const SIZE = 168;
const STROKE = 22;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function DonutChart({
  data,
  completed,
  total,
}: {
  data: DonutSlice[];
  completed: number;
  total: number;
}) {
  const totalCount = data.reduce((acc, d) => acc + d.count, 0);
  const hasData = completed > 0 && totalCount > 0;

  let offset = 0;
  const arcs = hasData
    ? data
        .filter((d) => d.count > 0)
        .map((d, i) => {
          const frac = d.count / totalCount;
          const len = frac * C;
          const arc = { d, color: sliceColor(data.indexOf(d)), len, offset };
          offset += len;
          return arc;
        })
    : [];

  return (
    <div className={s.wrap}>
      <div className={s.chartCol}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Outcome distribution">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--paper-sunk)"
            strokeWidth={STROKE}
          />
          {arcs.map((a) => (
            <circle
              key={a.d.outcomeId}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={STROKE}
              strokeDasharray={`${a.len} ${C - a.len}`}
              strokeDashoffset={-a.offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              className={s.arc}
            />
          ))}
        </svg>
        <div className={s.center}>
          <span className={s.centerNum}>{completed}<span className={s.centerDen}>/{total}</span></span>
          <span className={s.centerLabel}>completed</span>
        </div>
      </div>

      <ul className={s.legend}>
        {data.map((d, i) => (
          <li key={d.outcomeId} className={s.legendRow} data-empty={d.count === 0 || undefined}>
            <span className={s.swatch} style={{ background: sliceColor(i) }} />
            <span className={s.legendLabel}>{d.label}</span>
            <span className={s.legendVal}>
              {d.count} <span className={s.legendPct}>({Math.round(d.pct)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
