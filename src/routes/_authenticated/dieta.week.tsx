import { pageMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { MealPickerSheet } from "@/components/MealPickerSheet";
import { AddMealSheet } from "@/components/AddMealSheet";
import { formatWeekdayDayMonth } from "@/lib/format";
import { useT } from "@/lib/i18n";
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
    meta: pageMeta({
      title: "Week meal plan",
      description:
        "Plan breakfast, lunch, snack and dinner for the whole week alongside your training days.",
      ogDescription:
        "A 7-day meal grid with daily calorie and protein totals next to each training day.",
    }),
  }),
  component: WeekPage,
});

function WeekPage() {
  const t = useT();
  const dates = useMemo(() => weekDates(), []);
  const today = isoDate(new Date());
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ date: string; slot: MealSlot } | null>(null);
  const [adding, setAdding] = useState<{ date: string; slot: MealSlot } | null>(null);

  const planQ = useQuery({ queryKey: ["weekPlan"], queryFn: getWeekPlan });
  const mealsQ = useQuery({ queryKey: ["meals", undefined], queryFn: () => getMeals() });
  const targetsQ = useQuery({ queryKey: ["nutritionTargets"], queryFn: getTargets });
  const tagsQ = useQuery({
    queryKey: ["trainingTags", dates.join()],
    queryFn: () => getTrainingTags(dates),
  });

  const targets = targetsQ.data;
  const mealName = (id?: string) => mealsQ.data?.find((m) => m.id === id)?.name;

  const refresh = () => qc.invalidateQueries({ queryKey: ["weekPlan"] });

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await autoFillWeek();
            } catch {
              toast.error(t("Could not update the week plan. Try again."));
            }
            refresh();
          }}
          className="tap-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          <Wand2 className="size-4" /> {t("Fill the week")}
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await clearWeek();
            } catch {
              toast.error(t("Could not update the week plan. Try again."));
            }
            refresh();
          }}
          aria-label={t("Clear week")}
          className="tap-target flex w-12 items-center justify-center rounded-xl border border-border text-muted-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        {t("Suggestions lean high-protein on strength days and lighter on rest days.")}
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
                  {formatWeekdayDayMonth(d)}
                  {date === today ? (
                    <span className="ml-2 text-xs text-primary">{t("Today")}</span>
                  ) : null}
                </h2>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {t(tagsQ.data?.[date] ?? "Rest")} · {totals.kcal}
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
                          {t(SLOT_LABEL[slot])}
                        </span>
                        <span
                          className={`flex-1 truncate text-xs ${name ? "font-medium" : "text-muted-foreground"}`}
                        >
                          {name ?? t("Add a meal")}
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
        onAddMeal={() => {
          setAdding(editing);
          setEditing(null);
        }}
        onPick={async (mealId) => {
          if (!editing) return;
          try {
            await setPlannedMeal(editing.date, editing.slot, mealId);
          } catch {
            toast.error(t("Could not update the week plan. Try again."));
          }
          setEditing(null);
          refresh();
        }}
      />

      <AddMealSheet
        open={Boolean(adding)}
        onOpenChange={(open) => !open && setAdding(null)}
        defaultSlot={adding?.slot ?? "lunch"}
        onCreated={async (meal) => {
          if (adding) {
            try {
              await setPlannedMeal(adding.date, adding.slot, meal.id);
            } catch {
              toast.error(t("Could not update the week plan. Try again."));
            }
          }
          setAdding(null);
          void qc.invalidateQueries({ queryKey: ["meals"] });
          refresh();
        }}
      />
    </>
  );
}
