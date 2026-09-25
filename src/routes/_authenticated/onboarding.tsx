import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flag,
  Flame,
  Loader2,
  RotateCcw,
  Scale,
  Shuffle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HevyImportPanel } from "@/components/import/HevyImportPanel";
import { RouteMarkProgress } from "@/components/RouteLogo";
import { getExercises } from "@/lib/data/exercises";
import { getProfile, saveProfile } from "@/lib/data/profile";
import { getCheckpoints, saveCheckpoint } from "@/lib/data/route";
import { saveRoutine } from "@/lib/data/routines";
import { formatDate } from "@/lib/format";
import { useLanguage, useT } from "@/lib/i18n";
import {
  DEFAULT_ANSWERS,
  buildStarterPlan,
  goalToObjetivo,
  goalToTrainingGoal,
  nearestCleanDayCount,
  sortDays,
  templateFor,
  yearsToExperience,
  type StarterAnswers,
  type StarterGoal,
} from "@/lib/import/starter-routine";
import { frequencyGuidance } from "@/lib/plan/frequency";
import { TRAINING_YEARS_LABEL } from "@/lib/plan/experience";
import type { TrainingYears } from "@/lib/plan/types";
import { markOnboardingDone } from "@/lib/onboarding";
import { pageMeta } from "@/lib/route-meta";
import { mapRoute } from "@/lib/route/auto-map";
import { addDays, isoDay } from "@/lib/route/cadence";
import { currentCheckpoint } from "@/lib/route/status";
import type { Checkpoint } from "@/lib/route/types";
import { estimateRoutineMinutes } from "@/lib/routine-estimate";
import type { FocusMuscle, Pace } from "@/lib/routine-templates";
import { startRoutineSession } from "@/lib/start-session";
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
 * The person's first route. One question per screen, one decision per tap;
 * every answer feeds the profile, the routines or the route itself. The flow
 * ends on a mapped route and the first workout, never on an empty home.
 */
type Step =
  "name" | "goal" | "days" | "pace" | "focus" | "experience" | "plan" | "route" | "import";

const QUESTIONS: Step[] = ["name", "goal", "experience", "days", "pace", "focus", "plan", "route"];
/** Sunday first, matching `Date#getDay()`. */
const WEEK = [0, 1, 2, 3, 4, 5, 6] as const;
const WEEK_OPTIONS = [8, 12, 16] as const;
/** The first checkpoint is one finished workout, due within the first week. */
const ANCHOR_DAYS = 7;

interface MappedRoute {
  goalDate: string | null;
  checkpoints: Checkpoint[];
  routines: Routine[];
}

