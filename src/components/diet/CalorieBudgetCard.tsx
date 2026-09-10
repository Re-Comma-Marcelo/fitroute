import { Flame } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Remaining calories for the day, plus the estimated training burn. */
export function CalorieBudgetCard({
  eatenKcal,
  targetKcal,
  burnedKcal,
}: {
  eatenKcal: number;
  targetKcal: number;
  burnedKcal: number;
}) {
  const t = useT();
  const remaining = Math.round(targetKcal - eatenKcal);
  const pct = Math.min(100, Math.max(0, (eatenKcal / Math.max(1, targetKcal)) * 100));
  const over = remaining < 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {over ? (
            <>
              {t("You are")}{" "}
              <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                {Math.abs(remaining)}
              </span>{" "}
              {t("calories over")}
            </>
          ) : (
            <>
              {t("You can still eat")}{" "}
              <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                {remaining}
              </span>{" "}
              {t("calories")}
            </>
          )}
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-diet transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="mt-2 flex items-baseline justify-between text-xs">
        <span className="tabular-nums text-diet">
          {t("{kcal} calories eaten", { kcal: Math.round(eatenKcal) })}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {t("Goal: {kcal}", { kcal: Math.round(targetKcal) })}
        </span>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Flame className="size-3.5 text-train" />
        {t("{kcal} calories burned (estimated from your training)", {
          kcal: burnedKcal,
        })}
      </p>
    </section>
  );
}
