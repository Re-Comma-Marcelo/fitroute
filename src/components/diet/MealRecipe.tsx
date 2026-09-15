import { useState } from "react";
import { ChefHat, ChevronDown, Clock, Lightbulb, Utensils } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { recipeFor } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";

/**
 * "How to make it" — the step-by-step for a catalogue meal, collapsed by
 * default so the sheet stays about the numbers until the user asks to cook.
 * Renders nothing for meals with no recipe (delivery, user-created meals).
 */
export function MealRecipe({
  mealId,
  prepMin,
  portion = 1,
}: {
  mealId: string;
  prepMin: number;
  /** Portion the user logged, so the quantities in the steps can be qualified. */
  portion?: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const recipe = recipeFor(mealId);

  if (!recipe) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-2xl border border-border bg-surface-2"
    >
      <CollapsibleTrigger className="tap-target flex w-full items-center gap-3 px-3.5 py-3 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-diet/10 text-diet">
          <ChefHat className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("How to make it")}</span>
          <span className="block text-xs text-muted-foreground">
            {t("{steps} steps · {prepMin} min · {tips} tips", {
              steps: recipe.steps.length,
              prepMin,
              tips: recipe.tips.length,
            })}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-4 border-t border-border px-3.5 py-3.5">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Utensils className="size-3" />
              {t("Makes {servings} serving(s)", { servings: recipe.servings })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {t("{prepMin} min prep", { prepMin })}
            </span>
          </p>

          {portion !== 1 ? (
            <p className="rounded-xl bg-surface-3 px-3 py-2 text-xs leading-snug text-muted-foreground">
              {t(
                "The quantities below are one full portion — you logged {portion}× this meal, so scale them accordingly.",
                { portion },
              )}
            </p>
          ) : null}

          <ol className="space-y-2.5">
            {recipe.steps.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-diet/15 text-[11px] font-semibold tabular-nums text-diet">
                  {i + 1}
                </span>
                <span className="text-sm leading-snug">{step}</span>
              </li>
            ))}
          </ol>

          {recipe.tips.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold">
                <Lightbulb className="size-3.5 text-diet" />
                {t("Tips that make the difference")}
              </h4>
              <ul className="mt-2 space-y-1.5">
                {recipe.tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex gap-2 text-sm leading-snug text-muted-foreground before:mt-2 before:size-1 before:shrink-0 before:rounded-full before:bg-muted-foreground/60"
                  >
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
