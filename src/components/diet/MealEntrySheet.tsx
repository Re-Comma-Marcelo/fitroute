import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { MEAL_SLOTS, SLOT_LABEL, getMeals, mealSchedule } from "@/lib/data/nutrition";
import { scaleMeal } from "@/lib/data/diet-entries";
import { getMealFavorites } from "@/lib/nutrition-local";
import { mealImage } from "@/lib/meal-image";
import { useT } from "@/lib/i18n";
import type { MealSlot } from "@/lib/nutrition-types";

/** Portions worth one tap. Anything else is an edge case, not a daily need. */
const PORTIONS = [
  { value: 0.5, label: "½" },
  { value: 1, label: "1" },
  { value: 1.5, label: "1½" },
  { value: 2, label: "2" },
] as const;

/** Accent-insensitive match, so "cafe" finds "café". */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "");
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * One sheet for both ways a meal lands on a day.
 *
 * "log" is the frequent one: what you just ate. It opens on the eating moment
 * the clock is closest to and saves on the first tap of a meal, so logging is
 * two taps from the diet page. "plan" is the deliberate one, for a meal you
 * intend to eat later, and keeps the time field.
 */
export function MealEntrySheet({
  open,
  mode,
  defaultSlot,
  onOpenChange,
  onPick,
  onCreateMeal,
}: {
  open: boolean;
  mode: "log" | "plan";
  defaultSlot: MealSlot;
  onOpenChange: (open: boolean) => void;
  onPick: (input: {
    slot: MealSlot;
    mealId: string;
    time?: string;
    portion: number;
    eaten: boolean;
  }) => void;
  onCreateMeal?: () => void;
}) {
  const t = useT();
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [time, setTime] = useState<string>("");
  const [portion, setPortion] = useState<number>(1);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setSlot(defaultSlot);
    setTime(mode === "log" ? nowTime() : mealSchedule()[defaultSlot].time);
    setPortion(1);
    setQuery("");
  }, [open, defaultSlot, mode]);

  const mealsQ = useQuery({ queryKey: ["meals", slot], queryFn: () => getMeals(slot) });
  const favorites = useMemo(() => getMealFavorites(), [open]);

  const list = useMemo(() => {
    const q = normalize(query.trim());
    return [...(mealsQ.data ?? [])]
      .filter((m) => !q || normalize(m.name).includes(q))
      .sort((a, b) => (favorites.includes(a.id) ? 0 : 1) - (favorites.includes(b.id) ? 0 : 1));
  }, [mealsQ.data, favorites, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{mode === "log" ? t("Log a meal") : t("Plan a meal")}</SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {MEAL_SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSlot(s);
                if (mode === "plan") setTime(mealSchedule()[s].time);
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

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{t("Portion")}</span>
          <div className="flex gap-1.5">
            {PORTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPortion(p.value)}
                aria-pressed={portion === p.value}
                className={`tap-target min-w-11 rounded-full border px-3 text-sm font-semibold tabular-nums transition-colors ${
                  portion === p.value
                    ? "border-diet bg-diet/10 text-diet"
                    : "border-border text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "plan" ? (
          <label className="mt-3 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            {t("Time (optional)")}
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 w-32"
            />
          </label>
        ) : null}

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search meals")}
            aria-label={t("Search meals")}
            className="h-11 pl-9 text-base"
          />
        </div>

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
          {list.map((meal) => {
            const macros = scaleMeal(meal, portion);
            return (
              <li key={meal.id}>
                <button
                  type="button"
                  onClick={() =>
                    onPick({
                      slot,
                      mealId: meal.id,
                      ...(time ? { time } : {}),
                      portion,
                      eaten: mode === "log",
                    })
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
                      {macros.kcal} kcal · {t("P")} {macros.proteinG} · {t("C")} {macros.carbsG} ·{" "}
                      {t("F")} {macros.fatG}
                    </span>
                  </span>
                  <Plus className="size-4 shrink-0 text-diet" />
                </button>
              </li>
            );
          })}
          {!list.length && !mealsQ.isLoading ? (
            <li className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              {t("No meal matches that. Create it and the AI estimates the macros.")}
            </li>
          ) : null}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
