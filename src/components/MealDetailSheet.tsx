import { Check, Clock, Flame, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mealImage } from "@/lib/meal-image";
import { SLOT_LABEL } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import type {
  DayTotals,
  Meal,
  MealSlot,
  NutritionTargets,
  TrainingTag,
} from "@/lib/nutrition-types";

const MACRO_KCAL = { proteinG: 4, carbsG: 4, fatG: 9 } as const;

function pct(n: number, d: number) {
  return Math.round((n / Math.max(1, d)) * 100);
}

/** Plain-language reason this meal fits (or not) today. */
function explanation(
  meal: Meal,
  targets: NutritionTargets,
  tag: TrainingTag | undefined,
  t: (s: string, v?: any) => string,
) {
  const proteinShare = pct(meal.proteinG, targets.proteinG);
  const kcalShare = pct(meal.kcal, targets.kcal);
  const parts: string[] = [];

  parts.push(
    t(
      "This meal covers {kcalShare}% of your daily calories and {proteinShare}% of your protein target.",
      { kcalShare, proteinShare },
    ),
  );

  if (tag === "Strength") {
    parts.push(
      meal.proteinG >= 30
        ? t("On a strength day that protein load supports muscle repair after training.")
        : t("On a strength day this is light on protein — pair it with a protein-rich snack."),
    );
  } else if (tag === "Cardio") {
    parts.push(
      meal.carbsG >= 60
        ? t("Carbs are high enough to refill glycogen for cardio work.")
        : t("Carbs are modest here, so keep it away from your run window or add a carb side."),
    );
  } else {
    parts.push(
      meal.kcal <= Math.round(targets.kcal / 4)
        ? t("Calories stay inside a rest-day portion, so recovery days don't drift over target.")
        : t("It is a bigger portion for a rest day — keep the other meals lighter."),
    );
  }

  const fatShare = pct(meal.fatG * MACRO_KCAL.fatG, meal.kcal);
  if (fatShare > 40)
    parts.push(
      t("Fat carries most of the calories, so digestion is slower — good further from training."),
    );
  else if (fatShare < 15)
    parts.push(t("Very low fat, which keeps it easy to digest close to a session."));

  if (meal.orderOut) parts.push(t("Ordered out — it does not add anything to your shopping list."));

  return parts.join(" ");
}

