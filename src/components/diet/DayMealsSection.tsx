import { Plus } from "lucide-react";
import { MealEntryRow } from "@/components/diet/MealEntryRow";
import { MEAL_SLOTS, SLOT_LABEL } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import type { DietEntry } from "@/lib/data/diet-entries";
import type { Meal, MealSlot } from "@/lib/nutrition-types";

/**
 * Everything on the day, grouped by eating moment: what was eaten and what is
 * still planned, in one list. Splitting the two made the page ask which model
 * a meal belonged to — a question the user never has.
 */
export function DayMealsSection({
  entries,
  mealById,
  onLog,
  onOpen,
  onToggleEaten,
  onRemove,
}: {
  entries: DietEntry[];
  mealById: (id: string) => Meal | undefined;
  onLog: (slot: MealSlot) => void;
  onOpen: (entry: DietEntry) => void;
  onToggleEaten: (entry: DietEntry) => void;
  onRemove: (entry: DietEntry) => void;
}) {
  const t = useT();
  // An entry whose meal is no longer in the catalogue renders as nothing, so
  // it must not leave an empty eating-moment heading behind either.
  const groups = MEAL_SLOTS.map((slot) => ({
    slot,
    items: entries.filter((e) => e.slot === slot && mealById(e.mealId)),
  })).filter((g) => g.items.length);

  return (
    <section className="mt-5">
      <h2 className="font-display text-base font-semibold tracking-tight">{t("Your day")}</h2>

      {groups.length ? (
        <div className="mt-2 space-y-4">
          {groups.map((group) => (
            <div key={group.slot}>
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(SLOT_LABEL[group.slot])}
                </h3>
                <button
                  type="button"
                  onClick={() => onLog(group.slot)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-diet"
                >
                  <Plus className="size-3" /> {t("Add")}
                </button>
              </div>
              <ul className="mt-1.5 space-y-2">
                {group.items.map((entry) => {
                  const meal = mealById(entry.mealId);
                  if (!meal) return null;
                  return (
                    <li key={entry.id}>
                      <MealEntryRow
                        entry={entry}
                        meal={meal}
                        onOpen={() => onOpen(entry)}
                        onToggleEaten={() => onToggleEaten(entry)}
                        onRemove={() => onRemove(entry)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 rounded-2xl border border-dashed border-border p-5 text-center">
          <p className="font-display text-sm font-semibold">{t("Nothing on this day yet")}</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {t("Log what you ate and the rings fill up as the day goes.")}
          </p>
        </div>
      )}
    </section>
  );
}
