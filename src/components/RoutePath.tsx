import { Check, Flag, MapPin } from "lucide-react";
import { buildRoute, pathThrough } from "@/lib/route/path";
import type { Checkpoint } from "@/lib/route/types";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The route itself: one curved line from where the user started to the goal,
 * with a node per checkpoint. Status is carried by tone and icon, never by red.
 */
export function RoutePath({
  checkpoints,
  currentId,
  startLabel,
  goalLabel,
  onSelect,
}: {
  checkpoints: Checkpoint[];
  currentId: string | null;
  startLabel: string;
  goalLabel: string;
  onSelect: (cp: Checkpoint) => void;
}) {
  const t = useT();
  const geo = buildRoute(checkpoints.length + 2);
  const nodes = geo.nodes;
  // The stretch already travelled: start up to the last achieved checkpoint,
  // drawn solid like the R itself; the rest stays dashed.
  const lastAchieved = checkpoints.reduce(
    (last, cp, i) => (cp.status === "achieved" ? i : last),
    -1,
  );
  const travelled = lastAchieved >= 0 ? pathThrough(nodes.slice(0, lastAchieved + 2)) : "";

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
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
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            className="text-primary"
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

      {checkpoints.map((cp, i) => {
        const node = nodes[i + 1]!;
        const achieved = cp.status === "achieved";
        const isCurrent = cp.id === currentId;
        return (
          <Marker key={cp.id} x={node.x} y={node.y} width={geo.width}>
            <button
              type="button"
              onClick={() => onSelect(cp)}
              className={cn(
                "tap-target flex max-w-[190px] items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors",
                achieved && "border-primary/40 bg-primary/10",
                isCurrent && "border-primary bg-primary/15 shadow-lg shadow-primary/20",
                !achieved && !isCurrent && "border-border bg-card",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums",
                  achieved ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {achieved ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold leading-tight">
                  {cp.title}
                </span>
                <span className="block text-[10px] text-muted-foreground tabular-nums">
                  {formatDate(cp.targetDate)}
                  {cp.status === "adjusted" ? ` · ${t("moved")}` : ""}
                  {cp.status === "missed" ? ` · ${t("open")}` : ""}
                </span>
              </span>
            </button>
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
