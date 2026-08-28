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

const NOTES_KEY = "__notes";

const MACROS: {
  label: string;
  suffix: string;
  value: (d: GeneratedPlan["diet"]) => number;
  className: string;
}[] = [
  { label: "kcal", suffix: "", value: (d) => d.kcal, className: "border-primary/30 bg-primary/10" },
  { label: "Protein", suffix: "g", value: (d) => d.proteinG, className: "border-accent/30 bg-accent/10" },
  { label: "Carbs", suffix: "g", value: (d) => d.carbsG, className: "border-border/60 bg-card/40" },
  { label: "Fat", suffix: "g", value: (d) => d.fatG, className: "border-border/60 bg-card/40" },
];

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
  const [openMeal, setOpenMeal] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const mealById = new Map(meals.map((m) => [m.id, m]));

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <p className="text-sm leading-relaxed text-foreground/90">{plan.summary}</p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Dumbbell className="h-3.5 w-3.5" />
          </span>
          {t("Your week")}
        </h2>
        {planDayOrder(plan).map((day) => {
          const isOpen = open === day.day;
          return (
            <div
              key={day.day}
              className={cn(
                "overflow-hidden rounded-xl border border-border/60 bg-card/40 border-l-[3px]",
                day.kind === "gym" && "border-l-primary",
                day.kind === "sport" && "border-l-accent",
                day.kind === "rest" && "border-l-muted-foreground/40",
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : day.day)}
                aria-expanded={isOpen}
                className="flex min-h-[3.25rem] w-full items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t(DAY_LABEL[day.day] ?? "")}</span>
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
                        <ExerciseThumb grupo={exercise?.grupoPrimario} nome={exercise?.nome} className="h-10 w-10 shrink-0" />
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
          <span className="flex size-6 items-center justify-center rounded-md bg-accent/20 text-accent-foreground">
            <Utensils className="h-3.5 w-3.5" />
          </span>
          {t("Your food")}
        </h2>

        <div className="grid grid-cols-4 gap-1.5">
          {MACROS.map((macro) => (
            <div key={macro.label} className={cn("rounded-xl border p-2 text-center", macro.className)}>
              <p className="text-sm font-semibold tabular-nums">
                {macro.value(plan.diet)}
                {macro.suffix}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t(macro.label)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          {plan.diet.meals.map((meal) => {
            const key = `${meal.slot}-${meal.mealId}`;
            const isOpen = openMeal === key;
            const found = mealById.get(meal.mealId);
            return (
              <div key={key} className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
                <button
                  type="button"
                  onClick={() => setOpenMeal(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  className="flex min-h-[3.25rem] w-full items-center justify-between gap-2 px-4 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {t(meal.slot)}
                    </span>
                    <span className="block truncate text-sm">{found?.name ?? meal.mealId}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {found ? (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {t("{kcal} kcal · {p}g P", { kcal: found.kcal, p: found.proteinG })}
                      </span>
                    ) : null}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </span>
                </button>
                {isOpen ? (
                  <div className="space-y-2 border-t border-border/60 px-4 py-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">{meal.why}</p>
                    {found?.ingredients.length ? (
                      <ul className="space-y-0.5 text-xs text-muted-foreground/90">
                        {found.ingredients.map((ing) => (
                          <li key={ing.name} className="flex justify-between gap-2">
                            <span>{ing.name}</span>
                            <span className="tabular-nums">
                              {ing.qty} {ing.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {plan.diet.notes.length > 0 || plan.diet.sportDayNote ? (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
              <button
                type="button"
                onClick={() => setOpenMeal(openMeal === NOTES_KEY ? null : NOTES_KEY)}
                aria-expanded={openMeal === NOTES_KEY}
                className="flex min-h-[3.25rem] w-full items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="text-sm">{t("Notes and adjustments")}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    openMeal === NOTES_KEY && "rotate-180",
                  )}
                />
              </button>
              {openMeal === NOTES_KEY ? (
                <div className="space-y-2 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
                  {plan.diet.sportDayNote ? <p>{plan.diet.sportDayNote}</p> : null}
                  <ul className="space-y-1">
                    {plan.diet.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="px-1 text-xs text-muted-foreground/80">{t(CONSULT_NOTE)}</p>
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