function OnboardingPage() {
  const t = useT();
  const { lang, locale } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const [step, setStepState] = useState<Step>("name");
  /** Which way the next screen slides in: forward along the route, or back. */
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const setStep = (next: Step) => {
    setDirection(QUESTIONS.indexOf(next) < QUESTIONS.indexOf(step) ? "back" : "forward");
    setStepState(next);
  };
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Partial<StarterAnswers>>({});
  /** Weeks to the goal; `null` is "not sure yet", `undefined` is unanswered. */
  const [weeks, setWeeks] = useState<number | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [route, setRoute] = useState<MappedRoute | null>(null);

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
      trainingYears: answers.trainingYears ?? DEFAULT_ANSWERS.trainingYears,
      pace: answers.pace ?? DEFAULT_ANSWERS.pace,
      focusMuscles: answers.focusMuscles?.length
        ? answers.focusMuscles
        : DEFAULT_ANSWERS.focusMuscles,
    }),
    [answers],
  );

  const plan = useMemo(() => {
    if (step !== "plan" || !exercisesQ.data?.length) return null;
    return buildStarterPlan(complete, exercisesQ.data, (source) => t(source));
  }, [step, complete, exercisesQ.data, t]);

  const questionIndex = QUESTIONS.indexOf(step);
  const progressPct = questionIndex >= 0 ? ((questionIndex + 1) / QUESTIONS.length) * 100 : 0;

  /** Everything the flow learned goes to the profile, including that it ran. */
  async function persistProfileAnswers(goalDate: string | null) {
    const profile = await getProfile();
    const trimmed = name.trim();
    const today = isoDay(new Date());
    await saveProfile({
      ...profile,
      nome: trimmed || profile.nome,
      objetivo: goalToObjetivo(complete.goal),
      // Reused by the weekly plan generator's training-frequency guideline.
      trainingGoal: goalToTrainingGoal(complete.goal),
      metaTreinosSemana: sortDays(complete.days).length,
      onboardingConcluidoEm: today,
      ...(goalDate
        ? {
            metaPrazo: goalDate,
            metaIniciadaEm: today,
            ...(profile.pesoInicialKg ? {} : { pesoInicialKg: profile.pesoKg }),
          }
        : {}),
    });
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  /** One finished workout in the first week: the first thing to tick off. */
  async function ensureAnchorCheckpoint() {
    const existing = await getCheckpoints();
    if (existing.some((cp) => cp.metric?.kind === "sessions" && cp.metric.value === 1)) return;
    await saveCheckpoint({
      title: t("First session logged"),
      description: t("One finished workout in your first week. That is the whole checkpoint."),
      targetDate: isoDay(addDays(new Date(), ANCHOR_DAYS)),
      orderIndex: 0,
      status: "upcoming",
      source: "ai_suggested",
      metric: { kind: "sessions", value: 1 },
    });
  }

  async function startHere() {
    if (!plan) return;
    setCreating(true);
    const goalDate = weeks ? isoDay(addDays(new Date(), weeks * 7)) : null;
    let saved: Routine[] = [];
    try {
      for (const routine of plan.routines) saved.push(await saveRoutine(routine));
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      await persistProfileAnswers(goalDate);
      markOnboardingDone();
    } catch (error) {
      console.error("Failed to save routines from onboarding:", error);
      toast.error(t("Could not create the routines. Try again."));
      setCreating(false);
      return;
    }

    // The route is mapped while the person watches: this is the one real wait.
    setStep("route");
    try {
      if (goalDate) await mapRoute(goalDate, lang);
    } catch (error) {
      console.error("Failed to map the route from onboarding:", error);
      toast.message(t("Could not map the route right now. You can map it later on the Route tab."));
    }
    try {
      await ensureAnchorCheckpoint();
    } catch (error) {
      console.error("Failed to add the first checkpoint:", error);
    }
    const checkpoints = await getCheckpoints().catch(() => [] as Checkpoint[]);
    await queryClient.invalidateQueries({ queryKey: ["route-checkpoints"] });
    saved = saved.length ? saved : plan.routines;
    setRoute({ goalDate, checkpoints, routines: saved });
    setCreating(false);
  }

  async function startFirstWorkout() {
    if (!route) return;
    const today = new Date().getDay();
    const routine =
      route.routines.find((r) => r.diasSemana?.includes(today)) ?? route.routines[0] ?? null;
    if (!routine) {
      navigate({ to: "/treino", replace: true });
      return;
    }
    setStarting(true);
    try {
      const session = await startRoutineSession(routine.id);
      navigate({ to: session ? "/sessao" : "/treino", replace: true });
    } catch (error) {
      console.error("Failed to start the first session:", error);
      navigate({ to: "/treino", replace: true });
    } finally {
      setStarting(false);
    }
  }

  async function buildMyself() {
    setCreating(true);
    try {
      await persistProfileAnswers(weeks ? isoDay(addDays(new Date(), weeks * 7)) : null);
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
  const canGoBack = step !== "name" && step !== "route";

  /** Evidence-based day range for this goal/experience — asked before "days" so it can cap the picker. */
  const frequencyRange = frequencyGuidance(
    goalToTrainingGoal(complete.goal),
    yearsToExperience(complete.trainingYears),
  );
  const dayCap = nearestCleanDayCount(frequencyRange.maxDays);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-8 pt-4">
      <div className="mb-4 flex h-11 items-center justify-between">
        {canGoBack ? (
          <button
            type="button"
            onClick={back}
            aria-label={t("Back")}
            className="tap-target -ml-2 grid size-11 place-items-center rounded-full text-muted-foreground"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <span />
        )}
        {/* The R draws itself as the route is answered: it is the progress bar. */}
        <RouteMarkProgress
          progress={questionIndex >= 0 ? progressPct : 100}
          className="size-12"
          label={t("Onboarding progress")}
        />
      </div>

      <div
        key={step}
        className={cn("flex flex-1 flex-col", direction === "back" ? "step-back" : "step-forward")}
      >
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
          <section className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Where do you want to get to?")}
            </h1>
            <div className="mt-6 flex flex-col gap-2" role="group">
              {goalOptions(t).map((o) => (
                <GoalOptionCard
                  key={o.value}
                  icon={o.icon}
                  label={o.label}
                  subtitle={o.subtitle}
                  selected={answers.goal === o.value}
                  onClick={() => setAnswers((a) => ({ ...a, goal: o.value }))}
                />
              ))}
            </div>

            <p className="label-caps mt-6">{t("How soon?")}</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group">
              {WEEK_OPTIONS.map((n) => (
                <Chip
                  key={n}
                  label={t("{weeks} weeks", { weeks: n })}
                  selected={weeks === n}
                  onClick={() => setWeeks(n)}
                />
              ))}
              <Chip
                label={t("Not sure yet")}
                selected={weeks === null}
                onClick={() => setWeeks(null)}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {weeks
                ? t("Goal on {date}. The route gets checkpoints along the way.", {
                    date: formatDate(isoDay(addDays(new Date(), weeks * 7))),
                  })
                : t("You can set a date later on the Route tab.")}
            </p>

            <Button
              className="tap-target mt-auto h-14 w-full gap-2"
              disabled={!answers.goal}
              onClick={() => setStep("experience")}
            >
              {t("Continue")} <ArrowRight className="size-4" />
            </Button>
            <SkipLink onSkip={() => setStep("experience")} />
          </section>
        ) : null}

        {step === "experience" ? (
          <section className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("How long have you been training?")}
            </h1>
            <div className="mt-6 grid gap-3" role="group">
              {(Object.keys(TRAINING_YEARS_LABEL) as TrainingYears[]).map((years) => (
                <OptionButton
                  key={years}
                  label={t(TRAINING_YEARS_LABEL[years])}
                  selected={answers.trainingYears === years}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, trainingYears: years }));
                    setStep("days");
                  }}
                />
              ))}
            </div>
            <div className="mt-auto">
              <SkipLink onSkip={() => setStep("days")} />
            </div>
          </section>
        ) : null}

        {step === "days" ? (
          <section className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Which days can you train?")}
            </h1>
            <div className="mt-6 grid grid-cols-7 gap-1.5" role="group">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const on = pickedDays.includes(day);
                const atCap = !on && pickedDays.length >= dayCap;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    aria-label={dayLabels[day]!.short}
                    disabled={atCap}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "tap-target aspect-square rounded-full border text-sm font-semibold transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : atCap
                          ? "border-border/50 bg-card/50 text-muted-foreground/50"
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
            <p className="mt-1 text-xs text-muted-foreground/80">
              {t(
                "{min}-{max} days is the evidence-based range for this goal and level — more doesn't train any better.",
                { min: frequencyRange.minDays, max: frequencyRange.maxDays },
              )}
            </p>
            <Button
              className="tap-target mt-auto h-14 w-full gap-2"
              disabled={!pickedDays.length}
              onClick={() => setStep("pace")}
            >
              {t("Continue")} <ArrowRight className="size-4" />
            </Button>
            <SkipLink onSkip={() => setStep("plan")} />
          </section>
        ) : null}

        {step === "pace" ? (
          <section className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("How do you like to train?")}
            </h1>
            <div className="mt-6 grid gap-3" role="group">
              {(
                [
                  {
                    value: "quick",
                    label: t("Short & quick"),
                    subtitle: t("Fewer exercises, minimal rest between them"),
                  },
                  {
                    value: "relaxed",
                    label: t("Thorough, take my time"),
                    subtitle: t("More exercises per session, more time in the gym"),
                  },
                ] as { value: Pace; label: string; subtitle: string }[]
              ).map((o) => (
                <OptionButton
                  key={o.value}
                  label={o.label}
                  subtitle={o.subtitle}
                  selected={answers.pace === o.value}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, pace: o.value }));
                    setStep("focus");
                  }}
                />
              ))}
            </div>
            <div className="mt-auto">
              <SkipLink onSkip={() => setStep("focus")} />
            </div>
          </section>
        ) : null}

        {step === "focus" ? (
          <section className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Any muscle you want extra focus on?")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("It gets an extra exercise in the sessions that already train it.")}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3" role="group">
              {
                // Muscle-group names are shown in English throughout the app
                // (see the exercise library) — never routed through t().
                (
                  [
                    { value: "chest", label: "Chest" },
                    { value: "back", label: "Back" },
                    { value: "legs", label: "Legs" },
                    { value: "shoulders", label: "Shoulders" },
                    { value: "arms", label: "Arms" },
                    { value: "core", label: "Core" },
                  ] as { value: FocusMuscle; label: string }[]
                ).map((o) => (
                  <OptionButton
                    key={o.value}
                    label={o.label}
                    selected={Boolean(answers.focusMuscles?.includes(o.value))}
                    onClick={() => {
                      setAnswers((a) => {
                        const current = a.focusMuscles ?? [];
                        return {
                          ...a,
                          focusMuscles: current.includes(o.value)
                            ? current.filter((m) => m !== o.value)
                            : [...current, o.value],
                        };
                      });
                    }}
                  />
                ))
              }
            </div>
            <Button
              className="tap-target mt-auto h-14 w-full gap-2"
              onClick={() => setStep("plan")}
            >
              {t("Continue")} <ArrowRight className="size-4" />
            </Button>
            <SkipLink onSkip={() => setStep("plan")} />
          </section>
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

        {step === "route" && !route ? (
          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <RouteMarkProgress
              progress={92}
              className="size-20 animate-pulse motion-reduce:animate-none"
            />
            <p className="mt-5 text-sm font-semibold">{t("Mapping your route…")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Checkpoints between today and your goal, built from your answers.")}
            </p>
          </section>
        ) : null}

        {step === "route" && route ? (
          <section className="flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              {route.goalDate ? t("Your route is mapped") : t("Your route starts today")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {route.goalDate
                ? t("{count} checkpoint(s) until {date}", {
                    count: route.checkpoints.length,
                    date: formatDate(route.goalDate),
                  })
                : t("You can set a date later on the Route tab.")}
            </p>

            <CheckpointList
              checkpoints={route.checkpoints}
              goalDate={route.goalDate}
              startLabel={name.trim() ? t("Start · {name}", { name: name.trim() }) : t("Start")}
            />

            <Button
              className="tap-target mt-auto h-14 w-full"
              disabled={starting}
              onClick={startFirstWorkout}
            >
              {starting ? t("Please wait…") : t("Start the first workout")}
            </Button>
            <Button
              variant="ghost"
              className="tap-target mt-2 w-full text-muted-foreground"
              onClick={() => navigate({ to: "/rota", replace: true })}
            >
              {t("See my route")}
            </Button>
          </section>
        ) : null}

        {step === "import" ? (
          <section>
            <h1 className="text-2xl font-semibold tracking-tight">{t("Import from Hevy")}</h1>
            <div className="mt-4">
              <HevyImportPanel
                onFinished={() => {
                  void persistProfileAnswers(null).catch(() => {});
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

function OptionButton({
  label,
  subtitle,
  selected,
  onClick,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "tap-target min-h-14 rounded-2xl border px-4 py-4 text-left transition-transform active:scale-[0.98]",
        selected ? "border-primary bg-primary/15" : "border-border bg-card",
      )}
    >
      <span className="block text-sm font-semibold">{label}</span>
      {subtitle ? (
        <span className="mt-0.5 block text-xs text-muted-foreground">{subtitle}</span>
      ) : null}
    </button>
  );
}

/**
 * Body-composition direction first, training style second — a plain 2x2 of
 * "Build muscle" / "Get stronger" read as near-synonyms to most people, so
 * each card names both the direction and why, in one line.
 */
function goalOptions(
  t: (source: string) => string,
): { value: StarterGoal; icon: LucideIcon; label: string; subtitle: string }[] {
  return [
    {
      value: "muscle-gain",
      icon: Dumbbell,
      label: t("Build muscle & gain weight"),
      subtitle: t("A calorie surplus, focused on maximum growth"),
    },
    {
      value: "muscle-maintain",
      icon: Scale,
      label: t("Build muscle, keep my weight"),
      subtitle: t("Around maintenance — lean growth, minimal fat gain"),
    },
    {
      value: "muscle-cut",
      icon: Shuffle,
      label: t("Build muscle & lose fat"),
      subtitle: t("A slight deficit with enough protein — works best early on"),
    },
    {
      value: "fat-loss",
      icon: Flame,
      label: t("Mainly lose fat"),
      subtitle: t("A clear deficit — keeping muscle is secondary"),
    },
    {
      value: "strength",
      icon: Zap,
      label: t("Get stronger, not necessarily bigger"),
      subtitle: t("Heavier weights, fewer reps, longer rest"),
    },
    {
      value: "comeback",
      icon: RotateCcw,
      label: t("Get back into training"),
      subtitle: t("Easing back in after time off"),
    },
  ];
}

function GoalOptionCard({
  icon: Icon,
  label,
  subtitle,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "tap-target flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-transform active:scale-[0.98]",
        selected ? "border-primary bg-primary/15" : "border-border bg-card",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          selected ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "tap-target rounded-full border px-4 text-xs font-semibold transition-colors",
        selected
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {label}
    </button>
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

/**
 * The route as a short list: start, the checkpoints in date order and the
 * goal. Compact on purpose, so the first-workout button stays in reach.
 */
function CheckpointList({
  checkpoints,
  goalDate,
  startLabel,
}: {
  checkpoints: Checkpoint[];
  goalDate: string | null;
  startLabel: string;
}) {
  const t = useT();
  const ordered = [...checkpoints].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const next = currentCheckpoint(checkpoints);
  return (
    <ol className="relative mt-5 space-y-3 pl-1">
      <span
        aria-hidden
        className="absolute bottom-3 left-[11px] top-3 border-l-2 border-dashed border-border"
      />
      <Node tone="done" title={startLabel} subtitle={t("Today")} />
      {ordered.map((cp) => (
        <Node
          key={cp.id}
          tone={cp.status === "achieved" ? "done" : cp.id === next?.id ? "next" : "upcoming"}
          title={cp.title}
          subtitle={formatDate(cp.targetDate)}
        />
      ))}
      {goalDate ? <Node tone="goal" title={t("Goal")} subtitle={formatDate(goalDate)} /> : null}
    </ol>
  );
}

function Node({
  tone,
  title,
  subtitle,
}: {
  tone: "done" | "next" | "upcoming" | "goal";
  title: string;
  subtitle: string;
}) {
  return (
    <li className="relative flex items-center gap-3">
      <span
        className={cn(
          "relative z-10 grid size-5 shrink-0 place-items-center rounded-full border-2 bg-background",
          tone === "done" && "border-primary bg-primary text-primary-foreground",
          tone === "next" && "border-primary ring-4 ring-primary/20",
          tone === "upcoming" && "border-border",
          tone === "goal" && "border-primary bg-primary/15 text-primary",
        )}
      >
        {tone === "done" ? <Check className="size-3" /> : null}
        {tone === "goal" ? <Flag className="size-2.5" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground tabular-nums">{subtitle}</span>
      </span>
    </li>
  );
}
