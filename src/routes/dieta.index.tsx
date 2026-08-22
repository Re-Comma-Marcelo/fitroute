import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { MacroRings, MealCard } from "@/components/nutrition-ui";
import { getNutritionInsight } from "@/lib/coach/nutrition";
import {
  MEAL_SLOTS,
  SLOT_LABEL,
  getMeals,
  getTargets,
  getTrainingTags,
  getWeekPlan,
  isoDate,
  setPlannedMeal,
  slotForTime,
  totalsFor,
} from "@/lib/data/nutrition";
import type { MealSlot } from "@/lib/nutrition-types";

export const Route = createFileRoute("/dieta/")({
  head: () => ({
    meta: [
      { title: "Today's meals — Forja" },
      {
        name: "description",
        content:
          "See the meal that fits the time of day, with calories, macros and coach notes tied to your training load.",
      },
      { property: "og:title", content: "Today's meals — Forja" },
      {
        property: "og:description",
        content: "Time-aware meal suggestions with calories, macros and training-aware coach notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const today = isoDate(new Date());
  const [slot, setSlot] = useState<MealSlot>(() => slotForTime());
  const qc = useQueryClient();

  const targetsQ = useQuery({ queryKey: ["nutritionTargets"], queryFn: getTargets });
  const planQ = useQuery({ queryKey: ["weekPlan"], queryFn: getWeekPlan });
  const mealsQ = useQuery({ queryKey: ["meals", slot], queryFn: () => getMeals(slot) });
  const insightQ = useQuery({ queryKey: ["nutritionInsight"], queryFn: getNutritionInsight });
  const tagsQ = useQuery({ queryKey: ["trainingTags", today], queryFn: () => getTrainingTags([today]) });

  const targets = targetsQ.data ?? { kcal: 2700, proteinG: 165, carbsG: 300, fatG: 75 };
  const day = planQ.data?.[today];
  const totals = useMemo(() => totalsFor(day), [day]);
  const tag = tagsQ.data?.[today];

  const options = useMemo(() => {
    const list = mealsQ.data ?? [];
    const wanted = tag === "Strength" ? "high-protein" : tag === "Cardio" ? "high-carb" : "light";
    return [...list].sort((a, b) => {
      const aw = a.tags.includes(wanted as never) ? 0 : 1;
      const bw = b.tags.includes(wanted as never) ? 0 : 1;
      return aw - bw;
    });
  }, [mealsQ.data, tag]);

  async function choose(mealId: string) {
    const current = day?.[slot];
    await setPlannedMeal(today, slot, current === mealId ? null : mealId);
    qc.invalidateQueries({ queryKey: ["weekPlan"] });
  }

  const note = (mealTags: string[]) => {
    if (tag === "Strength" && mealTags.includes("high-protein"))
      return "High protein — matches today's strength session.";
    if (tag === "Rest" && mealTags.includes("light")) return "Lighter option for a rest day.";
    return undefined;
  };

  return (
    <>
      {insightQ.data ? (
        <section className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">{insightQ.data.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{insightQ.data.body}</p>
            </div>
          </div>
        </section>
      ) : null}

      <MacroRings totals={totals} targets={targets} />

      <nav className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {MEAL_SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlot(s)}
            className={`tap-target shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors ${
              s === slot
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {SLOT_LABEL[s]}
          </button>
        ))}
      </nav>

      <div className="mt-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{SLOT_LABEL[slot]}</h2>
        {tag ? <span className="text-xs text-muted-foreground">Today: {tag}</span> : null}
      </div>

      <ul className="mt-3 space-y-3">
        {options.map((meal) => (
          <li key={meal.id}>
            <MealCard
              meal={meal}
              slot={slot}
              selected={day?.[slot] === meal.id}
              note={note(meal.tags)}
              onSelect={() => choose(meal.id)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
