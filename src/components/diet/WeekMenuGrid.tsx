import { Check } from "lucide-react";
import { mealImage } from "@/lib/meal-image";
import { SLOT_LABEL } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import type { Meal, MealSlot } from "@/lib/nutrition-types";

export interface WeekMenuOption {
  meal: Meal;
  slot: MealSlot;
}

/** Tap-to-pick grid of coach-recommended meals for the week. */
export function WeekMenuGrid({
  options,
  selected,
  onToggle,
}: {
  options: WeekMenuOption[];
  selected: string[];
  onToggle: (mealId: string) => void;
}) {
  const t = useT();

  return (
    <ul className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const on = selected.includes(o.meal.id);
        return (
          <li key={`${o.slot}-${o.meal.id}`}>
            <button
              type="button"
              onClick={() => onToggle(o.meal.id)}
              aria-pressed={on}
              className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border text-left transition-colors ${
                on ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
            >
              <span className="relative block">
                <img
                  src={mealImage(o.slot)}
                  alt=""
                  loading="lazy"
                  width={320}
                  height={180}
                  className="h-20 w-full object-cover"
                />
                {on ? (
                  <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
              </span>
              <span className="flex flex-1 flex-col gap-0.5 p-2.5">
                <span className="text-sm font-semibold leading-tight">{o.meal.name}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {o.meal.kcal} kcal · {t("P")} {o.meal.proteinG} · {t("C")} {o.meal.carbsG} ·{" "}
                  {t("F")} {o.meal.fatG}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
