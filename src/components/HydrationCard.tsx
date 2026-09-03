import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import {
  DEFAULT_WATER_GOAL,
  getWaterForDate,
  getWaterGoal,
  setWaterForDate,
  setWaterGoal,
} from "@/lib/nutrition-local";
import { isoDate } from "@/lib/data/nutrition";

/**
 * Compact daily hydration tracker (local-only). One glass = 250 ml.
 * Tap + / − to log glasses against a configurable daily goal.
 */
export function HydrationCard() {
  const t = useT();
  const today = useMemo(() => isoDate(new Date()), []);
  const [tick, setTick] = useState(0);
  const glasses = useMemo(() => getWaterForDate(today), [today, tick]);
  const goal = useMemo(() => getWaterGoal(), [tick]);
  const ml = glasses * 250;
  const goalMl = goal * 250;
  const pct = Math.min(100, (glasses / Math.max(1, goal)) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("Hydration")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("{ml} of {goalMl} ml", { ml, goalMl })}
          </p>
        </div>
        <button
          type="button"
          aria-label={t("Set goal")}
          onClick={() => {
            const next = window.prompt(t("Daily water goal (glasses)"), String(goal));
            if (next) setWaterGoal(Number(next) || DEFAULT_WATER_GOAL);
            setTick((n) => n + 1);
          }}
          className="tap-target rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground"
        >
          {t("Goal")} {goal}
        </button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-diet transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: Math.max(goal, glasses, 8) }).map((_, i) => (
            <span
              key={i}
              className={`size-3.5 rounded-full border transition-colors ${
                i < glasses ? "border-diet bg-diet" : "border-border bg-transparent"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("Remove a glass")}
            onClick={() => {
              setWaterForDate(today, glasses - 1);
              setTick((n) => n + 1);
            }}
            className="tap-target flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center text-sm font-semibold tabular-nums">{glasses}</span>
          <button
            type="button"
            aria-label={t("Add a glass")}
            onClick={() => {
              setWaterForDate(today, glasses + 1);
              setTick((n) => n + 1);
            }}
            className="tap-target flex size-9 items-center justify-center rounded-full bg-diet text-background"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
