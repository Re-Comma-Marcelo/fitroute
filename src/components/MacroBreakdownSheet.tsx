import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n";
import { MEAL_SLOTS, SLOT_LABEL, allMeals } from "@/lib/data/nutrition";
import type { DayTotals, MealSlot, NutritionTargets } from "@/lib/nutrition-types";
import { Check, Utensils } from "lucide-react";

/**
 * Where today's numbers come from: every slot with what is planned, what was
 * actually eaten, and the macros each meal contributes.
 */
export function MacroBreakdownSheet({
  open,
  onOpenChange,
  planned,
  eaten,
  plannedTotals,
  eatenTotals,
  targets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planned: Partial<Record<MealSlot, string>> | undefined;
  eaten: Partial<Record<MealSlot, string>>;
  plannedTotals: DayTotals;
  eatenTotals: DayTotals;
  targets: NutritionTargets;
}) {
  const t = useT();
  const meals = allMeals();
  const mealName = (id?: string) => meals.find((m) => m.id === id);
  const left = Math.max(0, targets.kcal - eatenTotals.kcal);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("Where today's numbers come from")}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label={t("Eaten")} value={`${eatenTotals.kcal}`} tone="diet" />
          <Stat label={t("Planned")} value={`${plannedTotals.kcal}`} />
          <Stat label={t("Still to go")} value={`${left}`} />
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <MacroStat
            label={t("Protein")}
            value={eatenTotals.proteinG}
            target={targets.proteinG}
            tone="diet"
          />
          <MacroStat
            label={t("Carbs")}
            value={eatenTotals.carbsG}
            target={targets.carbsG}
            tone="train"
          />
          <MacroStat
            label={t("Fat")}
            value={eatenTotals.fatG}
            target={targets.fatG}
            tone="primary"
          />
        </div>

        <ul className="mt-4 space-y-2">
          {MEAL_SLOTS.map((slot) => {
            const plannedMeal = mealName(planned?.[slot]);
            const eatenMeal = mealName(eaten[slot]);
            const shown = eatenMeal ?? plannedMeal;
            return (
              <li key={slot} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{t(SLOT_LABEL[slot])}</span>
                  {eatenMeal ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-diet">
                      <Check className="size-3" /> {t("Eaten")}
                    </span>
                  ) : plannedMeal ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                      <Utensils className="size-3" /> {t("Planned")}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {t("Nothing yet")}
                    </span>
                  )}
                </div>
                {shown ? (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">{shown.name}</p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {shown.kcal} kcal · {t("P")} {shown.proteinG}g · {t("C")} {shown.carbsG}g ·{" "}
                      {t("F")} {shown.fatG}g
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("No meal planned for this slot yet")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-xs font-semibold">{t("Your daily targets")}</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {t(
              "Targets come from your weight, height, activity level and goal in your profile: {kcal} kcal, {protein}g protein, {carbs}g carbs, {fat}g fat.",
              {
                kcal: targets.kcal,
                protein: targets.proteinG,
                carbs: targets.carbsG,
                fat: targets.fatG,
              },
            )}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "diet" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${tone === "diet" ? "text-diet" : ""}`}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">kcal</p>
    </div>
  );
}

function MacroStat({
  label,
  value,
  target,
  tone,
}: {
  label: string;
  value: number;
  target: number;
  tone: "diet" | "train" | "primary";
}) {
  const pct = target > 0 ? Math.max(0, Math.min(100, (value / target) * 100)) : 0;
  const bar = tone === "diet" ? "bg-diet" : tone === "train" ? "bg-train" : "bg-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">
        {Math.round(value * 10) / 10}
        <span className="text-muted-foreground"> / {target}g</span>
      </p>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
