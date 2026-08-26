import { ArrowLeftRight, Sparkles } from "lucide-react";
import { mealImage } from "@/lib/meal-image";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { SwapSuggestion } from "@/lib/nutrition-swap";

function delta(value: number, unit: string) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)}${unit}`;
}

export function MealSwapCard({
  suggestion,
  onSwap,
  onDetails,
}: {
  suggestion: SwapSuggestion;
  onSwap: () => void;
  onDetails: () => void;
}) {
  const t = useT();
  const { meal, current, reason, deltas } = suggestion;
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-primary/25 bg-primary/5">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">
          {t("Better fit for today")}
        </h3>
      </div>

      <div className="flex gap-3 p-4">
        <img
          src={mealImage(meal.slots[0])}
          alt={meal.name}
          loading="lazy"
          className="size-20 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ArrowLeftRight className="size-3" />
            <span className="truncate line-through">{current.name}</span>
          </p>
          <p className="truncate text-sm font-semibold">{meal.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-[11px] tabular-nums">
            {[
              { label: "kcal", v: deltas.kcal, u: "" },
              { label: "P", v: deltas.proteinG, u: "g" },
              { label: "C", v: deltas.carbsG, u: "g" },
              { label: "F", v: deltas.fatG, u: "g" },
            ]
              .filter((d) => Math.round(d.v) !== 0)
              .map((d) => (
                <li
                  key={d.label}
                  className={`rounded-full border px-2 py-0.5 ${
                    d.v > 0 ? "border-primary/30 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {t(d.label)} {delta(d.v, d.u)}
                </li>
              ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <Button variant="outline" className="tap-target flex-1" onClick={onDetails}>
          {t("Details")}
        </Button>
        <Button className="tap-target flex-1" onClick={onSwap}>
          {t("Swap in")}
        </Button>
      </div>
    </section>
  );
}
