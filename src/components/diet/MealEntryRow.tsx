import { Check, Clock, Trash2 } from "lucide-react";
import { mealImage } from "@/lib/meal-image";
import { SLOT_LABEL, formatSlotTime } from "@/lib/data/nutrition";
import { portionOf, scaleMeal } from "@/lib/data/diet-entries";
import { useT } from "@/lib/i18n";
import type { DietEntry } from "@/lib/data/diet-entries";
import type { Meal } from "@/lib/nutrition-types";

/** "½", "1½", "2" — a portion reads as a fraction, not as 0.5. */
export function portionLabel(portion: number): string {
  const whole = Math.floor(portion);
  const half = portion - whole >= 0.5;
  if (!half) return String(whole);
  return `${whole > 0 ? whole : ""}½`;
}

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
  const portion = portionOf(entry);
  const macros = scaleMeal(meal, portion);
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
            {portion !== 1 ? (
              <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {portionLabel(portion)}×
              </span>
            ) : null}
            {entry.eaten ? (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-diet/15 px-1.5 py-0.5 text-[10px] font-semibold text-diet">
                <Check className="size-2.5" /> {t("Eaten")}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
            <span>{macros.kcal} kcal</span>
            <span>
              {t("P")} {macros.proteinG} · {t("C")} {macros.carbsG} · {t("F")} {macros.fatG}
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
