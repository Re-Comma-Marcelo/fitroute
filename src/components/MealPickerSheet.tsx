import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MealCard } from "@/components/nutrition-ui";
import { SLOT_LABEL, getMeals } from "@/lib/data/nutrition";
import type { MealSlot } from "@/lib/nutrition-types";
import { useState } from "react";

const FILTERS = ["all", "high-protein", "high-carb", "light", "quick", "order-out"] as const;

export function MealPickerSheet({
  open,
  slot,
  selectedMealId,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  slot: MealSlot | null;
  selectedMealId?: string;
  onOpenChange: (open: boolean) => void;
  onPick: (mealId: string | null) => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const mealsQ = useQuery({
    queryKey: ["meals", slot],
    queryFn: () => getMeals(slot ?? undefined),
    enabled: Boolean(slot),
  });

  const list = (mealsQ.data ?? []).filter(
    (m) => filter === "all" || m.tags.includes(filter as never),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{slot ? `Choose ${SLOT_LABEL[slot].toLowerCase()}` : "Choose a meal"}</SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                f === filter
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {f.replace("-", " ")}
            </button>
          ))}
        </div>

        <ul className="mt-3 space-y-3 pb-6">
          {selectedMealId ? (
            <li>
              <button
                type="button"
                onClick={() => onPick(null)}
                className="tap-target w-full rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground"
              >
                Clear this slot
              </button>
            </li>
          ) : null}
          {list.map((meal) => (
            <li key={meal.id}>
              <MealCard
                meal={meal}
                slot={slot ?? "lunch"}
                selected={meal.id === selectedMealId}
                onSelect={() => onPick(meal.id)}
              />
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
