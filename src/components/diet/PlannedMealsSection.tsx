import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MealEntryRow } from "@/components/diet/MealEntryRow";
import { MEAL_SLOTS, SLOT_LABEL } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import type { DietEntry } from "@/lib/data/diet-entries";
import type { Meal, MealSlot } from "@/lib/nutrition-types";

/**
 * What the user planned for the day, grouped by eating moment.
 * Several meals per moment are allowed — the moment is a label, not a slot.
 */
export function PlannedMealsSection({
  entries,
  mealById,
  onPlan,
  onOpen,
  onToggleEaten,
  onRemove,
}: {
  entries: DietEntry[];
  mealById: (id: string) => Meal | undefined;
  onPlan: (slot: MealSlot) => void;
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
      <h2 className="font-display text-base font-semibold tracking-tight">
        {t("Planned for this day")}
      </h2>

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
                  onClick={() => onPlan(group.slot)}
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
          <p className="font-display text-sm font-semibold">{t("Nothing planned for this day")}</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {t("Pick your meals per moment and the rings show how the day adds up.")}
          </p>
        </div>
      )}

      <Button className="tap-target mt-3 w-full" onClick={() => onPlan("lunch")}>
        <Plus className="mr-1.5 size-4" /> {t("Plan a meal")}
      </Button>
    </section>
  );
}
