/** SVG geometry for the route: a gentle S-curve with a node per checkpoint. */

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
 * Nodes alternate left/right of the centre so the line never runs straight.
 */
export function buildRoute(count: number, width = 320, gap = 96): RouteGeometry {
  const n = Math.max(2, count);
  const height = gap * (n - 1) + 64;
  const cx = width / 2;
  const swing = Math.min(90, width / 2 - 44);

  const nodes: PathNode[] = Array.from({ length: n }, (_, i) => ({
    x: cx + (i % 2 === 0 ? -swing : swing) * (i === 0 || i === n - 1 ? 0.45 : 1),
    y: 32 + gap * i,
  }));

  let d = `M ${nodes[0]!.x} ${nodes[0]!.y}`;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]!;
    const node = nodes[i]!;
    const midY = (prev.y + node.y) / 2;
    d += ` C ${prev.x} ${midY}, ${node.x} ${midY}, ${node.x} ${node.y}`;
  }
  return { d, nodes, width, height };
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
