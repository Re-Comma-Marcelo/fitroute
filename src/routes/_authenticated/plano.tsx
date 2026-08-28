import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PlanImportPanel } from "@/components/plan/PlanImportPanel";
import { PlanReview } from "@/components/plan/PlanReview";
import { SportsPicker } from "@/components/plan/SportsPicker";
import { TimeReadBack } from "@/components/plan/TimeReadBack";
import { WeeklySlotGrid } from "@/components/plan/WeeklySlotGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getExercises } from "@/lib/data/exercises";
import { getMeals } from "@/lib/data/nutrition";
import { getProfile } from "@/lib/data/profile";
import { useT } from "@/lib/i18n";
import { generatePlan as generatePlanFn, translateGoal as translateGoalFn } from "@/lib/plan-ai.functions";
import { applyPlan } from "@/lib/plan/apply";
import { checkPace, checkTimeFit } from "@/lib/plan/guardrails";
import { deriveTimeBudget } from "@/lib/plan/life";
import {
  activeVersion,
  addPlanVersion,
  blankIntake,
  readPlanState,
  saveGoalTranslation,
  saveIntakeDraft,
  setActiveVersion,
} from "@/lib/plan/store";
import type { GoalTranslation, PlanIntake } from "@/lib/plan/types";
import { pageMeta } from "@/lib/route-meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/plano")({
  head: () => ({
    meta: pageMeta({
      title: "Get a plan",
      description: "An AI coaching interview that builds training and food around your real week.",
    }),
  }),
  component: PlanPage,
});

const STEPS = ["You", "Goal", "Training", "Your life & time", "Food"];

