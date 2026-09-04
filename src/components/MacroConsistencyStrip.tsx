import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { totalsFor } from "@/lib/data/nutrition";
import type { MealSlot } from "@/lib/nutrition-types";

type DayPlan = Partial<Record<MealSlot, string>> | undefined;

/**
 * Week-at-a-glance macro consistency: one bar per day showing how close the
 * planned calories land to target, so gaps are obvious before the week starts.
 */
export function MacroConsistencyStrip({
  dates,
  plan,
  kcalTarget,
  proteinTarget,
}: {
  dates: string[];
  plan: Record<string, DayPlan> | undefined;
  kcalTarget: number | undefined;
  proteinTarget: number | undefined;
}) {
  const t = useT();
  if (!kcalTarget || !plan) return null;

  const days = dates.map((date) => {
    const totals = totalsFor(plan[date]);
    const kcalPct = kcalTarget > 0 ? (totals.kcal / kcalTarget) * 100 : 0;
    const proteinPct =
      proteinTarget && proteinTarget > 0 ? (totals.proteinG / proteinTarget) * 100 : 0;
    const onTarget = kcalPct >= 90 && kcalPct <= 110;
    return { date, totals, kcalPct, proteinPct, onTarget, empty: totals.kcal === 0 };
  });

  const onTargetDays = days.filter((d) => d.onTarget).length;
  const proteinDays = days.filter((d) => d.proteinPct >= 90).length;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm font-semibold">{t("Macro consistency")}</h2>
        <p className="text-xs tabular-nums text-muted-foreground">
          {t("{days}/7 on target", { days: onTargetDays })}
        </p>
      </div>
      <ul className="mt-3 flex items-end gap-1.5">
        {days.map((d) => (
          <li key={d.date} className="flex-1">
            <div className="relative h-16 overflow-hidden rounded-md bg-surface-3">
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 rounded-md transition-[height]",
                  d.empty
                    ? "bg-transparent"
                    : d.onTarget
                      ? "bg-diet"
                      : d.kcalPct > 110
                        ? "bg-warning"
                        : "bg-diet/40",
                )}
                style={{ height: `${Math.min(100, Math.round(d.kcalPct))}%` }}
              />
            </div>
            <p className="mt-1 text-center text-[10px] uppercase text-muted-foreground">
              {new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("Protein target met on {days} of 7 days", { days: proteinDays })}
      </p>
    </section>
  );
}
