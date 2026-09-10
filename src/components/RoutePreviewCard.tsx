import { Link } from "@tanstack/react-router";
import { ChevronRight, Flag } from "lucide-react";
import { buildPreview } from "@/lib/route/path";
import type { Checkpoint } from "@/lib/route/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
      className="mt-3 block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">{t("My route")}</p>
          <p className="font-display mt-0.5 truncate text-base font-semibold leading-tight">
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
        <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
      </div>

      <svg
        viewBox={`0 0 ${geo.width} ${geo.height}`}
        className="mt-3 w-full"
        style={{ height: geo.height }}
        aria-hidden
      >
        <path
          d={geo.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="2 8"
          className="text-border"
        />
        {geo.nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={i === 1 ? 7 : 5}
            className={cn(
              i === 0 && "fill-muted",
              i === 1 && "fill-primary",
              i === 2 && "fill-primary/40",
            )}
          />
        ))}
      </svg>

      {goalDate ? (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-primary tabular-nums">
          <Flag className="size-3.5" /> {t("Goal {date}", { date: formatDate(goalDate) })}
        </p>
      ) : null}
    </Link>
  );
}
