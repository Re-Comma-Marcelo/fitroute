import { pageMeta } from "@/lib/route-meta";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronRight, Dumbbell, Search, Timer, Trophy } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/CountUp";
import { QueryError } from "@/components/QueryError";
import { CoachChatButton } from "@/components/CoachChatSheet";
import { CoachNotesCard } from "@/components/CoachNotesCard";
import { WeeklyCheckInCard } from "@/components/WeeklyCheckInCard";
import { CrossTrainingSheet } from "@/components/CrossTrainingSheet";

import { useT } from "@/lib/i18n";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { getRoutines } from "@/lib/data/routines";
import { getWorkoutLog } from "@/lib/data/workouts";
import { getTargets, getWeekPlan, isoDate, totalsFor } from "@/lib/data/nutrition";
import { onboardingDone } from "@/lib/onboarding";
import { loadActiveSession, sessionLabel } from "@/lib/session-state";
import { startRoutineSession } from "@/lib/start-session";
import { estimateRoutineMinutes } from "@/lib/routine-estimate";
import { formatFullDate, formatKg, formatNumber, relativeDays } from "@/lib/format";
import type { Routine } from "@/lib/types";
import {
  latestPR,
  nextRoutine,
  sessionsThisWeek,
  weekStreak,
  weeklyVolume,
  type PRInfo,
} from "@/lib/home-metrics";
import { RoutePreviewCard } from "@/components/RoutePreviewCard";
import { getCheckpoints } from "@/lib/data/route";
import { currentCheckpoint } from "@/lib/route/status";
import { routePace } from "@/lib/route/pace";
import type { Checkpoint } from "@/lib/route/types";

import { cn } from "@/lib/utils";

const QUICKSTART_KEY = "iron-logger-quickstart-done";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: Inicio,
  head: () => ({
    meta: pageMeta({
      title: "Home",
      description: "Your weekly volume, consistency heatmap and latest personal record.",
      twitterCard: "summary",
    }),
  }),
});

