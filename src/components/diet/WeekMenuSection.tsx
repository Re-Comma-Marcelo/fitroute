import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { MealThumb } from "@/components/diet/MealThumb";
import { SLOT_LABEL } from "@/lib/data/nutrition";
import { formatWeekdayShort } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { Meal, MealSlot } from "@/lib/nutrition-types";

/**
 * "This week on the menu" — the meals the shopping list is built from, in the
 * same card treatment as the coach recommendations on the diet page.
 */
export function WeekMenuSection({
  meals,
  dates,
  plannedOn,
  onAssign,
  onOpen,
}: {
  meals: Meal[];
  dates: string[];
  /** Dates a meal is already planned on, per meal id. */
  plannedOn: Record<string, string[]>;
  onAssign: (meal: Meal, date: string, slot: MealSlot) => void;
  onOpen: (meal: Meal) => void;
}) {
  const t = useT();
  const [openFor, setOpenFor] = useState<string | null>(null);

  if (!meals.length) return null;

  return (
    <section className="mt-6">
      <h2 className="font-display text-base font-semibold tracking-tight">
        {t("This week on the menu")}
      </h2>
      <ul className="mt-2 space-y-2">
        {meals.map((meal) => {
          const slot: MealSlot = meal.slots[0] ?? "dinner";
          const days = plannedOn[meal.id] ?? [];
          return (
            <li key={meal.id} className="rounded-2xl border border-primary/25 bg-primary/5 p-2.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpen(meal)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <MealThumb slot={slot} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{meal.name}</span>
                      <span className="shrink-0 rounded-full border border-primary/40 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {t("Recommended")}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
                      {t(SLOT_LABEL[slot])} · {meal.kcal} kcal · {t("P")} {meal.proteinG} · {t("C")}{" "}
                      {meal.carbsG} · {t("F")} {meal.fatG}
                    </span>
                  </span>
                </button>
              </div>

              {days.length ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {t("Planned on")}{" "}
                  {days.map((d) => formatWeekdayShort(`${d}T12:00:00`)).join(", ")}
                </p>
              ) : null}

              {openFor === meal.id ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {dates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        onAssign(meal, d, slot);
                        setOpenFor(null);
                      }}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold"
                    >
                      {formatWeekdayShort(`${d}T12:00:00`)}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenFor(meal.id)}
                  className="tap-target mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-primary/40 text-xs font-semibold text-primary"
                >
                  <CalendarPlus className="size-3.5" /> {t("Plan on a day")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
