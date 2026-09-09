import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { buildPreview } from "@/lib/route/path";
import type { Checkpoint } from "@/lib/route/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PanelStop } from "@/components/brand/Stop";

/**
 * Home-screen preview of the route: where you are, what is next, and how far
 * the goal still is. Tapping it opens the full route page.
 */
export function RoutePreviewCard({
  checkpoints,
  current,
  goalDate,
  loading,
}: {
  checkpoints: Checkpoint[];
  current: Checkpoint | null;
  goalDate: string | null;
  loading?: boolean;
}) {
  const t = useT();
  const geo = buildPreview();
  const achieved = checkpoints.filter((c) => c.status === "achieved").length;
  const total = checkpoints.length;
  const empty = !loading && total === 0;

  return (
    <Link
      to="/rota"
      className="relative block rounded-lg bg-card px-4 py-3 transition-colors hover:bg-stone/80"
    >
      <PanelStop />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">{t("My route")}</p>
          <p className="mt-0.5 truncate text-sm font-semibold leading-tight tracking-normal">
            {empty
              ? t("Map your route to your goal")
              : (current?.title ?? t("Every checkpoint reached"))}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {empty
              ? t("Set checkpoints on the way there")
              : current
                ? t("{achieved} of {total} checkpoints · next {date}", {
                    achieved,
                    total,
                    date: formatDate(current.targetDate),
                  })
                : t("{achieved} of {total} checkpoints", { achieved, total })}
          </p>
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </div>

      <svg
        viewBox={`0 0 ${geo.width} ${geo.height}`}
        className="mt-1.5 h-10 w-full"
        aria-hidden
      >
        <path
          d={geo.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="square"
          strokeLinejoin="miter"
          strokeDasharray="2 8"
          className="text-border"
        />
        {geo.nodes.map((n, i) => (
          <rect
            key={i}
            x={n.x - (i === geo.nodes.length - 1 ? 3 : 2)}
            y={n.y - (i === geo.nodes.length - 1 ? 3 : 2)}
            width={i === geo.nodes.length - 1 ? 6 : 4}
            height={i === geo.nodes.length - 1 ? 6 : 4}
            className={cn(
              i < geo.nodes.length - 1 && "fill-muted-foreground",
              i === geo.nodes.length - 1 && "fill-oxide",
            )}
          />
        ))}
      </svg>

      {goalDate ? (
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
          {t("Goal {date}", { date: formatDate(goalDate) })}
        </p>
      ) : null}
    </Link>
  );
}
