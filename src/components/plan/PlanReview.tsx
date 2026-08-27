import { useState } from "react";
import { ChevronDown, Dumbbell, Utensils } from "lucide-react";

import { ExerciseThumb } from "@/components/ExerciseThumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { planDayOrder } from "@/lib/plan/apply";
import { CONSULT_NOTE } from "@/lib/plan/guardrails";
import type { GeneratedPlan, PlanVersion } from "@/lib/plan/types";
import type { Exercise } from "@/lib/types";
import type { Meal } from "@/lib/nutrition-types";
import { cn } from "@/lib/utils";

const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function PlanReview({
  plan,
  versions,
  activeVersionId,
  exercises,
  meals,
  busy,
  onRegenerate,
  onActivate,
  onSelectVersion,
}: {
  plan: GeneratedPlan;
  versions: PlanVersion[];
  activeVersionId: string | null;
  exercises: Exercise[];
  meals: Meal[];
  busy: boolean;
  onRegenerate: (feedback: string) => void;
  onActivate: () => void;
  onSelectVersion: (id: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const mealById = new Map(meals.map((m) => [m.id, m]));

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/60 bg-card/50 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{plan.summary}</p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Dumbbell className="h-4 w-4" />
          {t("Your week")}
        </h2>
        {planDayOrder(plan).map((day) => {
          const isOpen = open === day.day;
          return (
            <div key={day.day} className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : day.day)}
                aria-expanded={isOpen}
                className="flex min-h-[3.25rem] w-full items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t(DAY_LABEL[day.day])}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {day.kind === "rest" ? t("Rest") : day.label}
                    {day.minutes > 0 ? ` · ${day.minutes} ${t("min")}` : ""}
                  </span>
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen ? (
                <div className="space-y-3 border-t border-border/60 px-4 py-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">{day.why}</p>
                  {day.exercises.map((ex) => {
                    const exercise = exerciseById.get(ex.exerciseId);
                    return (
                      <div key={ex.exerciseId} className="flex items-center gap-3">
                        <ExerciseThumb exercise={exercise} className="h-10 w-10 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-sm">{exercise?.nome ?? ex.exerciseId}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("{sets} sets · {min}-{max} reps · {rest}s rest", {
                              sets: ex.sets,
                              min: ex.repsMin,
                              max: ex.repsMax,
                              rest: ex.restSec,
                            })}
                          </p>
                          {ex.note ? <p className="text-xs text-muted-foreground/80">{ex.note}</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Utensils className="h-4 w-4" />
          {t("Your food")}
        </h2>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-sm font-medium">
            {t("{kcal} kcal · {p}g protein · {c}g carbs · {f}g fat", {
              kcal: plan.diet.kcal,
              p: plan.diet.proteinG,
              c: plan.diet.carbsG,
              f: plan.diet.fatG,
            })}
          </p>
          <ul className="mt-3 space-y-2">
            {plan.diet.meals.map((meal) => (
              <li key={`${meal.slot}-${meal.mealId}`} className="text-sm">
                <span className="text-muted-foreground">{t(meal.slot)}: </span>
                {mealById.get(meal.mealId)?.name ?? meal.mealId}
                <span className="block text-xs text-muted-foreground">{meal.why}</span>
              </li>
            ))}
          </ul>
          {plan.diet.sportDayNote ? (
            <p className="mt-3 text-xs text-muted-foreground">{plan.diet.sportDayNote}</p>
          ) : null}
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {plan.diet.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground/80">{t(CONSULT_NOTE)}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Not quite right?")}
        </h2>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          placeholder={t("e.g. no squats on Monday, more upper body, shorter sessions")}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={busy || feedback.trim().length === 0}
          onClick={() => {
            onRegenerate(feedback.trim());
            setFeedback("");
          }}
        >
          {t("Regenerate with this feedback")}
        </Button>
      </section>

      {versions.length > 1 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Versions")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {versions.map((version, i) => (
              <button
                key={version.id}
                type="button"
                onClick={() => onSelectVersion(version.id)}
                className={cn(
                  "min-h-11 rounded-lg border px-3 text-xs",
                  version.id === activeVersionId
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                {t("v{n}", { n: i + 1 })}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <Button type="button" className="h-12 w-full" disabled={busy} onClick={onActivate}>
        {t("Use this plan")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {t("Activating adds routines and meals you can still edit by hand.")}
      </p>
    </div>
  );
}
