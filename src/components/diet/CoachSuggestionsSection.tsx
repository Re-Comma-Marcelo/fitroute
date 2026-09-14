import { useState } from "react";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { MealThumb } from "@/components/diet/MealThumb";
import { SLOT_LABEL } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import type { Meal, MealSlot } from "@/lib/nutrition-types";

export interface CoachMealSuggestion {
  meal: Meal;
  slot: MealSlot;
  reason: string;
}

/** Coach-proposed meals for what is still open today. Marked, not planned. */
export function CoachSuggestionsSection({
  suggestions,
  emptyReason,
  onAdd,
  onOpen,
}: {
  suggestions: CoachMealSuggestion[];
  emptyReason: string;
  onAdd: (s: CoachMealSuggestion) => void;
  onOpen: (meal: Meal) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(true);

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Sparkles className="size-4 text-primary" />
        <h2 className="flex-1 font-display text-base font-semibold tracking-tight">
          {t("Recommended by your coach")}
        </h2>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        suggestions.length ? (
          <ul className="mt-2 space-y-2">
            {suggestions.map((s) => (
              <li key={`${s.slot}-${s.meal.id}`}>
                <div className="rounded-2xl border border-primary/25 bg-primary/5 p-2.5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onOpen(s.meal)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <MealThumb slot={s.slot} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">{s.meal.name}</span>
                          <span className="shrink-0 rounded-full border border-primary/40 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {t("Recommended")}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
                          {t(SLOT_LABEL[s.slot])} · {s.meal.kcal} kcal · {t("P")} {s.meal.proteinG}{" "}
                          · {t("C")} {s.meal.carbsG} · {t("F")} {s.meal.fatG}
                        </span>
                      </span>
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                    {s.reason}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAdd(s)}
                    className="tap-target mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-primary/40 text-xs font-semibold text-primary"
                  >
                    <Plus className="size-3.5" /> {t("Add to this day")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-2xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
            {emptyReason}
          </p>
        )
      ) : null}
    </section>
  );
}
