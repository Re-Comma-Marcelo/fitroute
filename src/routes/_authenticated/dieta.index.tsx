import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Sparkles } from "lucide-react";
import { MacroRings, MealCard } from "@/components/nutrition-ui";
import { MealDetailSheet } from "@/components/MealDetailSheet";
import { MealScheduleSheet } from "@/components/MealScheduleSheet";
import { AddMealSheet } from "@/components/AddMealSheet";
import { MealSwapCard } from "@/components/MealSwapCard";
import { rankMeals, swapSuggestion } from "@/lib/nutrition-swap";
import { getNutritionInsight } from "@/lib/coach/nutrition";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import {
  SLOT_LABEL,
  activeSlots,
  formatSlotTime,
  getMealSchedule,
  getMeals,
  getTargets,
  getTrainingTags,
  getWeekPlan,
  isoDate,
  setPlannedMeal,
  slotForTime,
  totalsFor,
  weekDates,
  weekTotalsFor,
} from "@/lib/data/nutrition";
import type { Meal, MealSlot, TrainingTag } from "@/lib/nutrition-types";

export const Route = createFileRoute("/_authenticated/dieta/")({
  head: () => ({
    meta: pageMeta({
      title: "Today's meals",
      description:
        "See the meal that fits the time of day, with calories, macros and coach notes tied to your training load.",
      ogDescription:
        "Time-aware meal suggestions with calories, macros and training-aware coach notes.",
    }),
  }),
  component: TodayPage,
});

