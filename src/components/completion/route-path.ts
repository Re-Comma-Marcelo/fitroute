/**
 * Builds the in-between shapes LogoRouteReveal morphs through: a checkmark and
 * a wandering "route" line, both expressed as closed ribbon polygons in the
 * logo's own 1254-unit viewBox so flubber has like-for-like geometry to morph
 * between (a thin ribbon reads the same way the logo's own thick strokes do).
 */

interface Point {
  x: number;
  y: number;
}

const VB = 1254;
const CENTER = VB / 2;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleCubic(p0: Point, p1: Point, p2: Point, p3: Point, steps: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return pts;
}

/** Turns a centerline into a closed filled ribbon of `width` units — a stroke, expressed as fill. */
function ribbonFromCenterline(centerline: Point[], width: number): string {
  if (centerline.length < 2) return "";
  const half = width / 2;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[Math.max(0, i - 1)]!;
    const next = centerline[Math.min(centerline.length - 1, i + 1)]!;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const p = centerline[i]!;
    left.push({ x: p.x + nx * half, y: p.y + ny * half });
    right.push({ x: p.x - nx * half, y: p.y - ny * half });
  }
  const ring = [...left, ...right.reverse()];
  return (
    ring.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    " Z"
  );
}

/** A simple check mark, as a ribbon — the shape Phase 1 hands off to Phase 2. */
export const CHECK_RIBBON_PATH = ribbonFromCenterline(
  [
    { x: CENTER - 190, y: CENTER + 10 },
    { x: CENTER - 60, y: CENTER + 150 },
    { x: CENTER + 230, y: CENTER - 190 },
  ],
  70,
);

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A curvy, organic wandering line across the viewBox — never a straight
 * segment, always a handful of soft arcs. `offset` nudges the whole line
 * sideways so a second call reads as roughly parallel rather than identical.
 */
function wanderingRibbon(rng: () => number, offset: number): string {
  const segments = 4;
  let x = CENTER - 300 + offset;
  let y = CENTER - 260 + (rng() - 0.5) * 80;
  const centerline: Point[] = [{ x, y }];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const targetX = CENTER - 300 + offset + 600 * t;
    const targetY = CENTER - 260 + 520 * t + (rng() - 0.5) * 180;
    const c1x = lerp(x, targetX, 0.35) + (rng() - 0.5) * 160;
    const c1y = lerp(y, targetY, 0.35) + (rng() - 0.5) * 160;
    const c2x = lerp(x, targetX, 0.7) + (rng() - 0.5) * 160;
    const c2y = lerp(y, targetY, 0.7) + (rng() - 0.5) * 160;
    const sampled = sampleCubic(
      { x, y },
      { x: c1x, y: c1y },
      { x: c2x, y: c2y },
      { x: targetX, y: targetY },
      10,
    );
    centerline.push(...sampled.slice(1));
    x = targetX;
    y = targetY;
  }
  return ribbonFromCenterline(centerline, 60);
}

export interface RoutePathPair {
  outer: string;
  inner: string;
}

/** Two parallel-ish wandering lines, randomized on every call — the "vibe" stays, the path never repeats exactly. */
export function generateRoutePaths(): RoutePathPair {
  const rng = mulberry32((Math.random() * 2 ** 31) | 0);
  return {
    outer: wanderingRibbon(rng, -40),
    inner: wanderingRibbon(rng, 40),
  };
}
