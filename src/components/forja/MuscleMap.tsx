import { cn } from "@/lib/utils";

/**
 * A stylised body, front and back, built from one shape per muscle. Muscles a
 * routine trains are filled orange (the app's effort accent), muscles it hits
 * on the side half-orange, the rest stay a quiet silhouette. Keys are the
 * catalog's muscle groups (data/mocks.ts), so no mapping table is needed.
 *
 * Drawn on a 120x220 grid per figure; left-side shapes are mirrored.
 */

type Shape =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: "path"; d: string };

interface Part {
  group: string | null;
  shapes: Shape[];
  /** Mirror onto the right side of the figure. */
  mirror?: boolean;
}

const e = (cx: number, cy: number, rx: number, ry: number, rotate = 0): Shape => ({
  kind: "ellipse",
  cx,
  cy,
  rx,
  ry,
  rotate,
});
const p = (d: string): Shape => ({ kind: "path", d });

/** Shared by both figures: head, neck, hands, knees, feet. */
const FRAME: Part[] = [
  { group: null, shapes: [e(60, 17, 10, 12), p("M54 28 h12 v8 h-12 z")] },
  { group: null, shapes: [e(23, 113, 4, 6, 10)], mirror: true },
  { group: null, shapes: [e(50, 160, 6, 5), e(49, 211, 7, 3.5)], mirror: true },
];

const FRONT: Part[] = [
  { group: "Shoulders", shapes: [e(38, 46, 9, 8, -20)], mirror: true },
  {
    group: "Chest",
    shapes: [p("M45 41 Q58 39 59 44 L59 60 Q51 64 43 58 Q40 49 45 41 z")],
    mirror: true,
  },
  { group: "Biceps", shapes: [e(31, 68, 5.5, 11, 12)], mirror: true },
  { group: "Forearms", shapes: [e(26, 93, 4.8, 12, 10)], mirror: true },
  {
    group: "Core",
    shapes: [
      p("M52 65 h7 v10 h-7 z"),
      p("M52 77 h7 v10 h-7 z"),
      p("M52 89 h7 v12 Q55 104 52 101 z"),
      p("M44 66 Q49 72 50 84 L50 100 Q45 94 43 84 z"),
    ],
    mirror: true,
  },
  { group: "Quads", shapes: [e(50.5, 133, 8.5, 22, 4)], mirror: true },
  { group: "Adductors", shapes: [e(57.5, 122, 2.8, 11)], mirror: true },
  { group: "Calves", shapes: [e(49.5, 186, 5, 15, 2)], mirror: true },
];

const BACK: Part[] = [
  { group: "Traps", shapes: [p("M60 32 L46 43 Q53 48 60 62 Q67 48 74 43 z")] },
  { group: "Shoulders", shapes: [e(38, 47, 8.5, 7.5, 20)], mirror: true },
  {
    group: "Back",
    shapes: [p("M45 50 Q52 52 58 64 L58 88 Q50 86 46 78 Q42 64 45 50 z")],
    mirror: true,
  },
  { group: "Triceps", shapes: [e(31, 68, 5.5, 11, 12)], mirror: true },
  { group: "Forearms", shapes: [e(26, 93, 4.8, 12, 10)], mirror: true },
  { group: "Lower back", shapes: [p("M53 89 h14 v13 Q60 106 53 102 z")] },
  { group: "Glutes", shapes: [e(51, 113, 9, 9)], mirror: true },
  { group: "Hamstrings", shapes: [e(50.5, 140, 8, 19, 3)], mirror: true },
  { group: "Calves", shapes: [e(49.5, 184, 6.5, 15, 2)], mirror: true },
];

function render(shape: Shape, mirror: boolean, key: string, fill: string, opacity: number) {
  const transform = mirror ? "translate(120 0) scale(-1 1)" : undefined;
  if (shape.kind === "ellipse") {
    const rot = shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : "";
    return (
      <g key={key} transform={transform}>
        <ellipse
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx}
          ry={shape.ry}
          transform={rot || undefined}
          style={{ fill, opacity }}
        />
      </g>
    );
  }
  return <path key={key} d={shape.d} transform={transform} style={{ fill, opacity }} />;
}

function Figure({
  parts,
  primary,
  secondary,
  offsetX,
}: {
  parts: Part[];
  primary: Set<string>;
  secondary: Set<string>;
  offsetX: number;
}) {
  return (
    <g transform={`translate(${offsetX} 0)`}>
      {[...FRAME, ...parts].map((part, i) => {
        const on = part.group !== null && primary.has(part.group);
        const side = !on && part.group !== null && secondary.has(part.group);
        const fill = on || side ? "var(--effort)" : "var(--muscle-idle)";
        const opacity = on ? 1 : side ? 0.45 : 1;
        return part.shapes.flatMap((shape, j) => {
          const base = render(shape, false, `${i}-${j}`, fill, opacity);
          return part.mirror ? [base, render(shape, true, `${i}-${j}m`, fill, opacity)] : [base];
        });
      })}
    </g>
  );
}

export function MuscleMap({
  primary,
  secondary = [],
  className,
  label,
}: {
  /** Muscle groups the routine trains directly. */
  primary: Iterable<string>;
  /** Muscle groups it works on the side. */
  secondary?: Iterable<string>;
  className?: string;
  /** Accessible description, e.g. "Trains chest, shoulders and triceps". */
  label?: string;
}) {
  const main = new Set(primary);
  const side = new Set(secondary);
  return (
    <svg
      viewBox="0 0 240 220"
      className={cn("block", className)}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Figure parts={FRONT} primary={main} secondary={side} offsetX={0} />
      <Figure parts={BACK} primary={main} secondary={side} offsetX={120} />
    </svg>
  );
}

/** The muscle groups a routine trains, from its exercises in the catalog. */
export function routineMuscles(
  exerciseIds: string[],
  catalog: { id: string; grupoPrimario: string; gruposSecundarios: string[] }[],
): { primary: string[]; secondary: string[] } {
  const byId = new Map(catalog.map((ex) => [ex.id, ex]));
  const primary = new Set<string>();
  const secondary = new Set<string>();
  for (const id of exerciseIds) {
    const ex = byId.get(id);
    if (!ex) continue;
    primary.add(ex.grupoPrimario);
    ex.gruposSecundarios.forEach((g) => secondary.add(g));
  }
  return { primary: [...primary], secondary: [...secondary].filter((g) => !primary.has(g)) };
}
