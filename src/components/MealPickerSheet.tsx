import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MealCard } from "@/components/nutrition-ui";
import { SLOT_LABEL, getMeals } from "@/lib/data/nutrition";
import { getMealFavorites, toggleMealFavorite } from "@/lib/nutrition-local";
import { useT } from "@/lib/i18n";
import type { MealSlot } from "@/lib/nutrition-types";
import { useEffect, useState } from "react";
import { Plus, Star } from "lucide-react";

const FILTERS = [
 "favorites",
 "all",
 "high-protein",
 "high-carb",
 "light",
 "quick",
 "order-out",
] as const;

export function MealPickerSheet({
 open,
 slot,
 selectedMealId,
 onOpenChange,
 onPick,
 onAddMeal,
}: {
 open: boolean;
 slot: MealSlot | null;
 selectedMealId?: string | undefined;
 onOpenChange: (open: boolean) => void;
 onPick: (mealId: string | null) => void;
 /** Opens the "create a meal with AI" flow, when the host provides one. */
 onAddMeal?: () => void;
}) {
 const t = useT();
 const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
 const mealsQ = useQuery({
 queryKey: ["meals", slot],
 queryFn: () => getMeals(slot ?? undefined),
 enabled: Boolean(slot),
 });

 const [favorites, setFavorites] = useState<string[]>(() => getMealFavorites());
 // Re-sync when the sheet opens, so favorites starred elsewhere show up here.
 useEffect(() => {
 if (open) setFavorites(getMealFavorites());
 }, [open]);

 const list = (mealsQ.data ?? [])
 .filter((m) => filter === "all" || filter === "favorites" || m.tags.includes(filter as never))
 .filter((m) => (filter === "favorites" ? favorites.includes(m.id) : true))
 .sort((a, b) => {
 const fa = favorites.includes(a.id) ? 0 : 1;
 const fb = favorites.includes(b.id) ? 0 : 1;
 return fa - fb;
 });

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
 <SheetHeader className="text-left">
 <SheetTitle>
 {slot
 ? t("Choose {slot}", { slot: t(SLOT_LABEL[slot]).toLowerCase() })
 : t("Choose a meal")}
 </SheetTitle>
 </SheetHeader>

 <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
 {FILTERS.map((f) => (
 <button
 key={f}
 type="button"
 onClick={() => setFilter(f)}
 className={`flex shrink-0 items-center gap-1 rounded-sm border px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors ${
 f === filter
 ? "border-primary bg-primary/10 text-primary"
 : "border-border text-muted-foreground"
 }`}
 >
 {f === "favorites" ? <Star className="size-3" /> : null}
 {f === "favorites" ? t("Favorites") : t(f.replace("-", " "))}
 </button>
 ))}
 </div>

 {onAddMeal ? (
 <button
 type="button"
 onClick={onAddMeal}
 className="tap-target mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-steel/50 text-xs font-semibold text-steel"
 >
 <Plus className="size-4" /> {t("Add a meal")}
 </button>
 ) : null}

 <ul className="mt-3 space-y-3 pb-6">
 {selectedMealId ? (
 <li>
 <button
 type="button"
 onClick={() => onPick(null)}
 className="tap-target w-full rounded-lg border border-dashed border-border text-xs font-semibold text-muted-foreground"
 >
 {t("Clear this slot")}
 </button>
 </li>
 ) : null}
 {list.map((meal) => (
 <li key={meal.id}>
 <MealCard
 meal={meal}
 slot={slot ?? "lunch"}
 selected={meal.id === selectedMealId}
 favorite={favorites.includes(meal.id)}
 onToggleFavorite={() => setFavorites(toggleMealFavorite(meal.id))}
 onSelect={() => onPick(meal.id)}
 />
 </li>
 ))}
 </ul>
 </SheetContent>
 </Sheet>
 );
}
