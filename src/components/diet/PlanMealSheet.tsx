import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { MEAL_SLOTS, SLOT_LABEL, getMeals, mealSchedule } from "@/lib/data/nutrition";
import { getMealFavorites } from "@/lib/nutrition-local";
import { mealImage } from "@/lib/meal-image";
import { useT } from "@/lib/i18n";
import type { MealSlot } from "@/lib/nutrition-types";

/**
 * Plan a meal: pick the eating moment, optionally a time, then the meal.
 * Never blocks a moment that already has meals — it simply adds another.
 */
export function PlanMealSheet({
  open,
  defaultSlot,
  onOpenChange,
  onPick,
  onCreateMeal,
}: {
  open: boolean;
  defaultSlot: MealSlot;
  onOpenChange: (open: boolean) => void;
  onPick: (input: { slot: MealSlot; mealId: string; time?: string }) => void;
  onCreateMeal?: () => void;
}) {
  const t = useT();
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSlot(defaultSlot);
      setTime(mealSchedule()[defaultSlot].time);
    }
  }, [open, defaultSlot]);

  const mealsQ = useQuery({ queryKey: ["meals", slot], queryFn: () => getMeals(slot) });
  const favorites = useMemo(() => getMealFavorites(), [open]);
  const list = useMemo(
    () =>
      [...(mealsQ.data ?? [])].sort(
        (a, b) => (favorites.includes(a.id) ? 0 : 1) - (favorites.includes(b.id) ? 0 : 1),
      ),
    [mealsQ.data, favorites],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{t("Plan a meal")}</SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {MEAL_SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSlot(s);
                setTime(mealSchedule()[s].time);
              }}
              className={`tap-target shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${
                s === slot
                  ? "border-diet bg-diet/10 text-diet"
                  : "border-border text-muted-foreground"
              }`}
            >
              {t(SLOT_LABEL[s])}
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          {t("Time (optional)")}
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-10 w-32"
          />
        </label>

        {onCreateMeal ? (
          <button
            type="button"
            onClick={onCreateMeal}
            className="tap-target mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-diet/50 text-xs font-semibold text-diet"
          >
            <Plus className="size-4" /> {t("Create my own meal")}
          </button>
        ) : null}

        <ul className="mt-3 space-y-2 pb-6">
          {list.map((meal) => (
            <li key={meal.id}>
              <button
                type="button"
                onClick={() =>
                  onPick({ slot, mealId: meal.id, ...(time ? { time } : {}) })
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left transition-colors active:bg-surface-2"
              >
                <img
                  src={mealImage(slot)}
                  alt=""
                  loading="lazy"
                  width={96}
                  height={96}
                  className="size-12 shrink-0 rounded-xl object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{meal.name}</span>
                    {favorites.includes(meal.id) ? (
                      <Star className="size-3 shrink-0 fill-diet text-diet" />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
                    {meal.kcal} kcal · {t("P")} {meal.proteinG} · {t("C")} {meal.carbsG} · {t("F")}{" "}
                    {meal.fatG}
                  </span>
                </span>
                <Plus className="size-4 shrink-0 text-diet" />
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