export default function Inicio() {
  const t = useT();
  const navigate = useNavigate();
  const [active, setActive] = useState(loadActiveSession());

  useEffect(() => {
    const id = setInterval(() => setActive(loadActiveSession()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = new Date().getHours();
  const greeting = h < 12 ? t("Good morning") : h < 18 ? t("Good afternoon") : t("Good evening");

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const routinesQ = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const logQ = useQuery({ queryKey: ["workoutLog"], queryFn: getWorkoutLog });
  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const targetsQ = useQuery({ queryKey: ["nutritionTargets"], queryFn: getTargets });
  const planQ = useQuery({ queryKey: ["weekPlan"], queryFn: getWeekPlan });
  const checkpointsQ = useQuery({ queryKey: ["route-checkpoints"], queryFn: getCheckpoints });

  const isLoading = profileQ.isLoading || routinesQ.isLoading || logQ.isLoading;
  /** A failed fetch must read as an error, never as "you have no data yet". */
  const loadFailed = profileQ.isError || routinesQ.isError || logQ.isError;

  const workouts = useMemo(() => logQ.data?.workouts ?? [], [logQ.data]);
  const sets = useMemo(() => logQ.data?.sets ?? [], [logQ.data]);
  const routines = routinesQ.data ?? [];

  const volume = useMemo(() => weeklyVolume(workouts, sets), [workouts, sets]);
  const sessions = useMemo(() => sessionsThisWeek(workouts), [workouts]);
  const streak = useMemo(() => weekStreak(workouts), [workouts]);
  const pr = useMemo(() => latestPR(workouts, sets), [workouts, sets]);
  const next = useMemo(() => nextRoutine(routines, workouts), [routines, workouts]);

  const hasData = workouts.some((w) => w.finalizadoEm);
  const prName =
    (pr && exercisesQ.data?.find((e) => e.id === pr.exerciseId)?.nome) || t("Latest PR");
  const weekGoal = Math.max(1, profileQ.data?.metaTreinosSemana ?? 4);

  // First-run: send brand-new accounts through onboarding once.
  useEffect(() => {
    if (!logQ.isSuccess || hasData || onboardingDone()) return;
    navigate({ to: "/onboarding", replace: true });
  }, [logQ.isSuccess, hasData, navigate]);

  const today = isoDate(new Date());
  const todayTotals = useMemo(() => totalsFor(planQ.data?.[today]), [planQ.data, today]);
  const kcalToday = todayTotals.kcal;
  const proteinToday = todayTotals.proteinG;
  const kcalTarget = targetsQ.data?.kcal ?? 0;
  const proteinTarget = targetsQ.data?.proteinG ?? 0;

  async function primaryAction() {
    if (active) {
      navigate({ to: "/sessao" });
      return;
    }
    if (next) {
      await startRoutineSession(next.id);
      navigate({ to: "/sessao" });
      return;
    }
    navigate({ to: "/rotina/$id", params: { id: "nova" } });
  }

  return (
    <AppShell hideHeader title={t("Home")}>
      <div className="route-enter space-y-9 pb-28">
        <header className="flex items-start justify-between gap-3 pt-2">
          <div className="min-w-0">
            <h1 className="font-sans text-2xl font-normal normal-case tracking-normal">
              <span>{greeting}, </span>
              {isLoading ? (
                <Skeleton className="inline-block h-6 w-24 align-middle" />
              ) : (
                <span className="font-bold">
                  {profileQ.data?.nome.split(" ")[0] ?? t("Athlete")}
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatFullDate(new Date())}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/buscar"
              aria-label={t("Search")}
              className="tap-target flex size-11 items-center justify-center rounded-sm bg-surface-3 text-muted-foreground"
            >
              <Search className="size-5" />
            </Link>
            <CoachChatButton />
          </div>
        </header>

        {loadFailed ? (
          <QueryError
            message={t("Could not load your dashboard.")}
            onRetry={() => {
              void profileQ.refetch();
              void routinesQ.refetch();
              void logQ.refetch();
            }}
          />
        ) : (
          <>
            <WeeklyCheckInCard />

            {/* One line, every day: am I still on my route? */}
            <RouteStatusLine checkpoints={checkpointsQ.data ?? []} />

            <TodayCard
              loading={isLoading}
              activeLabel={active ? sessionLabel(active) : null}
              routine={next}
              sessions={sessions}
              goal={weekGoal}
              onStart={primaryAction}
            />

            <StatsRow
              loading={isLoading}
              hasData={hasData}
              volume={volume}
              sessions={sessions}
              streak={streak}
            />

            {/* The route replaces the old consistency grid: where you are on
 the way to your goal, not just which days you showed up. */}
            <RoutePreviewCard
              checkpoints={checkpointsQ.data ?? []}
              current={currentCheckpoint(checkpointsQ.data ?? [])}
              goalDate={profileQ.data?.metaPrazo ?? null}
              loading={checkpointsQ.isLoading}
            />

            <PRStrip loading={isLoading} pr={pr} name={prName} />

            {/* Adaptive coach: drops, check-ins and recovery notes, plus the
 cross-training log that explains them. */}
            <CoachNotesCard />

            <DietCard
              kcal={kcalToday}
              target={kcalTarget}
              protein={proteinToday}
              proteinTarget={proteinTarget}
            />

            <CrossTrainingSheet />

            {!isLoading && (
              <QuickStartChecklist
                hasRoutine={routines.length > 0}
                hasWorkout={hasData}
                hasPR={!!pr}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ---------- today's session + weekly goal ---------- */

/** The daily verdict on your route, in one tappable line. */
function RouteStatusLine({ checkpoints }: { checkpoints: Checkpoint[] }) {
  const t = useT();
  const pace = routePace(checkpoints);
  if (pace.state === "no_route") return null;

  const tone =
    pace.state === "behind"
      ? "text-oxide"
      : pace.state === "ahead"
        ? "text-foreground"
        : "text-muted-foreground";
  const label =
    pace.state === "behind"
      ? t("Drifting off your route — {days} day(s) behind", { days: pace.daysBehind })
      : pace.state === "ahead"
        ? t("Ahead of your route")
        : t("On your route");

  return (
    <Link
      to="/rota"
      className="tap-target flex items-center justify-between gap-2 border-b border-stone-line px-0 py-3"
    >
      <span className="min-w-0">
        <span className={cn("block text-sm font-semibold", tone)}>{label}</span>
        {pace.next ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {t("Next: {title}", { title: pace.next.title })}
          </span>
        ) : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function TodayCard({
  loading,
  activeLabel,
  routine,
  sessions,
  goal,
  onStart,
}: {
  loading: boolean;
  activeLabel: string | null;
  routine: Routine | null;
  sessions: number;
  goal: number;
  onStart: () => void;
}) {
  const t = useT();
  if (loading) return <Skeleton className="h-44 w-full rounded-lg" />;

  const minutes = routine ? estimateRoutineMinutes(routine) : 0;
  const done = Math.min(sessions, goal);

  return (
    <Card className="rounded-lg border-0 bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">{activeLabel ? t("In progress") : t("Today's session")}</p>
          <p className="mt-1 truncate text-lg font-semibold">
            {activeLabel ?? routine?.nome ?? t("Start a workout")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {routine
              ? `${t("{count} exercises", { count: routine.exercicios.length })} · ${t("~{min} min", { min: minutes })}`
              : t("Pick a routine and start logging.")}
          </p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-sm border border-stone-line text-muted-foreground">
          {activeLabel ? <Timer className="size-5" /> : <Dumbbell className="size-5" />}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="label-caps">{t("Weekly goal")}</p>
          <p className="text-xs font-semibold tabular-nums text-muted-foreground">
            {t("{sessions}/{target} sessions", { sessions, target: goal })}
          </p>
        </div>
        <div
          role="img"
          aria-label={t("{sessions}/{target} sessions", { sessions, target: goal })}
          className="mt-2 flex gap-1"
        >
          {Array.from({ length: goal }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-sm", i < done ? "bg-ink" : "bg-stone-line/50")}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={onStart}
        className="mt-5 h-14 w-full justify-between px-5 font-sans text-base font-semibold normal-case tracking-normal"
      >
        <span>{t("Begin training")}</span>
        <ArrowRight className="size-5" />
      </Button>
    </Card>
  );
}

/* ---------- three numbers in one row ---------- */

function StatsRow({
  loading,
  hasData,
  volume,
  sessions,
  streak,
}: {
  loading: boolean;
  hasData: boolean;
  volume: ReturnType<typeof weeklyVolume>;
  sessions: number;
  streak: number;
}) {
  const t = useT();
  if (loading) return <Skeleton className="h-24 w-full rounded-lg" />;

  const pct = volume.deltaPct;
  const trend = volume.isRecord
    ? t("New weekly record")
    : pct === null
      ? t("First week logged")
      : t("{pct}% vs last week", { pct: `${pct >= 0 ? "+" : ""}${formatNumber(pct, 0)}` });

  return (
    <section>
      <div className="grid grid-cols-3">
        <div className="min-w-0 pr-2">
          <p className="label-caps text-xs tracking-[0.22em]">{t("Volume")}</p>
          <p className="mt-2 text-xl font-semibold tracking-normal tabular-nums">
            {hasData ? (
              <>
                <CountUp value={volume.current} format={(n) => formatNumber(Math.round(n))} />
                <span className="ml-0.5 text-xs font-medium text-muted-foreground">kg</span>
              </>
            ) : (
              <span className="text-muted-foreground/40">0</span>
            )}
          </p>
        </div>
        <div className="min-w-0 border-l border-stone-line px-2">
          <p className="label-caps text-xs tracking-[0.22em]">{t("Workouts")}</p>
          <p className="mt-2 text-xl font-semibold tracking-normal tabular-nums">{sessions}</p>
        </div>
        <div className="min-w-0 border-l border-stone-line pl-2">
          <p className="label-caps text-xs tracking-[0.22em]">{t("Streak")}</p>
          <p className="mt-2 text-xl font-semibold tracking-normal tabular-nums">
            {streak}
            <span className="ml-0.5 text-xs font-medium text-muted-foreground">{t("wks")}</span>
          </p>
        </div>
      </div>
      <p
        className={cn(
          "mt-2 text-xs font-semibold",
          volume.isRecord || (pct !== null && pct >= 0)
            ? "text-foreground"
            : "text-muted-foreground",
        )}
      >
        {hasData ? trend : t("Your first recorded workout sets this value.")}
      </p>
    </section>
  );
}

/* ---------- latest PR ---------- */

function PRStrip({ loading, pr, name }: { loading: boolean; pr: PRInfo | null; name: string }) {
  const t = useT();
  if (loading) return <Skeleton className="h-14 w-full rounded-lg" />;
  if (!pr) return null;

  return (
    <Link
      to="/rota/progresso"
      className="tap-target flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-stone-line text-muted-foreground">
        <Trophy className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="block text-xs text-muted-foreground">
          {t("Latest PR")}
          {pr.date ? ` · ${relativeDays(pr.date)}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {formatKg(pr.pesoKg)}
        <span className="text-muted-foreground"> × {pr.reps}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/* ---------- diet ---------- */

function DietCard({
  kcal,
  target,
  protein,
  proteinTarget,
}: {
  kcal: number;
  target: number;
  protein: number;
  proteinTarget: number;
}) {
  const t = useT();
  const pct = target > 0 ? Math.max(0, Math.min(100, (kcal / target) * 100)) : 0;
  const pPct = proteinTarget > 0 ? Math.max(0, Math.min(100, (protein / proteinTarget) * 100)) : 0;
  return (
    <Card className="rounded-lg border-0 bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label-caps">{t("Today's plan")}</p>
        <Link to="/dieta" className="text-xs font-semibold text-primary underline-offset-2">
          {t("See diet")}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-base font-semibold tabular-nums text-foreground">
            {formatNumber(Math.round(kcal))}
            <span className="ml-1 text-xs font-semibold text-muted-foreground">
              {t("of {target} kcal", { target: formatNumber(Math.round(target)) })}
            </span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-surface-3">
            <div className="h-full rounded-sm bg-ink" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {proteinTarget > 0 ? (
          <div>
            <p className="text-base font-semibold tabular-nums text-foreground">
              {formatNumber(Math.round(protein))}g
              <span className="ml-1 text-xs font-semibold text-muted-foreground">
                {t("of {target}g protein", { target: formatNumber(Math.round(proteinTarget)) })}
              </span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-surface-3">
              <div className="h-full rounded-sm bg-ink/70" style={{ width: `${pPct}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------- quick start checklist ---------- */

function QuickStartChecklist({
  hasRoutine,
  hasWorkout,
  hasPR,
}: {
  hasRoutine: boolean;
  hasWorkout: boolean;
  hasPR: boolean;
}) {
  const t = useT();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(QUICKSTART_KEY) === "1");
  }, []);

  const items = [
    { label: t("Account created"), done: true },
    { label: t("Create a routine"), done: hasRoutine },
    { label: t("First workout"), done: hasWorkout },
    { label: t("First PR"), done: hasPR },
  ];
  const complete = items.every((i) => i.done);

  useEffect(() => {
    if (complete) {
      localStorage.setItem(QUICKSTART_KEY, "1");
      setDismissed(true);
    }
  }, [complete]);

  if (dismissed || complete) return null;

  return (
    <Card className="rounded-lg border-border bg-card p-4">
      <p className="label-caps">{t("Quick start")}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-sm border",
                item.done ? "border-ink bg-transparent text-ink" : "border-border",
              )}
            >
              {item.done && <Check className="size-3" />}
            </span>
            <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to="/treino"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
      >
        {t("Routines")} <ChevronRight className="size-3.5" />
      </Link>
    </Card>
  );
}
