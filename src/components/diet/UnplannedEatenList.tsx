import { formatSlotTime, SLOT_LABEL } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import type { DietEntry } from "@/lib/data/diet-entries";
import type { Meal } from "@/lib/nutrition-types";

/** Meals logged without planning them first — a log, not a to-do. */
export function UnplannedEatenList({
  entries,
  mealById,
  onOpen,
}: {
  entries: DietEntry[];
  mealById: (id: string) => Meal | undefined;
  onOpen: (entry: DietEntry) => void;
}) {
  const t = useT();
  if (!entries.length) return null;

  return (
    <section className="mt-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("Other meals you ate")}
      </h2>
      <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
        {entries.map((entry) => {
          const meal = mealById(entry.mealId);
          if (!meal) return null;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{meal.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t(SLOT_LABEL[entry.slot])}
                    {entry.time ? ` · ${formatSlotTime(entry.time)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {meal.kcal} kcal
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
