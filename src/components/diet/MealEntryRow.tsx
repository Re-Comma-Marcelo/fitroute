import { Check, Clock, Trash2 } from "lucide-react";
import { mealImage } from "@/lib/meal-image";
import { SLOT_LABEL, formatSlotTime } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import type { DietEntry } from "@/lib/data/diet-entries";
import type { Meal } from "@/lib/nutrition-types";

/**
 * Compact row for one meal in the day. Eaten rows keep their place but lose
 * emphasis, so what still has to happen stays the loudest thing on screen.
 */
export function MealEntryRow({
  entry,
  meal,
  onOpen,
  onToggleEaten,
  onRemove,
}: {
  entry: DietEntry;
  meal: Meal;
  onOpen: () => void;
  onToggleEaten: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border bg-card p-2.5 transition-colors ${
        entry.eaten ? "border-border/60 opacity-70" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <img
          src={mealImage(entry.slot)}
          alt=""
          loading="lazy"
          width={96}
          height={96}
          className="size-12 shrink-0 rounded-xl object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{meal.name}</span>
            {entry.eaten ? (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-diet/15 px-1.5 py-0.5 text-[10px] font-semibold text-diet">
                <Check className="size-2.5" /> {t("Eaten")}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
            <span>{meal.kcal} kcal</span>
            <span>
              {t("P")} {meal.proteinG} · {t("C")} {meal.carbsG} · {t("F")} {meal.fatG}
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {t(SLOT_LABEL[entry.slot])}
            {entry.time ? ` · ${formatSlotTime(entry.time)}` : ""}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          onClick={onToggleEaten}
          aria-label={entry.eaten ? t("Mark as not eaten") : t("Log eaten")}
          className={`tap-target flex size-9 items-center justify-center rounded-full border transition-colors ${
            entry.eaten ? "border-diet bg-diet/15 text-diet" : "border-border text-muted-foreground"
          }`}
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("Remove")}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
