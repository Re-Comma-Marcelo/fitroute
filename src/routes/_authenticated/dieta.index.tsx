import { pageMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Clock, Plus, Repeat } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MealDetailSheet } from "@/components/MealDetailSheet";
import { MealScheduleSheet } from "@/components/MealScheduleSheet";
import { AddMealSheet } from "@/components/AddMealSheet";
import { MacroBreakdownSheet } from "@/components/MacroBreakdownSheet";
import { DaySelector } from "@/components/diet/DaySelector";
import { CalorieBudgetCard } from "@/components/diet/CalorieBudgetCard";
import { MacroSummary } from "@/components/diet/MacroSummary";
import { DayMealsSection } from "@/components/diet/DayMealsSection";
import {
  CoachSuggestionsSection,
  type CoachMealSuggestion,
} from "@/components/diet/CoachSuggestionsSection";
import { CoachUpdateCard } from "@/components/diet/CoachUpdateCard";
import { MealEntrySheet } from "@/components/diet/MealEntrySheet";
import { rankMeals } from "@/lib/nutrition-swap";
import { getWeekMenu } from "@/lib/data/week-menu";
import { getDietCoachUpdate } from "@/lib/coach/diet-update";
import { estimateBurn } from "@/lib/nutrition-burn";
import { getProfile } from "@/lib/data/profile";
import { getWorkouts } from "@/lib/data/workouts";
import { toast } from "sonner";
import { useFeature } from "@/lib/features";
import { useT } from "@/lib/i18n";
import {
  MEAL_SLOTS,
  activeSlots,
  addDays,
  getMealSchedule,
  getMeals,
  getTargets,
  getTrainingTags,
  hourOf,
  isoDate,
  slotForTime,
  weekDates,
} from "@/lib/data/nutrition";
import {
  addEntry,
  getDayEntries,
  getEntriesForDates,
  portionOf,
  removeEntry,
  setEntryEaten,
  setEntryPortion,
  totalsForEntries,
  type DietEntry,
} from "@/lib/data/diet-entries";
import { undoToast } from "@/lib/undo";
import type { DayTotals, Meal, MealSlot } from "@/lib/nutrition-types";

export const Route = createFileRoute("/_authenticated/dieta/")({
  head: () => ({
    meta: pageMeta({
      title: "Today's meals",
      description:
        "Plan your meals per eating moment, see what you already ate and get coach suggestions for the calories you have left.",
      ogDescription:
        "Plan, log and adjust your meals with coach suggestions based on the macros you still have open.",
    }),
  }),
  component: TodayPage,
});

const EMPTY: DayTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

function sumMeals(meals: Meal[]): DayTotals {
  return meals.reduce<DayTotals>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { ...EMPTY },
  );
}

