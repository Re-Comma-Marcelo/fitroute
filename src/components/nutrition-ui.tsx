/** The progress ring used by the macro summary. */
export function Ring({
  pct,
  color,
  size = 88,
  width = 8,
}: {
  pct: number;
  color: string;
  size?: number;
  width?: number;
}) {
  const r = size / 2 - width / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={width}
        stroke="var(--surface-3)"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={width}
        stroke={color}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(c * Math.min(1, Math.max(0, pct))).toFixed(1)} ${c}`}
      />
    </svg>
  );
}