function TodayPage() {
  const t = useT();
  const today = isoDate(new Date());
  const recentDates = useMemo(() => {
    const out: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(isoDate(d));
    }
    return out;
  }, []);
  const [slot, setSlot] = useState<MealSlot | null>(null);
  const [timingOpen, setTimingOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const qc = useQueryClient();

  const scheduleQ = useQuery({ queryKey: ["mealSchedule"], queryFn: getMealSchedule });
  const schedule = scheduleQ.data;
  const slots = useMemo(() => (schedule ? activeSlots(schedule) : []), [schedule]);
  // A slot the user picked wins, even while the schedule is refetching —
  // otherwise the tab snaps back to breakfast under them.
  const currentSlot: MealSlot =
    slot && (slots.length === 0 || slots.includes(slot))
      ? slot
      : schedule
        ? slotForTime(new Date(), schedule)
        : "breakfast";

  const targetsQ = useQuery({ queryKey: ["nutritionTargets"], queryFn: getTargets });
  const planQ = useQuery({ queryKey: ["weekPlan"], queryFn: getWeekPlan });
  const mealsQ = useQuery({
    queryKey: ["meals", currentSlot],
    queryFn: () => getMeals(currentSlot),
  });
  const insightQ = useQuery({ queryKey: ["nutritionInsight"], queryFn: getNutritionInsight });
  const tagsQ = useQuery({
    queryKey: ["trainingTags", today],
    queryFn: () => getTrainingTags([today]),
  });
  const recentQ = useQuery({
    queryKey: ["trainingTags", "recent", today],
    queryFn: () => getTrainingTags(recentDates),
  });

  const targets = targetsQ.data ?? { kcal: 2700, proteinG: 165, carbsG: 300, fatG: 75 };
  const day = planQ.data?.[today];
  const totals = useMemo(() => totalsFor(day), [day]);
  const tag = tagsQ.data?.[today];
  const recentTags = useMemo(() => {
    const days = recentQ.data ?? {};
    return recentDates.map((d) => days[d]).filter(Boolean) as TrainingTag[];
  }, [recentQ.data]);
  const weekTotals = useMemo(() => weekTotalsFor(planQ.data ?? {}, weekDates()), [planQ.data]);
  const [detail, setDetail] = useState<Meal | null>(null);

  const plannedMeal = useMemo(
    () => (mealsQ.data ?? []).find((m) => m.id === day?.[currentSlot]) ?? null,
    [mealsQ.data, day, currentSlot],
  );

  const swapCtx = useMemo(
    () => ({
      slot: currentSlot,
      targets,
      dayTotals: totals,
      currentMeal: plannedMeal,
      tag,
      recentTags,
    }),
    [currentSlot, targets, totals, plannedMeal, tag, recentTags],
  );

  const ranked = useMemo(() => rankMeals(mealsQ.data ?? [], swapCtx), [mealsQ.data, swapCtx]);
  const options = useMemo(() => ranked.map((r) => r.meal), [ranked]);
  const reasons = useMemo(() => new Map(ranked.map((r) => [r.meal.id, r.reason])), [ranked]);
  const swap = useMemo(() => swapSuggestion(mealsQ.data ?? [], swapCtx), [mealsQ.data, swapCtx]);

  async function choose(mealId: string) {
    const current = day?.[currentSlot];
    try {
      await setPlannedMeal(today, currentSlot, current === mealId ? null : mealId);
    } catch {
      toast.error(t("Could not save this meal. Try again."));
    }
    void qc.invalidateQueries({ queryKey: ["weekPlan"] });
  }

  const note = (meal: Meal) => reasons.get(meal.id);

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

      <nav className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1">
        {slots.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlot(s)}
            className={`tap-target shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors ${
              s === currentSlot
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {t(SLOT_LABEL[s])}
            {schedule ? (
              <span className="ml-1.5 font-normal opacity-60">
                {formatSlotTime(schedule[s].time)}
              </span>
            ) : null}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTimingOpen(true)}
          aria-label={t("Timing")}
          className="tap-target ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground"
        >
          <Clock className="size-4" /> {t("Timing")}
        </button>
      </nav>

      <Button
        variant="outline"
        className="tap-target mt-3 w-full"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="mr-1.5 size-4" /> {t("Add a meal")}
      </Button>

      {swap ? (
        <MealSwapCard
          suggestion={swap}
          onSwap={() => choose(swap.meal.id)}
          onDetails={() => setDetail(swap.meal)}
        />
      ) : null}

      <div className="mt-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          {t(SLOT_LABEL[currentSlot])}
          {schedule ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatSlotTime(schedule[currentSlot].time)}
            </span>
          ) : null}
        </h2>
        {tag ? (
          <span className="text-xs text-muted-foreground">
            {t("Today: {tag}", { tag: t(tag) })}
          </span>
        ) : null}
      </div>

      {!options.length && !mealsQ.isLoading ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center">
          <p className="font-display text-sm font-semibold">
            {t("No meal planned for this slot yet")}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {t(
              "This screen suggests what to eat around your training. Plan your week to fill these slots.",
            )}
          </p>
          <Button asChild className="tap-target mt-3">
            <Link to="/dieta/week">{t("Plan my week")}</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {options.map((meal) => (
            <li key={meal.id}>
              <MealCard
                meal={meal}
                slot={currentSlot}
                selected={day?.[currentSlot] === meal.id}
                note={note(meal)}
                onSelect={() => choose(meal.id)}
                onDetails={() => setDetail(meal)}
              />
            </li>
          ))}
        </ul>
      )}

      <MealDetailSheet
        meal={detail}
        slot={currentSlot}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        targets={targets}
        dayTotals={totals}
        weekTotals={weekTotals}
        planned={!!detail && day?.[currentSlot] === detail.id}
        trainingTag={tag}
        onToggle={async () => {
          if (detail) await choose(detail.id);
          setDetail(null);
        }}
      />
      <AddMealSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultSlot={currentSlot}
        onCreated={async (meal) => {
          await setPlannedMeal(today, currentSlot, meal.id);
          void qc.invalidateQueries({ queryKey: ["meals"] });
          void qc.invalidateQueries({ queryKey: ["weekPlan"] });
        }}
      />
      {schedule ? (
        <MealScheduleSheet open={timingOpen} onOpenChange={setTimingOpen} schedule={schedule} />
      ) : null}
    </>
  );
}