export function MealDetailSheet({
  meal,
  slot,
  open,
  onOpenChange,
  targets,
  dayTotals,
  weekTotals,
  planned,
  trainingTag,
  onToggle,
}: {
  meal: Meal | null;
  slot: MealSlot;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targets: NutritionTargets;
  dayTotals: DayTotals;
  weekTotals: DayTotals;
  planned: boolean;
  trainingTag?: TrainingTag | undefined;
  onToggle: () => void;
}) {
  const t = useT();
  if (!meal) return null;

  const macros = [
    {
      label: t("Protein"),
      grams: meal.proteinG,
      kcal: meal.proteinG * MACRO_KCAL.proteinG,
      target: targets.proteinG,
      color: "var(--chart-1)",
    },
    {
      label: t("Carbs"),
      grams: meal.carbsG,
      kcal: meal.carbsG * MACRO_KCAL.carbsG,
      target: targets.carbsG,
      color: "var(--chart-2)",
    },
    {
      label: t("Fat"),
      grams: meal.fatG,
      kcal: meal.fatG * MACRO_KCAL.fatG,
      target: targets.fatG,
      color: "var(--chart-3)",
    },
  ];
  const macroKcal = macros.reduce((s, m) => s + m.kcal, 0);

  // Daily impact: totals with this meal counted (avoid double counting if planned).
  const dayAfter = planned
    ? dayTotals
    : {
        kcal: dayTotals.kcal + meal.kcal,
        proteinG: dayTotals.proteinG + meal.proteinG,
        carbsG: dayTotals.carbsG + meal.carbsG,
        fatG: dayTotals.fatG + meal.fatG,
      };

  const weeklyTargets = {
    kcal: targets.kcal * 7,
    proteinG: targets.proteinG * 7,
    carbsG: targets.carbsG * 7,
    fatG: targets.fatG * 7,
  };
  const weekAfter = planned ? weekTotals : { ...weekTotals, kcal: weekTotals.kcal + meal.kcal };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto p-0">
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={mealImage(slot)}
            alt={meal.name}
            className="h-full w-full object-cover brightness-110"
          />
          <div className="absolute inset-0" style={{ background: "var(--gradient-veil)" }} />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="label-caps text-xs text-muted-foreground">{t(SLOT_LABEL[slot])}</p>
            <h2 className="font-display text-xl font-semibold leading-tight">{meal.name}</h2>
          </div>
        </div>

        <SheetHeader className="px-4 pb-0 pt-3 text-left">
          <SheetTitle className="sr-only">{meal.name}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
              <Flame className="size-3" /> {meal.kcal} kcal
            </span>
            <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
              {meal.orderOut ? <Truck className="size-3" /> : <Clock className="size-3" />}
              {meal.orderOut ? t("Order out") : t("{prepMin} min prep", { prepMin: meal.prepMin })}
            </span>
            {meal.tags
              .filter((t_tag) => t_tag !== "order-out")
              .map((t_tag) => (
                <span
                  key={t_tag}
                  className="rounded-full border border-border px-2 py-0.5 capitalize"
                >
                  {t(t_tag.replace("-", " "))}
                </span>
              ))}
          </div>
        </SheetHeader>

        <div className="space-y-5 p-4 pb-8">
          {/* Macro breakdown */}
          <section>
            <h3 className="label-caps text-xs text-muted-foreground">{t("Macro breakdown")}</h3>
            <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
              {macros.map((m) => (
                <div
                  key={m.label}
                  style={{
                    width: `${pct(m.kcal, macroKcal)}%`,
                    background: m.color,
                  }}
                />
              ))}
            </div>
            <ul className="mt-3 space-y-2.5">
              {macros.map((m) => (
                <li key={m.label} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: m.color }}
                      aria-hidden="true"
                    />
                    <span className="font-medium">{m.label}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {t("{grams}g · {kcal} kcal · {pct}% of meal · {dailyPct}% of daily", {
                      grams: m.grams,
                      kcal: m.kcal,
                      pct: pct(m.kcal, macroKcal),
                      dailyPct: pct(m.grams, m.target),
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Why it fits */}
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
            <h3 className="text-sm font-semibold">{t("Why this meal")}</h3>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {explanation(meal, targets, trainingTag, t)}
            </p>
          </section>

          {/* Daily impact */}
          <section>
            <h3 className="label-caps text-xs text-muted-foreground">
              {t("Impact on today {planned}", { planned: planned ? t("(already planned)") : "" })}
            </h3>
            <ul className="mt-2 space-y-2.5">
              {(
                [
                  [t("Calories"), dayTotals.kcal, dayAfter.kcal, targets.kcal, "kcal"],
                  [t("Protein"), dayTotals.proteinG, dayAfter.proteinG, targets.proteinG, "g"],
                  [t("Carbs"), dayTotals.carbsG, dayAfter.carbsG, targets.carbsG, "g"],
                  [t("Fat"), dayTotals.fatG, dayAfter.fatG, targets.fatG, "g"],
                ] as const
              ).map(([label, before, after, target, unit]) => (
                <li key={label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium">{label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {t("{after}/{target}{unit} · {left}{unit} left", {
                        after,
                        target,
                        unit,
                        left: Math.max(0, target - after),
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full bg-muted-foreground/60"
                      style={{ width: `${Math.min(100, pct(before, target))}%` }}
                    />
                    <div
                      className="h-full bg-diet"
                      style={{
                        width: `${Math.min(100 - Math.min(100, pct(before, target)), pct(after - before, target))}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("Grey is what is already planned today, purple is what this meal adds.")}
            </p>
          </section>

          {/* Weekly impact */}
          <section>
            <h3 className="label-caps text-xs text-muted-foreground">{t("Impact on the week")}</h3>
            <p className="mt-2 text-sm leading-snug text-muted-foreground">
              {t(
                "Your planned week sits at {kcal} kcal of {totalKcal} ({pct}% of the weekly budget). This meal alone is {mealPct}% of the week and {proteinPct}% of weekly protein.",
                {
                  kcal: weekAfter.kcal,
                  totalKcal: weeklyTargets.kcal,
                  pct: pct(weekAfter.kcal, weeklyTargets.kcal),
                  mealPct: pct(meal.kcal, weeklyTargets.kcal),
                  proteinPct: pct(meal.proteinG, weeklyTargets.proteinG),
                },
              )}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-diet"
                style={{ width: `${Math.min(100, pct(weekAfter.kcal, weeklyTargets.kcal))}%` }}
              />
            </div>
          </section>

          {/* Ingredients */}
          {meal.ingredients.length > 0 && (
            <section>
              <h3 className="label-caps text-xs text-muted-foreground">{t("Ingredients")}</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {meal.ingredients.map((ing) => (
                  <li key={ing.name} className="flex justify-between gap-3">
                    <span>{ing.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {ing.qty} {ing.unit} · {ing.aisle}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button
            onClick={onToggle}
            className="w-full font-semibold"
            variant={planned ? "outline" : "default"}
          >
            {planned ? (
              t("Remove from today")
            ) : (
              <>
                <Check className="mr-2 size-4" />{" "}
                {t("Plan for {slot}", { slot: t(SLOT_LABEL[slot]).toLowerCase() })}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
