import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HevyImportPanel } from "@/components/import/HevyImportPanel";
import { RouteLogo } from "@/components/RouteLogo";
import { getExercises } from "@/lib/data/exercises";
import { getProfile, saveProfile } from "@/lib/data/profile";
import { saveRoutine } from "@/lib/data/routines";
import { useLanguage, useT } from "@/lib/i18n";
import {
  DEFAULT_ANSWERS,
  buildStarterPlan,
  goalToObjetivo,
  sortDays,
  templateFor,
  type StarterAnswers,
  type StarterExperience,
  type StarterGoal,
} from "@/lib/import/starter-routine";
import { markOnboardingDone } from "@/lib/onboarding";
import { pageMeta } from "@/lib/route-meta";
import { estimateRoutineMinutes } from "@/lib/routine-estimate";
import type { Routine } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: pageMeta({
      title: "Welcome",
      description: "Set up Route in under a minute or import your Hevy history.",
      twitterCard: "summary",
    }),
  }),
  component: OnboardingPage,
});

/**
 * One question per screen, one decision per tap. Every answer feeds the
 * profile or the routines; nothing is asked just to be asked. The flow ends
 * on the routines the person will train with, never on an empty home.
 */
type Step = "name" | "goal" | "days" | "experience" | "plan" | "import";

const QUESTIONS: Step[] = ["name", "goal", "days", "experience", "plan"];
/** Sunday first, matching `Date#getDay()`. */
const WEEK = [0, 1, 2, 3, 4, 5, 6] as const;

function OnboardingPage() {
  const t = useT();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Partial<StarterAnswers>>({});
  const [creating, setCreating] = useState(false);

  // Someone replaying the flow from Profile already has a name.
  useEffect(() => {
    if (profileQ.data?.nome && !name) setName(profileQ.data.nome);
    // Prefill once; typing must not be overwritten by a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQ.data?.nome]);

  const dayLabels = useMemo(() => {
    const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    const short = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return WEEK.map((day) => {
      const date = new Date(2024, 0, 7 + day); // 2024-01-07 was a Sunday.
      return { narrow: narrow.format(date), short: short.format(date).replace(/\.$/, "") };
    });
  }, [locale]);

  /** Whatever was skipped falls back to a sensible default. */
  const complete: StarterAnswers = useMemo(
    () => ({
      goal: answers.goal ?? DEFAULT_ANSWERS.goal,
      days: answers.days?.length ? answers.days : DEFAULT_ANSWERS.days,
      experience: answers.experience ?? DEFAULT_ANSWERS.experience,
    }),
    [answers],
  );

  const plan = useMemo(() => {
    if (step !== "plan" || !exercisesQ.data?.length) return null;
    return buildStarterPlan(complete, exercisesQ.data, (source) => t(source));
  }, [step, complete, exercisesQ.data, t]);

  const questionIndex = QUESTIONS.indexOf(step);
  const progressPct = questionIndex >= 0 ? ((questionIndex + 1) / QUESTIONS.length) * 100 : 0;

  async function persistProfileAnswers() {
    const profile = await getProfile();
    const trimmed = name.trim();
    await saveProfile({
      ...profile,
      nome: trimmed || profile.nome,
      objetivo: goalToObjetivo(complete.goal),
      metaTreinosSemana: sortDays(complete.days).length,
    });
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function startHere() {
    if (!plan) return;
    setCreating(true);
    try {
      const saved: Routine[] = [];
      for (const routine of plan.routines) saved.push(await saveRoutine(routine));
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      await persistProfileAnswers();
      markOnboardingDone();
      toast.success(t("{count} routines created.", { count: saved.length }));
      navigate({ to: "/treino", replace: true });
    } catch (error) {
      console.error("Failed to save routines from onboarding:", error);
      toast.error(t("Could not create the routines. Try again."));
    } finally {
      setCreating(false);
    }
  }

  async function buildMyself() {
    setCreating(true);
    try {
      await persistProfileAnswers();
    } catch (error) {
      console.error("Failed to save profile from onboarding:", error);
    } finally {
      setCreating(false);
    }
    markOnboardingDone();
    navigate({ to: "/rotina/$id", params: { id: "nova" }, replace: true });
  }

  function back() {
    if (step === "import") return setStep("plan");
    const idx = QUESTIONS.indexOf(step);
    if (idx > 0) setStep(QUESTIONS[idx - 1]!);
  }

  const toggleDay = (day: number) =>
    setAnswers((a) => {
      const current = a.days ?? [];
      return {
        ...a,
        days: current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
      };
    });

  const pickedDays = sortDays(answers.days ?? []);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-8 pt-4">
      <div className="mb-4 flex h-11 items-center justify-between">
        {step === "name" ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={back}
            aria-label={t("Back")}
            className="tap-target -ml-2 grid size-11 place-items-center rounded-full text-muted-foreground"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <RouteLogo className="size-9" />
      </div>

      {questionIndex >= 0 ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPct)}
          className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : null}

      <div key={step} className="fade-in flex flex-1 flex-col">
        {step === "name" ? (
          <section className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Welcome to Route.")}
              <br />
              {t("What should we call you?")}
            </h1>
            <Input
              id="onboarding-name"
              autoFocus
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setStep("goal");
              }}
              placeholder={t("Your name")}
              className="mt-6 h-12 text-base"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("This is your starting point.")}
            </p>
            <Button
              className="tap-target mt-auto h-14 w-full gap-2"
              onClick={() => setStep("goal")}
            >
              {t("Continue")} <ArrowRight className="size-4" />
            </Button>
          </section>
        ) : null}

        {step === "goal" ? (
          <Question
            title={t("Where do you want to get to?")}
            columns={2}
            selected={answers.goal}
            options={[
              { value: "muscle", label: t("Build muscle") },
              { value: "strength", label: t("Get stronger") },
              { value: "fat-loss", label: t("Lose fat") },
              { value: "comeback", label: t("Get back to training") },
            ]}
            onPick={(value) => {
              setAnswers((a) => ({ ...a, goal: value as StarterGoal }));
              setStep("days");
            }}
            onSkip={() => setStep("plan")}
          />
        ) : null}

        {step === "days" ? (
          <section className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Which days can you train?")}
            </h1>
            <div className="mt-6 grid grid-cols-7 gap-1.5" role="group">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const on = pickedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    aria-label={dayLabels[day]!.short}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "tap-target aspect-square rounded-full border text-sm font-semibold transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {dayLabels[day]!.narrow}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {pickedDays.length
                ? `${t("{count} day(s) a week", { count: pickedDays.length })} · ${t(templateFor(pickedDays.length).nome)}`
                : t("Skip — you can change this later")}
            </p>
            <Button
              className="tap-target mt-auto h-14 w-full gap-2"
              disabled={!pickedDays.length}
              onClick={() => setStep("experience")}
            >
              {t("Continue")} <ArrowRight className="size-4" />
            </Button>
            <SkipLink onSkip={() => setStep("plan")} />
          </section>
        ) : null}

        {step === "experience" ? (
          <Question
            title={t("Have you trained before?")}
            selected={answers.experience}
            options={[
              { value: "beginner", label: t("Just starting") },
              { value: "intermediate", label: t("Training for a while") },
              { value: "advanced", label: t("Advanced") },
            ]}
            onPick={(value) => {
              setAnswers((a) => ({ ...a, experience: value as StarterExperience }));
              setStep("plan");
            }}
            onSkip={() => setStep("plan")}
          />
        ) : null}

        {step === "plan" && plan ? (
          <section className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">{t("Your first stretch")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("{template} · {days} days · {min}-{max} reps", {
                template: t(plan.template.nome),
                days: sortDays(complete.days).length,
                min: plan.prescription.repsMin,
                max: plan.prescription.repsMax,
              })}
            </p>

            <ul className="mt-4 space-y-2">
              {plan.routines.map((routine) => (
                <RoutineRow
                  key={routine.id}
                  routine={routine}
                  dayLabel={
                    routine.diasSemana?.length
                      ? routine.diasSemana.map((d) => dayLabels[d]!.short).join(" · ")
                      : t("Unscheduled")
                  }
                  exerciseNames={routine.exercicios.map(
                    (re) => exercisesQ.data?.find((e) => e.id === re.exerciseId)?.nome ?? "",
                  )}
                  sets={plan.prescription.sets}
                  repsMin={plan.prescription.repsMin}
                  repsMax={plan.prescription.repsMax}
                />
              ))}
            </ul>

            <Button
              className="tap-target mt-auto h-14 w-full"
              disabled={creating}
              onClick={startHere}
            >
              {creating ? t("Creating…") : t("Start here")}
            </Button>
            <div className="mt-3 flex items-center justify-center gap-3 text-xs font-semibold text-muted-foreground">
              <button
                type="button"
                className="tap-target"
                disabled={creating}
                onClick={buildMyself}
              >
                {t("Build it myself")}
              </button>
              <span aria-hidden>·</span>
              <button type="button" className="tap-target" onClick={() => setStep("import")}>
                {t("Import from Hevy")}
              </button>
            </div>
          </section>
        ) : null}

        {step === "plan" && !plan ? (
          <section className="pt-10 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-primary motion-reduce:animate-none" />
            <p className="mt-4 text-sm font-semibold">
              {exercisesQ.isError
                ? t("We could not load the exercise library.")
                : t("Your first stretch")}
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
          </section>
        ) : null}

        {step === "import" ? (
          <section>
            <h1 className="text-2xl font-semibold tracking-tight">{t("Import from Hevy")}</h1>
            <div className="mt-4">
              <HevyImportPanel
                onFinished={() => {
                  markOnboardingDone();
                  navigate({ to: "/inicio", replace: true });
                }}
              />
            </div>
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
      className="tap-target mx-auto mt-2 block text-xs font-semibold text-muted-foreground"
    >
      {t("Skip — you can change this later")}
    </button>
  );
}

