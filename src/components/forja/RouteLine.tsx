/**
 * Compact dotted route for the Home card: one gentle curve from start to
 * goal, a node per checkpoint. The completed stretch is turquoise, the rest
 * muted. Colours come from theme.css tokens via `style` (CSS variables don't
 * resolve as raw SVG presentation attributes).
 */

const W = 320;
const H = 64;
const PAD = 10;
const SAMPLES = 80;

function point(t: number): { x: number; y: number } {
  const x = PAD + t * (W - PAD * 2);
  // A soft S-curve that rises towards the goal.
  const y = H / 2 + Math.sin(t * Math.PI * 1.6 + 0.4) * (H / 2 - PAD) * 0.75 - t * 4;
  return { x, y };
}

function pathBetween(from: number, to: number): string {
  if (to <= from) return "";
  const steps = Math.max(2, Math.round(SAMPLES * (to - from)));
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const p = point(from + ((to - from) * i) / steps);
    d += `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }
  return d;
}

export function RouteLine({
  total,
  reached,
  currentIndex,
  className,
}: {
  /** Number of checkpoints (the goal is drawn on top of these). */
  total: number;
  /** How many checkpoints are reached. */
  reached: number;
  /** Index of the checkpoint being worked towards, or -1 when none. */
  currentIndex: number;
  className?: string;
}) {
  // Checkpoints sit evenly between start (t=0) and goal (t=1).
  const ts = Array.from({ length: total }, (_, i) => (i + 1) / (total + 1));
  const progressT = reached > 0 ? (ts[Math.min(reached, total) - 1] ?? 0) : 0;
  const dotted = { strokeDasharray: "0 9", strokeLinecap: "round" as const, strokeWidth: 3.5 };
  const goal = point(1);
  const start = point(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden>
      <path
        d={pathBetween(progressT, 1)}
        fill="none"
        style={{ stroke: "var(--route-rest)", ...dotted }}
      />
      <path
        d={pathBetween(0, progressT)}
        fill="none"
        style={{ stroke: "var(--route-done)", ...dotted }}
      />
      <circle cx={start.x} cy={start.y} r={3.5} style={{ fill: "var(--route-done)" }} />
      {ts.map((t, i) => {
        const p = point(t);
        if (i < reached) {
          return <circle key={i} cx={p.x} cy={p.y} r={5} style={{ fill: "var(--route-done)" }} />;
        }
        if (i === currentIndex) {
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={11} style={{ fill: "var(--route-halo)" }} />
              <circle cx={p.x} cy={p.y} r={5.5} style={{ fill: "var(--route-node)" }} />
            </g>
          );
        }
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4.5}
            style={{ fill: "var(--bg)", stroke: "var(--route-upcoming)", strokeWidth: 1.5 }}
          />
        );
      })}
      <circle
        cx={goal.x - 2}
        cy={goal.y}
        r={6}
        style={{ fill: "var(--bg)", stroke: "var(--route-node)", strokeWidth: 2 }}
      />
    </svg>
  );
}
