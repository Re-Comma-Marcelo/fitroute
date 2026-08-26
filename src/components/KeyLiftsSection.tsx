import { Minus, Plus, TrendingDown, TrendingUp, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import type { LiftTrend } from "@/lib/progress-analytics";
import type { Exercise } from "@/lib/types";
import { relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface KeyLiftRow {
  exercise: Exercise;
  trend: LiftTrend | null;
}

export function KeyLiftsSection({
  rows,
  onAdd,
  onRemove,
}: {
  rows: KeyLiftRow[];
  onAdd: () => void;
  onRemove: (exerciseId: string) => void;
}) {
  const t = useT();
  return (
    <section className="mt-8">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="label-caps">{t("Key lifts")}</h2>
        <button
          type="button"
          onClick={onAdd}
          aria-label={t("Track a lift")}
          className="tap-target flex items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="size-4" /> {t("Track a lift")}
        </button>
      </header>

      {rows.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-2xl border border-dashed border-border p-5 text-left"
        >
          <p className="font-display text-sm font-semibold">
            {t("Pick the lifts you care about")}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {t(
              "Track bench, squat or anything else and see whether the load is actually going up.",
            )}
          </p>
        </button>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ exercise, trend }) => (
            <li
              key={exercise.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <ExerciseThumb grupo={exercise.grupoPrimario} nome={exercise.nome} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold leading-tight">
                  {exercise.nome}
                </p>
                {trend ? (
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {trend.spanWeeks === 1
                      ? t(
                          "{firstWeight}kg → {lastWeight}kg · {spanWeeks} week · {date}",
                          {
                            firstWeight: trend.firstWeight,
                            lastWeight: trend.lastWeight,
                            spanWeeks: trend.spanWeeks,
                            date: relativeDays(trend.lastDate),
                          },
                        )
                      : t(
                          "{firstWeight}kg → {lastWeight}kg · {spanWeeks} weeks · {date}",
                          {
                            firstWeight: trend.firstWeight,
                            lastWeight: trend.lastWeight,
                            spanWeeks: trend.spanWeeks,
                            date: relativeDays(trend.lastDate),
                          },
                        )}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("No sets logged yet")}
                  </p>
                )}
              </div>

              {trend ? (
                <Sparkline points={trend.points} direction={trend.direction} />
              ) : null}
              {trend ? <DirectionChip trend={trend} /> : null}

              <button
                type="button"
                onClick={() => onRemove(exercise.id)}
                aria-label={t("Stop tracking {name}", { name: exercise.nome })}
                className="tap-target -mr-1 flex w-8 items-center justify-center text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DirectionChip({ trend }: { trend: LiftTrend }) {
  const diff = Math.round((trend.lastWeight - trend.firstWeight) * 10) / 10;
  const Icon =
    trend.direction === "up"
      ? TrendingUp
      : trend.direction === "down"
        ? TrendingDown
        : Minus;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums",
        trend.direction === "up" && "bg-emerald-500/15 text-emerald-400",
        trend.direction === "down" && "bg-destructive/15 text-destructive",
        trend.direction === "flat" && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {diff > 0 ? `+${diff}` : diff}
    </span>
  );
}

function Sparkline({
  points,
  direction,
}: {
  points: number[];
  direction: LiftTrend["direction"];
}) {
  if (points.length < 2) return null;
  const w = 44;
  const h = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke =
    direction === "up"
      ? "rgb(52 211 153)"
      : direction === "down"
        ? "var(--destructive)"
        : "var(--muted-foreground)";
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}
