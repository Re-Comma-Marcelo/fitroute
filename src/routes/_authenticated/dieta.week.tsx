import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { MealPickerSheet } from "@/components/MealPickerSheet";
import {
  SLOT_LABEL,
  activeSlots,
  autoFillWeek,
  clearWeek,
  getMeals,
  getTargets,
  getTrainingTags,
  getWeekPlan,
  isoDate,
  setPlannedMeal,
  totalsFor,
  weekDates,
} from "@/lib/data/nutrition";
import type { MealSlot } from "@/lib/nutrition-types";

export const Route = createFileRoute("/_authenticated/dieta/week")({
  head: () => ({
    meta: [
      { title: "Week meal plan — Forja" },
      {
        name: "description",
        content: "Plan breakfast, lunch, snack and dinner for the whole week alongside your training days.",
      },
      { property: "og:title", content: "Week meal plan — Forja" },
      {
        property: "og:description",
        content: "A 7-day meal grid with daily calorie and protein totals next to each training day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WeekPage,
});

function WeekPage() {
  const dates = useMemo(() => weekDates(), []);
  const today = isoDate(new Date());
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ date: string; slot: MealSlot } | null>(null);

  const planQ = useQuery({ queryKey: ["weekPlan"], queryFn: getWeekPlan });
  const mealsQ = useQuery({ queryKey: ["meals", undefined], queryFn: () => getMeals() });
  const targetsQ = useQuery({ queryKey: ["nutritionTargets"], queryFn: getTargets });
  const tagsQ = useQuery({ queryKey: ["trainingTags", dates.join()], queryFn: () => getTrainingTags(dates) });

  const targets = targetsQ.data;
  const mealName = (id?: string) => mealsQ.data?.find((m) => m.id === id)?.name;

  const refresh = () => qc.invalidateQueries({ queryKey: ["weekPlan"] });

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await autoFillWeek();
            refresh();
          }}
          className="tap-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          <Wand2 className="size-4" /> Fill the week
        </button>
        <button
          type="button"
          onClick={async () => {
            await clearWeek();
            refresh();
          }}
          aria-label="Clear week"
          className="tap-target flex w-12 items-center justify-center rounded-xl border border-border text-muted-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Suggestions lean high-protein on strength days and lighter on rest days.
      </p>

      <ul className="mt-4 space-y-3">
        {dates.map((date) => {
          const day = planQ.data?.[date];
          const totals = totalsFor(day);
          const d = new Date(`${date}T12:00:00`);
          return (
            <li key={date} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">
                  {d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" })}
                  {date === today ? <span className="ml-2 text-xs text-primary">Today</span> : null}
                </h2>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {tagsQ.data?.[date] ?? "Rest"} · {totals.kcal}
                  {targets ? `/${targets.kcal}` : ""} kcal · P {totals.proteinG}g
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {activeSlots().map((slot) => {
                  const name = mealName(day?.[slot]);
                  return (
                    <li key={slot}>
                      <button
                        type="button"
                        onClick={() => setEditing({ date, slot })}
                        className="tap-target flex w-full items-center gap-3 rounded-lg border border-border/60 px-3 text-left"
                      >
                        <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {SLOT_LABEL[slot]}
                        </span>
                        <span
                          className={`flex-1 truncate text-xs ${name ? "font-medium" : "text-muted-foreground"}`}
                        >
                          {name ?? "Add a meal"}
                        </span>
                        {name ? null : <Plus className="size-3.5 shrink-0 text-muted-foreground" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      <MealPickerSheet
        open={Boolean(editing)}
        slot={editing?.slot ?? null}
        selectedMealId={editing ? planQ.data?.[editing.date]?.[editing.slot] : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
        onPick={async (mealId) => {
          if (!editing) return;
          await setPlannedMeal(editing.date, editing.slot, mealId);
          setEditing(null);
          refresh();
        }}
      />
    </>
  );
}
