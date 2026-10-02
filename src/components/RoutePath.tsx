import { useState } from "react";
import { Check, Flag, MapPin } from "lucide-react";
import { RouteMark } from "@/components/RouteLogo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { buildRoute, pathThrough } from "@/lib/route/path";
import type { Checkpoint, ProgressPhoto } from "@/lib/route/types";
import type { WeekMarker } from "@/lib/route/weight-progress";
import { useT } from "@/lib/i18n";
import { formatDate, formatKg } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Colours come from theme.css tokens through the `style` prop (CSS custom
 * properties resolve there; they don't as raw SVG presentation attributes).
 */
const ROUTE = "var(--route-done)";
const HALO = "var(--route-halo)";

/**
 * What a checkpoint is about, without the "Goal 2:" / "Doelstelling 2:" lead
 * that every title carries — the node's number already says that, and the
 * lead pushed the actual value ("74,1 kg") out of the pill.
 */
function shortTitle(title: string): string {
  return title.replace(/^[^:]{1,24}:\s*/, "") || title;
}

type RouteNode =
  | { kind: "checkpoint"; date: string; checkpoint: Checkpoint; ordinal: number }
  | { kind: "week"; date: string; marker: WeekMarker };

/**
 * The route itself: one curved line from where the user started to the goal,
 * with a node per checkpoint (and, for a weight goal, a smaller node per week
 * in between). Two overlaid tracks carry status, like the two lines under
 * each exercise in the session header: turquoise as soon as a point in time is
 * reached, white once the data actually confirms it.
 */
export function RoutePath({
  checkpoints,
  weekMarkers = [],
  photos = [],
  currentId,
  startLabel,
  goalLabel,
  onSelect,
}: {
  checkpoints: Checkpoint[];
  /** Weekly weight read-outs between checkpoints — only passed for a weight goal. */
  weekMarkers?: WeekMarker[];
  /** Progress photos, so a week or checkpoint that has one shows a small preview. */
  photos?: ProgressPhoto[];
  currentId: string | null;
  startLabel: string;
  goalLabel: string;
  onSelect: (cp: Checkpoint) => void;
}) {
  const t = useT();
  const [viewingPhoto, setViewingPhoto] = useState<ProgressPhoto | null>(null);

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

  // The last checkpoint is the goal itself: it takes the flag at the end
  // instead of standing one step before a second, date-only goal marker.
  const lastNode = middle[middle.length - 1];
  const finalCp = lastNode?.kind === "checkpoint" ? lastNode.checkpoint : null;
  if (finalCp) middle.pop();

  const geo = buildRoute(middle.length + 2);
  const nodes = geo.nodes;
  const today = new Date().toISOString().slice(0, 10);

  // "Turquoise marks where you are [in time], white follows one step behind [as
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
  // The merged final checkpoint sits on the goal node, so reaching it runs the line to the end.
  const timeEnd = finalCp && today >= finalCp.targetDate ? middle.length : lastTimeIdx;
  const dataEnd = finalCp?.status === "achieved" ? middle.length : lastDataIdx;
  const travelled = timeEnd >= 0 ? pathThrough(nodes.slice(0, timeEnd + 2)) : "";
  const whiteTravelled = dataEnd >= 0 ? pathThrough(nodes.slice(0, dataEnd + 2)) : "";

  function photoForWeek(marker: WeekMarker): ProgressPhoto | undefined {
    return photos.find((p) => p.takenAt >= marker.weekStartIso && p.takenAt < marker.weekEndIso);
  }
  function photoForCheckpoint(cp: Checkpoint): ProgressPhoto | undefined {
    return photos.find((p) => p.checkpointId === cp.id);
  }

  return (
    <div className="relative mx-auto w-full max-w-[400px]">
      <svg
        viewBox={`0 0 ${geo.width} ${geo.height}`}
        className="w-full"
        style={{ height: geo.height }}
        aria-hidden
      >
        <path
          d={geo.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="2 10"
          className="text-border"
        />
        {travelled ? (
          <path
            d={travelled}
            fill="none"
            strokeWidth={4.5}
            strokeLinecap="round"
            // A CSS drop-shadow (not an SVG filter) gives the glow — far more
            // consistently supported.
            style={{ stroke: ROUTE, filter: `drop-shadow(0 0 6px ${HALO})` }}
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
          const photo = photoForWeek(n.marker);
          return (
            <Marker key={`w_${n.date}`} x={node.x} y={node.y} width={geo.width}>
              <div
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border px-2.5 py-1.5",
                  has ? "border-primary-foreground/25 bg-card" : "border-dashed border-border/60",
                )}
                style={has ? { boxShadow: `0 0 16px -6px ${HALO}` } : undefined}
              >
                {photo ? (
                  <button
                    type="button"
                    onClick={() => setViewingPhoto(photo)}
                    aria-label={t("View photo")}
                  >
                    <img
                      src={photo.url}
                      alt=""
                      loading="lazy"
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  </button>
                ) : null}
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
        const photo = photoForCheckpoint(cp);
        return (
          <Marker key={cp.id} x={node.x} y={node.y} width={geo.width}>
            <div className="relative">
              {isCurrent ? (
                <span className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-primary/35 blur-lg" />
              ) : null}
              {photo ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(photo);
                  }}
                  aria-label={t("View photo")}
                  className="absolute -right-1.5 -top-1.5 z-10"
                >
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    className="size-6 rounded-full border-2 border-background object-cover"
                  />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(cp)}
                className={cn(
                  "tap-target flex w-max max-w-[168px] items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors",
                  achieved && "border-primary/40 bg-primary/10",
                  isCurrent && "border-primary bg-primary/15",
                  !achieved && !isCurrent && "border-border bg-card",
                )}
                style={isCurrent ? { boxShadow: `0 0 40px -2px ${HALO}` } : undefined}
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
                  <span className="flex items-start gap-1 text-xs font-semibold leading-tight">
                    <RouteMark className="mt-px size-3 shrink-0" />
                    <span className="line-clamp-2">{shortTitle(cp.title)}</span>
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

      {/* Goal marker: the final checkpoint when there is one, else just the date. */}
      <Marker x={nodes[nodes.length - 1]!.x} y={nodes[nodes.length - 1]!.y} width={geo.width}>
        {finalCp ? (
          <button
            type="button"
            onClick={() => onSelect(finalCp)}
            className={cn(
              "tap-target flex w-max max-w-[180px] items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left",
              finalCp.status === "achieved"
                ? "border-primary bg-primary/25"
                : "border-primary/50 bg-primary/15",
            )}
            style={{ boxShadow: `0 0 28px -8px ${HALO}` }}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              {finalCp.status === "achieved" ? (
                <Check className="size-4" />
              ) : (
                <Flag className="size-3.5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">
                {t("Goal")}
              </span>
              <span className="line-clamp-2 text-sm font-bold leading-tight">
                {shortTitle(finalCp.title)}
              </span>
              <span className="block text-[10px] text-muted-foreground tabular-nums">
                {formatDate(finalCp.targetDate)}
              </span>
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-3 py-1.5">
            <Flag className="size-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">{goalLabel}</span>
          </div>
        )}
      </Marker>

      <Dialog open={viewingPhoto !== null} onOpenChange={(open) => !open && setViewingPhoto(null)}>
        <DialogContent className="max-w-sm border-none bg-transparent p-0 shadow-none">
          {viewingPhoto ? (
            <img
              src={viewingPhoto.url}
              alt={t("Progress photo")}
              className="w-full rounded-2xl object-cover"
            />
          ) : null}
        </DialogContent>
      </Dialog>
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
