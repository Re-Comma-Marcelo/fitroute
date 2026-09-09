import { formatDateLong, formatKg } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { SessionDiff } from "@/lib/session-compare";
import { cn } from "@/lib/utils";

/** "This Upper A vs the last Upper A", per exercise. */
export function SessionDiffCard({
  diff,
  nameOf,
}: {
  diff: SessionDiff;
  nameOf: (exerciseId: string) => string;
}) {
  const t = useT();
  const moved = diff.exercises.filter((e) => e.volumePrev > 0 || e.volume > 0);
  if (!moved.length) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="label-caps">{t("Versus last time")}</h2>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {t("Compared with {date}", { date: formatDateLong(diff.previous.iniciadoEm) })}
        {" · "}
        <span
          className={cn(
            "font-semibold",
            diff.volumeDelta > 0 && "text-violet",
            diff.volumeDelta < 0 && "text-oxide",
          )}
        >
          {diff.volumeDelta > 0 ? "+" : diff.volumeDelta < 0 ? "−" : ""}
          {formatKg(Math.abs(diff.volumeDelta))}
        </span>{" "}
        {t("total volume")}
      </p>
      <ul className="mt-3 space-y-2">
        {moved.map((e) => {
          const weightDelta = e.bestWeight - e.bestWeightPrev;
          const volumeDelta = e.volume - e.volumePrev;
          return (
            <li key={e.exerciseId} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{nameOf(e.exerciseId)}</span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                {e.bestWeightPrev > 0
                  ? t("{prev} → {now}", {
                      prev: formatKg(e.bestWeightPrev),
                      now: formatKg(e.bestWeight),
                    })
                  : t("new")}
                <span
                  className={cn(
                    "ml-2",
                    (weightDelta || volumeDelta) > 0 && "text-violet",
                    (weightDelta || volumeDelta) < 0 && "text-oxide",
                  )}
                >
                  {weightDelta !== 0
                    ? `${weightDelta > 0 ? "+" : "−"}${formatKg(Math.abs(weightDelta))}`
                    : volumeDelta !== 0
                      ? t("{sign}{reps} reps", {
                          sign: e.reps - e.repsPrev > 0 ? "+" : "−",
                          reps: Math.abs(e.reps - e.repsPrev),
                        })
                      : t("same")}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
