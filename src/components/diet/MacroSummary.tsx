import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Ring } from "@/components/nutrition-ui";
import { useT } from "@/lib/i18n";
import {
  DEFAULT_WATER_GOAL,
  getWaterForDate,
  getWaterGoal,
  setWaterForDate,
} from "@/lib/nutrition-local";
import type { DayTotals, NutritionTargets } from "@/lib/nutrition-types";

/** Carbs / protein / fat rings, with a compact hydration row underneath. */
export function MacroSummary({
  totals,
  targets,
  date,
  onOpenBreakdown,
}: {
  totals: DayTotals;
  targets: NutritionTargets;
  date: string;
  onOpenBreakdown?: () => void;
}) {
  const t = useT();
  const macros = [
    { label: t("Carbs"), current: totals.carbsG, target: targets.carbsG, color: "var(--chart-2)" },
    {
      label: t("Protein"),
      current: totals.proteinG,
      target: targets.proteinG,
      color: "var(--diet)",
    },
    { label: t("Fat"), current: totals.fatG, target: targets.fatG, color: "var(--chart-3)" },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {macros.map((m) => {
          const pct = Math.round((m.current / Math.max(1, m.target)) * 100);
          const left = Math.round(m.target - m.current);
          return (
            <button
              key={m.label}
              type="button"
              onClick={onOpenBreakdown}
              className="rounded-2xl border border-border bg-card p-3 text-left transition-colors active:bg-surface-2"
            >
              <p className="text-xs font-semibold">{m.label}</p>
              <div className="relative mx-auto mt-2 w-fit">
                <Ring pct={m.current / Math.max(1, m.target)} color={m.color} size={64} width={6} />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
                  {pct}%
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold tabular-nums">
                {Math.abs(left)}
                <span className="font-normal text-muted-foreground">
                  {left >= 0 ? t("g left") : t("g over")}
                </span>
              </p>
            </button>
          );
        })}
      </div>
      <WaterRow date={date} />
    </>
  );
}

function WaterRow({ date }: { date: string }) {
  const t = useT();
  const [tick, setTick] = useState(0);
  const glasses = useMemo(() => getWaterForDate(date), [date, tick]);
  const goal = useMemo(() => getWaterGoal() || DEFAULT_WATER_GOAL, [tick]);

  return (
    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2">
      <p className="text-xs font-semibold">{t("Water")}</p>
      <p className="flex-1 text-xs tabular-nums text-muted-foreground">
        {t("{ml} of {goalMl} ml", { ml: glasses * 250, goalMl: goal * 250 })}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={t("Remove a glass")}
          onClick={() => {
            setWaterForDate(date, glasses - 1);
            setTick((n) => n + 1);
          }}
          className="tap-target flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums">{glasses}</span>
        <button
          type="button"
          aria-label={t("Add a glass")}
          onClick={() => {
            setWaterForDate(date, glasses + 1);
            setTick((n) => n + 1);
          }}
          className="tap-target flex size-8 items-center justify-center rounded-full bg-diet text-background"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