const EQUIPMENT = ["Barbell", "Dumbbells", "Machine", "Cable", "Kettlebell", "Bodyweight", "Bands"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PlanPage() {
  const t = useT();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<PlanIntake>(() => blankIntake());
  const [goal, setGoal] = useState<GoalTranslation | null>(null);
  const [goalConfirmed, setGoalConfirmed] = useState(false);
  const [busy, setBusy] = useState<"goal" | "plan" | "apply" | null>(null);
  const [state, setState] = useState(() => readPlanState());
  const [hydrated, setHydrated] = useState(false);

  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const mealsQuery = useQuery({ queryKey: ["meals"], queryFn: () => getMeals() });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  // Restore any draft, then prefill from the profile so nothing is asked twice.
  useEffect(() => {
    const stored = readPlanState();
    setState(stored);
    if (stored.intake) setIntake(stored.intake);
    if (stored.goal) {
      setGoal(stored.goal);
      setGoalConfirmed(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile || !hydrated || readPlanState().intake) return;
    setIntake((current) => ({
      ...current,
      weightKg: profile.pesoKg,
      heightCm: profile.alturaCm,
      sex: profile.sexo === "feminino" ? "female" : profile.sexo === "outro" ? "other" : "male",
      equipment: profile.equipment.length ? profile.equipment : current.equipment,
      gymDaysPerWeek: profile.metaTreinosSemana || current.gymDaysPerWeek,
      targetWeightKg: profile.pesoMetaKg ?? current.targetWeightKg,
    }));
  }, [profileQuery.data, hydrated]);

  useEffect(() => {
    if (hydrated) saveIntakeDraft(intake);
  }, [intake, hydrated]);

  const patch = (changes: Partial<PlanIntake>) => setIntake((current) => ({ ...current, ...changes }));

  const budget = useMemo(() => deriveTimeBudget(intake), [intake]);
  const pace = useMemo(
    () => checkPace(intake.weightKg, intake.targetWeightKg, intake.timelineWeeks),
    [intake.weightKg, intake.targetWeightKg, intake.timelineWeeks],
  );
  const timeWarning = useMemo(() => checkTimeFit(intake, budget), [intake, budget]);

  const current = activeVersion(state);

  const runGoal = async () => {
    setBusy("goal");
    try {
      const result = await translateGoalFn({ data: { intake } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setGoal(result.goal);
      setGoalConfirmed(false);
      saveGoalTranslation(result.goal);
    } catch {
      toast.error(t("Could not reach the coach. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const runPlan = async (feedback: string) => {
    setBusy("plan");
    try {
      const result = await generatePlanFn({
        data: { intake, goal, feedback, previous: feedback ? current?.plan ?? null : null },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      addPlanVersion(result.plan, feedback, feedback ? t("Regenerated with your feedback") : t("First plan"));
      setState(readPlanState());
      toast.success(t("Your plan is ready."));
    } catch {
      toast.error(t("Could not build the plan. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const activate = async () => {
    if (!current) return;
    setBusy("apply");
    try {
      const applied = await applyPlan(current.plan);
      toast.success(
        t("Plan activated — {routines} routine(s) and {meals} meal slot(s) added.", {
          routines: applied.routines,
          meals: applied.meals,
        }),
      );
      navigate({ to: "/treino" });
    } catch {
      toast.error(t("Could not activate the plan. Your plan is still saved here."));
    } finally {
      setBusy(null);
    }
  };

  if (current && busy !== "plan") {
    return (
      <AppShell title={t("Get a plan")} hideHeader>
        <div className="space-y-5 px-4 pb-8 pt-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("Your plan")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Built around your week. Manual routines and meals still work exactly as before.")}
            </p>
          </header>
          <PlanReview
            plan={current.plan}
            versions={state.versions}
            activeVersionId={state.activeVersionId}
            exercises={exercisesQuery.data ?? []}
            meals={mealsQuery.data ?? []}
            busy={busy !== null}
            onRegenerate={runPlan}
            onActivate={activate}
            onSelectVersion={(id) => {
              setActiveVersion(id);
              setState(readPlanState());
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("Get a plan")} hideHeader>
      <div className="space-y-5 px-4 pb-8 pt-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Get a plan")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Step {n} of {total} — {label}", { n: step + 1, total: STEPS.length, label: t(STEPS[step] ?? "") })}
          </p>
          <div className="flex gap-1">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")}
              />
            ))}
          </div>
        </header>

        {step === 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Age")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="h-11"
                  value={intake.age}
                  onChange={(e) => patch({ age: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label={t("Sex")}>
                <Select value={intake.sex} onValueChange={(v) => patch({ sex: v as PlanIntake["sex"] })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("Male")}</SelectItem>
                    <SelectItem value="female">{t("Female")}</SelectItem>
                    <SelectItem value="other">{t("Other")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("Height (cm)")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="h-11"
                  value={intake.heightCm}
                  onChange={(e) => patch({ heightCm: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label={t("Weight (kg)")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={intake.weightKg}
                  onChange={(e) => patch({ weightKg: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <Field label={t("Your days outside sport")}>
              <Select
                value={intake.dailyActivity}
                onValueChange={(v) => patch({ dailyActivity: v as PlanIntake["dailyActivity"] })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desk">{t("Mostly sitting")}</SelectItem>
                  <SelectItem value="onFeet">{t("On my feet a lot")}</SelectItem>
                  <SelectItem value="physical">{t("Physical work")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex gap-1.5">
              {(["words", "number"] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant="outline"
                  className={cn("h-11 flex-1", intake.goalMode === mode && "border-primary/60 bg-primary/15 text-primary")}
                  onClick={() => patch({ goalMode: mode })}
                >
                  {t(mode === "words" ? "Describe it" : "I have a target weight")}
                </Button>
              ))}
            </div>

            {intake.goalMode === "words" ? (
              <Field label={t("What do you want?")}>
                <Textarea
                  rows={3}
                  value={intake.goalText}
                  onChange={(e) => patch({ goalText: e.target.value })}
                  placeholder={t("e.g. get lean, look more athletic, build strength")}
                />
              </Field>
            ) : (
              <Field label={t("Target weight (kg)")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={intake.targetWeightKg ?? ""}
                  onChange={(e) => patch({ targetWeightKg: Number(e.target.value) || null })}
                />
              </Field>
            )}

            <Field label={t("Timeline (weeks)")}>
              <Input
                type="number"
                inputMode="numeric"
                className="h-11"
                value={intake.timelineWeeks ?? ""}
                onChange={(e) => patch({ timelineWeeks: Number(e.target.value) || null })}
              />
            </Field>

            {pace && !pace.ok ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-300">
                {t(
                  "That's about {rate} kg per week. A steadier {safe} kg per week — roughly {weeks} weeks — keeps strength and muscle.",
                  { rate: pace.weeklyKg, safe: pace.safeWeeklyKg, weeks: pace.suggestedWeeks },
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-11 w-full"
                  onClick={() => patch({ timelineWeeks: pace.suggestedWeeks })}
                >
                  {t("Use the steadier pace")}
                </Button>
              </div>
            ) : null}

            <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
              <p className="text-xs text-muted-foreground">
                {t("We translate this into concrete numbers and show them to you before building anything.")}
              </p>
              <Button type="button" variant="outline" className="h-11 w-full" disabled={busy !== null} onClick={runGoal}>
                {busy === "goal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t(goal ? "Translate again" : "Translate my goal")
                )}
              </Button>
              {goal ? (
                <div className="space-y-2 text-xs leading-relaxed">
                  <p className="font-medium">
                    {t("Target {low}-{high} kg over {weeks} weeks", {
                      low: goal.targetWeightLowKg,
                      high: goal.targetWeightHighKg,
                      weeks: goal.unrealistic ? goal.saferTimelineWeeks : goal.timelineWeeks,
                    })}
                  </p>
                  <p className="text-muted-foreground">{goal.bodyCompNote}</p>
                  <p className="text-muted-foreground">{goal.rationale}</p>
                  {goal.unrealistic ? (
                    <p className="text-amber-300">
                      {t("We stretched the timeline to {weeks} weeks to keep this healthy.", {
                        weeks: goal.saferTimelineWeeks,
                      })}
                    </p>
                  ) : null}
                  <label className="flex min-h-11 items-center gap-2">
                    <Switch checked={goalConfirmed} onCheckedChange={setGoalConfirmed} />
                    <span>{t("These numbers look right")}</span>
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <Field label={t("Equipment you can use")}>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT.map((item) => {
                  const on = intake.equipment.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        patch({
                          equipment: on
                            ? intake.equipment.filter((e) => e !== item)
                            : [...intake.equipment, item],
                        })
                      }
                      className={cn(
                        "min-h-11 rounded-lg border px-3 text-xs font-medium",
                        on ? "border-primary/50 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {t(item)}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Gym days / week")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="h-11"
                  value={intake.gymDaysPerWeek}
                  onChange={(e) => patch({ gymDaysPerWeek: Number(e.target.value) || 1 })}
                />
              </Field>
              <Field label={t("Experience")}>
                <Select
                  value={intake.experience}
                  onValueChange={(v) => patch({ experience: v as PlanIntake["experience"] })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{t("Beginner")}</SelectItem>
                    <SelectItem value="intermediate">{t("Intermediate")}</SelectItem>
                    <SelectItem value="advanced">{t("Advanced")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label={t("Injuries or limitations")}>
              <Textarea
                rows={2}
                value={intake.limitations}
                onChange={(e) => patch({ limitations: e.target.value })}
                placeholder={t("e.g. sore left shoulder, no overhead pressing")}
              />
            </Field>

            <Field label={t("Other sports you train")}>
              <SportsPicker value={intake.sports} onChange={(sports) => patch({ sports })} />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <Field label={t("Which parts of your week are open?")}>
              <WeeklySlotGrid value={intake.slots} onChange={(slots) => patch({ slots })} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Work pattern")}>
                <Select
                  value={intake.workPattern}
                  onValueChange={(v) => patch({ workPattern: v as PlanIntake["workPattern"] })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">{t("Regular hours")}</SelectItem>
                    <SelectItem value="shifts">{t("Shifts")}</SelectItem>
                    <SelectItem value="nights">{t("Nights")}</SelectItem>
                    <SelectItem value="travel">{t("Lots of travel")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("Commute (min/day)")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="h-11"
                  value={intake.commuteMin}
                  onChange={(e) => patch({ commuteMin: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label={t("Sleep (h)")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={intake.sleepHours}
                  onChange={(e) => patch({ sleepHours: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label={t("Stress (1-5)")}>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  inputMode="numeric"
                  className="h-11"
                  value={intake.stress}
                  onChange={(e) => patch({ stress: Number(e.target.value) || 1 })}
                />
              </Field>
            </div>

            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 px-3">
              <span className="text-sm">{t("I have care duties (kids, family)")}</span>
              <Switch
                checked={intake.careDuties}
                onCheckedChange={(careDuties) => patch({ careDuties })}
              />
            </label>

            <Field label={t("Anything else about your week?")}>
              <Textarea
                rows={2}
                value={intake.lifeNotes}
                onChange={(e) => patch({ lifeNotes: e.target.value })}
                placeholder={t("e.g. Wednesdays are chaos, I travel every other weekend")}
              />
            </Field>

            <TimeReadBack
              budget={budget}
              sportSessions={intake.sports.reduce((sum, s) => sum + s.sessionsPerWeek, 0)}
              adjust={intake.timeAdjust}
              onAdjust={(timeAdjust) => patch({ timeAdjust })}
            />

            {timeWarning ? (
              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-300">
                {t(timeWarning)}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <Field label={t("Allergies or restrictions")}>
              <Textarea
                rows={2}
                value={intake.allergies}
                onChange={(e) => patch({ allergies: e.target.value })}
                placeholder={t("e.g. lactose, peanuts, vegetarian")}
              />
            </Field>
            <Field label={t("Food you dislike")}>
              <Textarea
                rows={2}
                value={intake.dislikes}
                onChange={(e) => patch({ dislikes: e.target.value })}
              />
            </Field>
            <Field label={t("Food you love")}>
              <Textarea
                rows={2}
                value={intake.likes}
                onChange={(e) => patch({ likes: e.target.value })}
                placeholder={t("e.g. avocado, eggs, meat")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Time to cook")}>
                <Select value={intake.cookTime} onValueChange={(v) => patch({ cookTime: v as PlanIntake["cookTime"] })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("Almost none")}</SelectItem>
                    <SelectItem value="some">{t("Some")}</SelectItem>
                    <SelectItem value="plenty">{t("Plenty")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("Eating out / week")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="h-11"
                  value={intake.eatOutPerWeek}
                  onChange={(e) => patch({ eatOutPerWeek: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>

            <Field label={t("Budget")}>
              <Select value={intake.budget} onValueChange={(v) => patch({ budget: v as PlanIntake["budget"] })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tight">{t("Tight")}</SelectItem>
                  <SelectItem value="normal">{t("Normal")}</SelectItem>
                  <SelectItem value="comfortable">{t("Comfortable")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <details className="rounded-xl border border-border/60 bg-card/40 p-3">
              <summary className="min-h-11 cursor-pointer text-sm font-medium">
                {t("Import notes from another app (optional)")}
              </summary>
              <div className="pt-3">
                <PlanImportPanel />
              </div>
            </details>
          </div>
        ) : null}

        <div className="flex gap-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 gap-1.5"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("Back")}
            </Button>
          ) : null}

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="h-12 flex-1 gap-1.5"
              disabled={step === 1 && Boolean(goal) && !goalConfirmed}
              onClick={() => setStep((s) => s + 1)}
            >
              {t("Next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-12 flex-1 gap-1.5"
              disabled={busy !== null || budget.gymSlots.length === 0}
              onClick={() => runPlan("")}
            >
              {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy === "plan" ? t("Building your plan…") : t("Build my plan")}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t("Optional — you can keep logging and building routines by hand at any time.")}
        </p>
      </div>
    </AppShell>
  );
}
