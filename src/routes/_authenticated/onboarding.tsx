import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Dumbbell, Flame, Import, Loader2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/CountUp";
import { HevyImportPanel } from "@/components/import/HevyImportPanel";
import { getExercises } from "@/lib/data/exercises";
import { newRoutineExercise, saveRoutine } from "@/lib/data/routines";
import { formatNumber } from "@/lib/format";
import { useT } from "@/lib/i18n";
import {
  buildStarterPlan,
  planToRoutine,
  type StarterAnswers,
  type StarterExperience,
  type StarterFrequency,
  type StarterGoal,
} from "@/lib/import/starter-routine";
import { markOnboardingDone } from "@/lib/onboarding";
import { pageMeta } from "@/lib/route-meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: pageMeta({
      title: "Welcome",
      description: "Set up Iron Logger in under a minute or import your Hevy history.",
      twitterCard: "summary",
    }),
  }),
  component: OnboardingPage,
});

type Step = "value" | "fork" | "import" | "goal" | "frequency" | "experience" | "building" | "plan";

const DEMO_VOLUME = 12480;
const DEMO_CELLS = [
  0, 2, 0, 1, 2, 0, 0, 2, 0, 1, 0, 2, 0, 0, 1, 2, 0, 2, 0, 1, 0, 2, 0, 2, 1, 0, 2, 0, 0, 2, 1, 2, 0,
  2, 0, 1, 0, 2, 0, 2, 0, 0,
] as const;

function OnboardingPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises });

  const [step, setStep] = useState<Step>("value");
  const [answers, setAnswers] = useState<Partial<StarterAnswers>>({});
  const [creating, setCreating] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  }, []);

  const finish = () => {
    markOnboardingDone();
    navigate({ to: "/inicio" });
  };

  useEffect(() => {
    if (step !== "building") return;
    const id = setTimeout(() => setStep("plan"), 1500);
    return () => clearTimeout(id);
  }, [step]);

  const plan = useMemo(() => {
    if (!answers.goal || !answers.frequency || !answers.experience) return null;
    return buildStarterPlan(answers as StarterAnswers, exercisesQ.data ?? []);
  }, [answers, exercisesQ.data]);

  async function useThisRoutine() {
    if (!plan) return;
    setCreating(true);
    try {
      const saved = await saveRoutine(planToRoutine(plan, newRoutineExercise));
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      toast.success(t('Routine "{name}" created', { name: saved.nome }));
      finish();
    } catch {
      toast.error(t("Could not create the routine. Try again."));
    } finally {
      setCreating(false);
    }
  }

  const questionIndex = step === "goal" ? 1 : step === "frequency" ? 2 : step === "experience" ? 3 : 0;
  // Endowed progress: the bar never starts empty.
  const progressPct = questionIndex > 0 ? 25 + questionIndex * 20 : 0;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-8 pt-6">
      {questionIndex > 0 ? (
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : null}

      <div key={step} className="fade-in flex-1">
        {step === "value" ? (
          <section>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Your training, turned into visible progress")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Every set you log feeds a dashboard like this one.")}
            </p>

            <Card className="mt-5 rounded-2xl border-border bg-card p-4">
              <p className="label-caps text-train">{t("This week")}</p>
              <p className="num-hero text-train">
                <CountUp value={DEMO_VOLUME} format={(n) => formatNumber(n)} />
                <span className="ml-1 text-base font-semibold">kg</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-success">
                {t("+{pct}% vs last week", { pct: formatNumber(12) })}
              </p>

              <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1">
                {DEMO_CELLS.map((level, i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-3 rounded-[3px]",
                      level === 0
                        ? "bg-surface-3"
                        : level === 1
                          ? "bg-train/40"
                          : "bg-train",
                    )}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success-bg px-3 py-2">
                <Trophy className="size-4 text-success" />
                <p className="text-xs font-semibold text-success">
                  {t("New PR: Bench Press 92.5 kg")}
                </p>
              </div>
            </Card>

            <Button className="tap-target mt-6 w-full gap-2" onClick={() => setStep("fork")}>
              {t("Get started")} <ArrowRight className="size-4" />
            </Button>
            <SkipLink onSkip={finish} />
          </section>
        ) : null}

        {step === "fork" ? (
          <section>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Do you already train with another app?")}
            </h1>
            <div className="mt-5 space-y-3">
              <BigCard
                icon={<Import className="size-5 text-primary" />}
                title={t("Import my Hevy history")}
                subtitle={t("Your dashboard starts full, with PRs and streaks.")}
                onClick={() => setStep("import")}
              />
              <BigCard
                icon={<Dumbbell className="size-5 text-train" />}
                title={t("Start from scratch")}
                subtitle={t("Three quick questions and we suggest a routine.")}
                onClick={() => setStep("goal")}
              />
            </div>
            <SkipLink onSkip={finish} />
          </section>
        ) : null}

        {step === "import" ? (
          <section>
            <h1 className="text-2xl font-semibold tracking-tight">{t("Import from Hevy")}</h1>
            <div className="mt-4">
              <HevyImportPanel onFinished={finish} />
            </div>
            <SkipLink onSkip={finish} />
          </section>
        ) : null}

        {step === "goal" ? (
          <Question
            title={t("What is your main goal?")}
            options={[
              { value: "hypertrophy", label: t("Hypertrophy") },
              { value: "strength", label: t("Strength") },
              { value: "conditioning", label: t("Conditioning") },
            ]}
            onPick={(value) => {
              setAnswers((a) => ({ ...a, goal: value as StarterGoal }));
              setStep("frequency");
            }}
            onSkip={finish}
          />
        ) : null}

        {step === "frequency" ? (
          <Question
            title={t("How many days a week can you train?")}
            options={[
              { value: "2-3", label: t("2-3 days") },
              { value: "4", label: t("4 days") },
              { value: "5+", label: t("5+ days") },
            ]}
            onPick={(value) => {
              setAnswers((a) => ({ ...a, frequency: value as StarterFrequency }));
              setStep("experience");
            }}
            onSkip={finish}
          />
        ) : null}

        {step === "experience" ? (
          <Question
            title={t("How much lifting experience do you have?")}
            options={[
              { value: "beginner", label: t("Just starting") },
              { value: "intermediate", label: t("Training for a while") },
              { value: "advanced", label: t("Advanced") },
            ]}
            onPick={(value) => {
              setAnswers((a) => ({ ...a, experience: value as StarterExperience }));
              setStep("building");
            }}
            onSkip={finish}
          />
        ) : null}

        {step === "building" ? (
          <section className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <div className="flex items-end gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-3 rounded-full bg-primary"
                  style={{
                    height: `${16 + i * 10}px`,
                    ...(reducedMotion
                      ? {}
                      : {
                          animation: "pulse 1.2s ease-in-out infinite",
                          animationDelay: `${i * 120}ms`,
                        }),
                  }}
                />
              ))}
            </div>
            <p className="mt-5 text-sm font-semibold">{t("Building your plan")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Matching volume and rest to your answers.")}
            </p>
          </section>
        ) : null}

        {step === "plan" && plan ? (
          <section>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="label-caps">{t("Suggested routine")}</p>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{plan.name}</h1>

            <Card className="mt-4 rounded-2xl border-border bg-card p-4">
              <ul className="space-y-2.5">
                {plan.exercises.map((item) => (
                  <li key={item.exercise.id} className="flex items-center gap-3">
                    <Flame className="size-4 shrink-0 text-train" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.exercise.nome}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {t("{sets} sets · {min}-{max} reps", {
                          sets: item.prescription.sets,
                          min: item.prescription.repsMin,
                          max: item.prescription.repsMax,
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Button
              className="tap-target mt-5 w-full"
              disabled={creating}
              onClick={useThisRoutine}
            >
              {creating ? t("Creating…") : t("Use this routine")}
            </Button>
            <Button
              variant="outline"
              className="tap-target mt-2 w-full"
              onClick={() => {
                markOnboardingDone();
                navigate({ to: "/treino" });
              }}
            >
              {t("Build it myself")}
            </Button>
            <SkipLink onSkip={finish} />
          </section>
        ) : null}

        {step === "plan" && !plan ? (
          <section className="pt-10 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-primary motion-reduce:animate-none" />
            <p className="mt-4 text-sm font-semibold">
              {exercisesQ.isError
                ? t("We could not load the exercise library.")
                : t("Building your plan")}
            </p>
            {exercisesQ.isError ? (
              <Button
                variant="outline"
                className="tap-target mt-4 w-full"
                onClick={() => void exercisesQ.refetch()}
              >
                {t("Try again")}
              </Button>
            ) : null}
            <SkipLink onSkip={finish} />
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SkipLink({ onSkip }: { onSkip: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onSkip}
      className="tap-target mx-auto mt-4 block text-xs font-semibold text-muted-foreground"
    >
      {t("Skip for now")}
    </button>
  );
}

function BigCard({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target w-full rounded-2xl border border-border bg-card p-4 text-left transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-3">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

function Question({
  title,
  options,
  onPick,
  onSkip,
}: {
  title: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
  onSkip: () => void;
}) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-5 space-y-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            className="tap-target w-full rounded-2xl border border-border bg-card px-4 py-4 text-left text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            {o.label}
          </button>
        ))}
      </div>
      <SkipLink onSkip={onSkip} />
    </section>
  );
}