function Question({
  title,
  options,
  selected,
  columns = 1,
  onPick,
  onSkip,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected?: string | undefined;
  columns?: 1 | 2;
  onPick: (value: string) => void;
  onSkip: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className={cn("mt-6 grid gap-3", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === selected}
            onClick={() => onPick(o.value)}
            className={cn(
              "tap-target min-h-14 rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition-transform active:scale-[0.98]",
              o.value === selected ? "border-primary bg-primary/15" : "border-border bg-card",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-auto">
        <SkipLink onSkip={onSkip} />
      </div>
    </section>
  );
}

/** One routine of the starter week; tapping shows the exercises it holds. */
function RoutineRow({
  routine,
  dayLabel,
  exerciseNames,
  sets,
  repsMin,
  repsMax,
}: {
  routine: Routine;
  dayLabel: string;
  exerciseNames: string[];
  sets: number;
  repsMin: number;
  repsMax: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const minutes = estimateRoutineMinutes(routine);
  return (
    <li className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="tap-target flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-primary">
          {dayLabel}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{routine.nome}</span>
          <span className="block text-xs text-muted-foreground tabular-nums">
            {t("{count} exercises", { count: routine.exercicios.length })} ·{" "}
            {t("~{min} min", { min: minutes })}
          </span>
        </span>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <ul className="space-y-1.5 border-t border-border px-3 py-3">
          {exerciseNames.map((nome, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate">{nome}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {t("{sets} sets · {min}-{max} reps", { sets, min: repsMin, max: repsMax })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