function TodayPage() {
  const t = useT();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => isoDate(new Date()));
  const [entrySheet, setEntrySheet] = useState<{ open: boolean; mode: "log" | "plan" }>({
    open: false,
    mode: "log",
  });
  const [planSlot, setPlanSlot] = useState<MealSlot>("lunch");
  const [timingOpen, setTimingOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [detail, setDetail] = useState<{ meal: Meal; slot: MealSlot; entry?: DietEntry } | null>(
    null,
  );

  const scheduleQ = useQuery({ queryKey: ["mealSchedule"], queryFn: getMealSchedule });
  const targetsQ = useQuery({ queryKey: ["nutritionTargets"], queryFn: getTargets });
  const dates = useMemo(() => weekDates(), []);
  const weekEntriesQ = useQuery({
    queryKey: ["weekEntries", dates.join()],
    queryFn: () => getEntriesForDates(dates),
  });
  const mealsQ = useQuery({ queryKey: ["meals", "all"], queryFn: () => getMeals() });
  const entriesQ = useQuery({
    queryKey: ["dietEntries", date],
    queryFn: () => getDayEntries(date),
  });
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const workoutsQ = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const tagsQ = useQuery({
    queryKey: ["trainingTags", date],
    queryFn: () => getTrainingTags([date]),
  });

  // Only the weekly menu feature fills this; without it the coach ranks the
  // whole catalogue instead of what was bought for the week.
  const weeklyMenu = useFeature("weeklyMenu");
  const weekMenuQ = useQuery({
    queryKey: ["weekMenu"],
    queryFn: getWeekMenu,
    enabled: weeklyMenu,
  });
  const weekMenuIds = weeklyMenu ? (weekMenuQ.data?.mealIds ?? []) : [];

  const schedule = scheduleQ.data;
  const targets = targetsQ.data ?? { kcal: 2700, proteinG: 165, carbsG: 300, fatG: 75 };
  const entries = entriesQ.data ?? [];
  const allMeals = mealsQ.data ?? [];
  const mealById = (id: string) => allMeals.find((m) => m.id === id);

  const eatenTotals = useMemo(
    () =>
      sumMeals(
        entries
          .filter((e) => e.eaten)
          .flatMap((e) => (mealById(e.mealId) ? [mealById(e.mealId)!] : [])),
      ),
    [entries, allMeals],
  );
  const dayTotals = useMemo(
    () => sumMeals(entries.flatMap((e) => (mealById(e.mealId) ? [mealById(e.mealId)!] : []))),
    [entries, allMeals],
  );

  const burned = useMemo(() => {
    const todays = (workoutsQ.data ?? []).filter((w) => isoDate(new Date(w.iniciadoEm)) === date);
    return estimateBurn(todays, profileQ.data?.pesoKg ?? 75);
  }, [workoutsQ.data, profileQ.data, date]);

  const tag = tagsQ.data?.[date];
  const weekTotals = useMemo(() => totalsForEntries(weekEntriesQ.data ?? []), [weekEntriesQ.data]);

  const openKcal = targets.kcal - dayTotals.kcal;

  /** One suggestion per remaining eating moment, for what is still open. */
  const suggestions = useMemo<CoachMealSuggestion[]>(() => {
    if (!schedule || !allMeals.length || openKcal < 200) return [];
    const nowH = new Date().getHours() + new Date().getMinutes() / 60;
    const isToday = date === isoDate(new Date());
    const used = new Set(entries.map((e) => e.mealId));
    const slots = activeSlots(schedule).filter(
      (s) => !isToday || hourOf(schedule[s].time) >= nowH - 1,
    );
    const pool = slots.length ? slots : activeSlots(schedule);
    const out: CoachMealSuggestion[] = [];
    // Meals picked in this week's interview come first: those are the
    // ingredients the user actually has at home.
    const weekIds = weekMenuIds;
    for (const slot of pool.slice(0, 3)) {
      const candidates = allMeals.filter((m) => m.slots.includes(slot) && !used.has(m.id));
      const inWeek = candidates.filter((m) => weekIds.includes(m.id));
      const ranked = rankMeals(inWeek.length ? inWeek : candidates, {
        slot,
        targets,
        dayTotals,
        tag,
      });
      const best = ranked[0];
      if (best) {
        used.add(best.meal.id);
        out.push({ meal: best.meal, slot, reason: best.reason });
      }
    }
    return out;
  }, [schedule, allMeals, entries, targets, dayTotals, tag, openKcal, date, weekMenuIds]);

  const coachUpdate = useMemo(
    () =>
      getDietCoachUpdate({
        date,
        targets,
        eaten: eatenTotals,
        plannedRemaining: dayTotals,
        entries,
        suggestion: suggestions[0]?.meal ?? null,
        hour: new Date().getHours() + new Date().getMinutes() / 60,
      }),
    [date, targets, eatenTotals, dayTotals, entries, suggestions],
  );

  const refreshEntries = () => {
    void qc.invalidateQueries({ queryKey: ["dietEntries", date] });
    void qc.invalidateQueries({ queryKey: ["weekEntries"] });
    void qc.invalidateQueries({ queryKey: ["dayNutrition"] });
  };

  async function addMeal(input: {
    slot: MealSlot;
    mealId: string;
    time?: string;
    portion?: number;
    eaten?: boolean;
  }) {
    setEntrySheet((s) => ({ ...s, open: false }));
    try {
      // A meal you log was eaten, not planned ahead — keep the flag honest.
      await addEntry({ date, ...input, planned: !input.eaten });
      void refreshEntries();
    } catch {
      toast.error(t("Could not save this meal. Try again."));
    }
  }

  /** Opens the sheet on the moment the clock is closest to. */
  function openSheet(mode: "log" | "plan", slot?: MealSlot) {
    setPlanSlot(slot ?? (schedule ? slotForTime(new Date(), schedule) : "lunch"));
    setEntrySheet({ open: true, mode });
  }

  /**
   * Yesterday's meals as a plan for this day. Meals already on the day are
   * skipped, so tapping twice cannot double the day, and everything it did
   * add can be undone in one tap.
   */
  async function repeatYesterday() {
    const yesterday = isoDate(addDays(new Date(date), -1));
    const source = await getDayEntries(yesterday);
    if (!source.length) {
      toast.info(t("Nothing to copy from yesterday."));
      return;
    }
    const taken = new Set(entries.map((e) => `${e.slot}|${e.mealId}`));
    const added: DietEntry[] = [];
    for (const e of source) {
      if (taken.has(`${e.slot}|${e.mealId}`)) continue;
      taken.add(`${e.slot}|${e.mealId}`);
      added.push(
        await addEntry({
          date,
          slot: e.slot,
          mealId: e.mealId,
          ...(e.time ? { time: e.time } : {}),
          portion: portionOf(e),
        }),
      );
    }
    void refreshEntries();
    if (!added.length) {
      toast.info(t("Yesterday's meals are already on this day."));
      return;
    }
    undoToast({
      message: t("Copied {n} meal(s) from yesterday.", { n: added.length }),
      undoLabel: t("Undo"),
      onUndo: async () => {
        for (const e of added) await removeEntry(e);
        void refreshEntries();
      },
    });
  }

  async function toggleEaten(entry: DietEntry) {
    await setEntryEaten(entry, !entry.eaten);
    void refreshEntries();
  }

  async function drop(entry: DietEntry) {
    await removeEntry(entry);
    void refreshEntries();
  }

  const loadError = scheduleQ.isError || targetsQ.isError || mealsQ.isError || entriesQ.isError;
  const firstLoad =
    !loadError &&
    (scheduleQ.isLoading || targetsQ.isLoading || mealsQ.isLoading || entriesQ.isLoading);

  if (loadError) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="font-display text-sm font-semibold">{t("Could not load today's meals.")}</p>
        <Button
          variant="outline"
          className="tap-target mt-3"
          onClick={() => {
            void scheduleQ.refetch();
            void targetsQ.refetch();
            void mealsQ.refetch();
            void entriesQ.refetch();
          }}
        >
          {t("Try again")}
        </Button>
      </div>
    );
  }

  if (firstLoad) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <DaySelector date={date} onChange={setDate} />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTimingOpen(true)}
            aria-label={t("Timing")}
            className="tap-target flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground"
          >
            <Clock className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("Repeat yesterday")}
            onClick={() => void repeatYesterday()}
            className="tap-target flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground"
          >
            <Repeat className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <CalorieBudgetCard
          eatenKcal={eatenTotals.kcal}
          targetKcal={targets.kcal}
          burnedKcal={burned}
        />
      </div>

      <div className="mt-2">
        <MacroSummary
          totals={eatenTotals}
          targets={targets}
          date={date}
          onOpenBreakdown={() => setBreakdownOpen(true)}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          className="tap-target flex-1 text-base font-semibold"
          onClick={() => openSheet("log")}
        >
          <Plus className="mr-1.5 size-5" /> {t("Log a meal")}
        </Button>
        <Button
          variant="outline"
          className="tap-target"
          onClick={() => openSheet("plan")}
          aria-label={t("Plan a meal")}
        >
          <CalendarPlus className="size-5" />
        </Button>
      </div>

      <DayMealsSection
        entries={entries}
        mealById={mealById}
        onLog={(slot) => openSheet("log", slot)}
        onOpen={(entry) => {
          const meal = mealById(entry.mealId);
          if (meal) setDetail({ meal, slot: entry.slot, entry });
        }}
        onToggleEaten={(entry) => void toggleEaten(entry)}
        onRemove={(entry) => void drop(entry)}
      />

      <CoachSuggestionsSection
        suggestions={suggestions}
        emptyReason={
          openKcal < 200
            ? t("Your day is basically covered — nothing worth adding right now.")
            : t("Log a meal first, then the coach can suggest what fits the rest of the day.")
        }
        onAdd={(s) =>
          void addMeal({
            slot: s.slot,
            mealId: s.meal.id,
            ...(schedule ? { time: schedule[s.slot].time } : {}),
          })
        }
        onOpen={(meal) => setDetail({ meal, slot: suggestions[0]?.slot ?? "lunch" })}
      />

      <div className="mt-6">
        <CoachUpdateCard insight={coachUpdate} />
      </div>

      <MealDetailSheet
        meal={detail?.meal ?? null}
        slot={detail?.slot ?? "lunch"}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        targets={targets}
        dayTotals={dayTotals}
        weekTotals={weekTotals}
        planned={!!detail?.entry}
        trainingTag={tag}
        {...(detail?.entry
          ? {
              portion: portionOf(detail.entry),
              onPortionChange: async (next: number) => {
                if (!detail?.entry) return;
                const saved = await setEntryPortion(detail.entry, next);
                setDetail((d) => (d ? { ...d, entry: saved } : d));
                void refreshEntries();
              },
            }
          : {})}
        onToggle={async () => {
          if (!detail) return;
          if (detail.entry) await drop(detail.entry);
          else await addMeal({ slot: detail.slot, mealId: detail.meal.id });
          setDetail(null);
        }}
      />

      <MealEntrySheet
        open={entrySheet.open}
        mode={entrySheet.mode}
        defaultSlot={
          planSlot && MEAL_SLOTS.includes(planSlot)
            ? planSlot
            : schedule
              ? slotForTime(new Date(), schedule)
              : "lunch"
        }
        onOpenChange={(open) => setEntrySheet((prev) => ({ ...prev, open }))}
        onPick={(input) => void addMeal(input)}
        onCreateMeal={() => {
          setEntrySheet((prev) => ({ ...prev, open: false }));
          setAddOpen(true);
        }}
      />

      <AddMealSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultSlot={planSlot}
        onCreated={async (meal) => {
          // A meal created from a photo or a description was just eaten.
          await addEntry({
            date,
            slot: planSlot,
            mealId: meal.id,
            eaten: entrySheet.mode === "log",
          });
          void qc.invalidateQueries({ queryKey: ["meals"] });
          void refreshEntries();
        }}
      />

      {schedule ? (
        <MealScheduleSheet open={timingOpen} onOpenChange={setTimingOpen} schedule={schedule} />
      ) : null}

      <MacroBreakdownSheet
        open={breakdownOpen}
        onOpenChange={setBreakdownOpen}
        entries={entries}
        mealById={mealById}
        plannedTotals={dayTotals}
        eatenTotals={eatenTotals}
        targets={targets}
      />
    </>
  );
}
