import { CalendarCheck, Check, Dumbbell, Flag, MapPin, Weight } from "lucide-react";
import { buildRoute, pathThrough } from "@/lib/route/path";
import type { Checkpoint } from "@/lib/route/types";
import type { WeekMarker } from "@/lib/route/weight-progress";
import { useT } from "@/lib/i18n";
import { formatDate, formatKg } from "@/lib/format";
import { cn } from "@/lib/utils";

type RouteNode =
  | { kind: "checkpoint"; date: string; checkpoint: Checkpoint; ordinal: number }
  | { kind: "week"; date: string; marker: WeekMarker };

/** Small icon hinting what a checkpoint actually measures. */
function metricIcon(cp: Checkpoint) {
  switch (cp.metric?.kind) {
    case "lift":
      return Dumbbell;
    case "weight":
      return Weight;
    case "sessions":
      return CalendarCheck;
    default:
      return null;
  }
}

/**
 * The route itself: one curved line from where the user started to the goal,
 * with a node per checkpoint (and, for a weight goal, a smaller node per week
 * in between). Two overlaid tracks carry status, like the two lines under
 * each exercise in the session header: purple as soon as a point in time is
 * reached, white once the data actually confirms it.
 */
export function RoutePath({
  checkpoints,
  weekMarkers = [],
  currentId,
  startLabel,
  goalLabel,
  onSelect,
}: {
  checkpoints: Checkpoint[];
  /** Weekly weight read-outs between checkpoints — only passed for a weight goal. */
  weekMarkers?: WeekMarker[];
  currentId: string | null;
  startLabel: string;
  goalLabel: string;
  onSelect: (cp: Checkpoint) => void;
}) {
  const t = useT();

  let ordinal = 0;
  const middle: RouteNode[] = [
    ...checkpoints.map((cp): RouteNode => {
      ordinal += 1;
      return { kind: "checkpoint" as const, date: cp.targetDate, checkpoint: cp, ordinal };
    }),
    ...weekMarkers.map((w): RouteNode => ({
      kind: "week" as const,
      date: w.weekStartIso,
      marker: w,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const geo = buildRoute(middle.length + 2);
  const nodes = geo.nodes;
  const today = new Date().toISOString().slice(0, 10);

  // "Purple marks where you are [in time], white follows one step behind [as
  // the data confirms it]" — the same two-signal idea as the exercise
  // progress bar in the session header, just walked along the route's curve
  // instead of a straight segment.
  const timeReached = middle.map((n) =>
    n.kind === "checkpoint" ? today >= n.checkpoint.targetDate : today >= n.marker.weekEndIso,
  );
  const dataFilled = middle.map((n) =>
    n.kind === "checkpoint" ? n.checkpoint.status === "achieved" : n.marker.avgKg != null,
  );
  const lastTimeIdx = timeReached.reduce((last, v, i) => (v ? i : last), -1);
  const lastDataIdx = dataFilled.reduce((last, v, i) => (v ? i : last), -1);
  const purpleTravelled = lastTimeIdx >= 0 ? pathThrough(nodes.slice(0, lastTimeIdx + 2)) : "";
  const whiteTravelled = lastDataIdx >= 0 ? pathThrough(nodes.slice(0, lastDataIdx + 2)) : "";

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <svg
        viewBox={`0 0 ${geo.width} ${geo.height}`}
        className="w-full"
        style={{ height: geo.height }}
        aria-hidden
      >
        <defs>
          <linearGradient id="routeTravelled" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.2 286.2)" />
            <stop offset="100%" stopColor="oklch(0.5 0.23 286.2)" />
          </linearGradient>
        </defs>
        <path
          d={geo.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="2 10"
          className="text-border"
        />
        {purpleTravelled ? (
          <path
            d={purpleTravelled}
            fill="none"
            stroke="url(#routeTravelled)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        ) : null}
        {whiteTravelled ? (
          <path
            d={whiteTravelled}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="text-primary-foreground"
          />
        ) : null}
      </svg>

      {/* Start marker */}
      <Marker x={nodes[0]!.x} y={nodes[0]!.y} width={geo.width}>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <MapPin className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground">{startLabel}</span>
        </div>
      </Marker>

      {middle.map((n, i) => {
        const node = nodes[i + 1]!;
        if (n.kind === "week") {
          const has = n.marker.avgKg != null;
          return (
            <Marker key={`w_${n.date}`} x={node.x} y={node.y} width={geo.width}>
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl border px-2.5 py-1.5",
                  has
                    ? "border-primary-foreground/25 bg-card shadow-[0_0_16px_-6px_oklch(0.72_0.2_286.2)]"
                    : "border-dashed border-border/60",
                )}
              >
                <span className="whitespace-nowrap text-[8px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  {t("Week of {date}", { date: formatDate(n.marker.weekStartIso) })}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-bold tabular-nums",
                    has ? "text-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {has ? formatKg(n.marker.avgKg!) : "—"}
                </span>
              </div>
            </Marker>
          );
        }
        const cp = n.checkpoint;
        const achieved = cp.status === "achieved";
        const isCurrent = cp.id === currentId;
        const Icon = metricIcon(cp);
        return (
          <Marker key={cp.id} x={node.x} y={node.y} width={geo.width}>
            <div className="relative">
              {isCurrent ? (
                <span className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-primary/25 blur-md" />
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(cp)}
                className={cn(
                  "tap-target flex max-w-[190px] items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors",
                  achieved && "border-primary/40 bg-primary/10",
                  isCurrent &&
                    "border-primary bg-primary/15 shadow-[0_0_28px_-4px_oklch(0.6_0.23_286.2)]",
                  !achieved && !isCurrent && "border-border bg-card",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums",
                    achieved ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {achieved ? <Check className="size-3.5" /> : n.ordinal}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 truncate text-xs font-semibold leading-tight">
                    {Icon ? <Icon className="size-3 shrink-0 text-muted-foreground" /> : null}
                    <span className="truncate">{cp.title}</span>
                  </span>
                  <span className="block text-[10px] text-muted-foreground tabular-nums">
                    {formatDate(cp.targetDate)}
                    {cp.status === "adjusted" ? ` · ${t("moved")}` : ""}
                    {cp.status === "missed" ? ` · ${t("open")}` : ""}
                  </span>
                </span>
              </button>
            </div>
          </Marker>
        );
      })}

      {/* Goal marker */}
      <Marker x={nodes[nodes.length - 1]!.x} y={nodes[nodes.length - 1]!.y} width={geo.width}>
        <div className="flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-3 py-1.5">
          <Flag className="size-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-primary">{goalLabel}</span>
        </div>
      </Marker>
    </div>
  );
}

function Marker({
  x,
  y,
  width,
  children,
}: {
  x: number;
  y: number;
  width: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${(x / width) * 100}%`, top: y }}
    >
      {children}
    </div>
  );
}
