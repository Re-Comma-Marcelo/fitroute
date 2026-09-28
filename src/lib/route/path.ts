/** SVG geometry for the route: an organically varied curve with a node per checkpoint. */

/** Deterministic pseudo-random in [0, 1), seeded by an integer — stable across renders. */
function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The curve through `nodes`, in order; the same shape `buildRoute` draws.
 * Each bend's control points are nudged asymmetrically (seeded by its index,
 * not randomly re-rolled) so consecutive bends don't all read as one
 * identical repeating wave.
 */
export function pathThrough(nodes: PathNode[]): string {
  if (!nodes.length) return "";
  let d = `M ${nodes[0]!.x} ${nodes[0]!.y}`;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]!;
    const node = nodes[i]!;
    const midY = (prev.y + node.y) / 2;
    const bulge = (hash01(i * 17 + 11) - 0.5) * (node.y - prev.y) * 0.18;
    d += ` C ${prev.x} ${midY + bulge}, ${node.x} ${midY - bulge}, ${node.x} ${node.y}`;
  }
  return d;
}

export interface PathNode {
  x: number;
  y: number;
}

export interface RouteGeometry {
  /** SVG path `d` attribute. */
  d: string;
  nodes: PathNode[];
  width: number;
  height: number;
}

/**
 * Builds a vertical snaking path for `count` nodes (start + checkpoints + goal).
 * Nodes still alternate left/right of the centre (so consecutive nodes never
 * collide), but three things vary per node so no two stretches of the route
 * read as the same shape: how far each swing reaches, how much vertical gap
 * follows it, and a slow drift of the centre line itself — so two nodes on
 * the same side, far apart in the route, don't land at the same x either.
 * The raw swing+drift is generous (it's what makes the route feel wide), but
 * every node is then clamped into a safe band so a marker pill centred on it
 * never runs past the edge of a narrow phone screen.
 */
export function buildRoute(count: number, width = 320, gap = 96): RouteGeometry {
  const n = Math.max(2, count);
  const cx = width / 2;
  const maxSwing = width / 2;
  const driftPhase = hash01(1) * Math.PI * 2;
  const safeMin = width * 0.25;
  const safeMax = width * 0.75;

  let y = 32;
  const nodes: PathNode[] = [];
  for (let i = 0; i < n; i++) {
    const isEnd = i === 0 || i === n - 1;
    const swingVariance = 0.55 + hash01(i * 7 + 3) * 0.8; // 0.55x - 1.35x
    const swing = maxSwing * (isEnd ? 0.4 : swingVariance);
    // Low-frequency sine, not per-node noise, so the centre line meanders in
    // slow sweeps across many nodes instead of jittering node to node.
    const drift = Math.sin(i * 0.35 + driftPhase) * (width * 0.12);
    const rawX = cx + drift + (i % 2 === 0 ? -swing : swing);
    nodes.push({ x: Math.max(safeMin, Math.min(safeMax, rawX)), y });
    if (i < n - 1) {
      const gapVariance = 0.75 + hash01(i * 13 + 5) * 0.6; // 0.75x - 1.35x
      y += gap * gapVariance;
    }
  }

  return { d: pathThrough(nodes), nodes, width, height: y + 32 };
}

/** Small three-node snippet used by the home preview card. */
export function buildPreview(width = 260, height = 84): RouteGeometry {
  const nodes: PathNode[] = [
    { x: 18, y: height - 20 },
    { x: width / 2, y: height / 2 - 6 },
    { x: width - 22, y: 22 },
  ];
  const d =
    `M ${nodes[0]!.x} ${nodes[0]!.y}` +
    ` C ${width * 0.3} ${height - 26}, ${width * 0.28} ${height / 2}, ${nodes[1]!.x} ${nodes[1]!.y}` +
    ` C ${width * 0.72} ${height / 2 - 12}, ${width * 0.7} ${28}, ${nodes[2]!.x} ${nodes[2]!.y}`;
  return { d, nodes, width, height };
}
