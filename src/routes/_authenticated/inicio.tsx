import { pageMeta } from "@/lib/route-meta";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Dumbbell, Search, Timer, Trophy } from "lucide-react";

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
  heatmap,
  latestPR,
  nextRoutine,
  sessionsThisWeek,
  trainedDays,
  weekStreak,
  weeklyVolume,
  type HeatCell,
  type PRInfo,
} from "@/lib/home-metrics";
import { cn } from "@/lib/utils";

const QUICKSTART_KEY = "iron-logger-quickstart-done";
const HEATMAP_WEEKS = 8;

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

  const isLoading = profileQ.isLoading || routinesQ.isLoading || logQ.isLoading;
  /** A failed fetch must read as an error, never as "you have no data yet". */
  const loadFailed = profileQ.isError || routinesQ.isError || logQ.isError;

  const workouts = useMemo(() => logQ.data?.workouts ?? [], [logQ.data]);
  const sets = useMemo(() => logQ.data?.sets ?? [], [logQ.data]);
  const routines = routinesQ.data ?? [];

  const volume = useMemo(() => weeklyVolume(workouts, sets), [workouts, sets]);
  const cells = useMemo(() => heatmap(workouts, HEATMAP_WEEKS), [workouts]);
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
      <div className="route-enter space-y-6 pb-28">
        <header className="flex items-start justify-between gap-3 pt-2">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {greeting},{" "}
              {isLoading ? (
                <Skeleton className="inline-block h-6 w-24 align-middle" />
              ) : (
                (profileQ.data?.nome.split(" ")[0] ?? t("Athlete"))
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatFullDate(new Date())}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/buscar"
              aria-label={t("Search")}
              className="tap-target flex size-11 items-center justify-center rounded-full bg-surface-3 text-muted-foreground"
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

            <HeatmapSection loading={isLoading} hasData={hasData} cells={cells} />

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
  if (loading) return <Skeleton className="h-44 w-full rounded-2xl" />;

  const minutes = routine ? estimateRoutineMinutes(routine) : 0;
  const done = Math.min(sessions, goal);

  return (
    <Card className="rounded-2xl border-border bg-surface-1 p-4 shadow-elegant">
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
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-train/15 text-train">
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
              className={cn("h-1.5 flex-1 rounded-full", i < done ? "bg-train" : "bg-surface-3")}
            />
          ))}
        </div>
      </div>

      <Button onClick={onStart} className="mt-4 h-14 w-full text-base font-semibold">
        {activeLabel ? (
          <>
            <Timer className="mr-2 size-5" /> {t("Resume workout")}
          </>
        ) : routine ? (
          <>
            <Dumbbell className="mr-2 size-5" /> {t("Start {routine}", { routine: routine.nome })}
          </>
        ) : (
          <>
            <Dumbbell className="mr-2 size-5" /> {t("Create my routine")}
          </>
        )}
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
  if (loading) return <Skeleton className="h-24 w-full rounded-2xl" />;

  const pct = volume.deltaPct;
  const trend = volume.isRecord
    ? t("New weekly record")
    : pct === null
      ? t("First week logged")
      : t("{pct}% vs last week", { pct: `${pct >= 0 ? "+" : ""}${formatNumber(pct, 0)}` });

  return (
    <section>
      <div className="grid grid-cols-3 gap-2">
        <Card className="rounded-2xl border-border bg-card p-3">
          <p className="label-caps">{t("Volume")}</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">
            {hasData ? (
              <>
                <CountUp value={volume.current} format={(n) => formatNumber(Math.round(n))} />
                <span className="ml-0.5 text-xs font-semibold text-muted-foreground">kg</span>
              </>
            ) : (
              <span className="text-muted-foreground/40">0</span>
            )}
          </p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-3">
          <p className="label-caps">{t("Workouts")}</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">{sessions}</p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-3">
          <p className="label-caps">{t("Streak")}</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">
            {streak}
            <span className="ml-0.5 text-xs font-semibold text-muted-foreground">{t("wks")}</span>
          </p>
        </Card>
      </div>
      <p
        className={cn(
          "mt-2 text-xs font-semibold",
          volume.isRecord
            ? "text-success"
            : pct !== null && pct >= 0
              ? "text-train"
              : "text-muted-foreground",
        )}
      >
        {hasData ? trend : t("Your first workout lights this number up.")}
      </p>
    </section>
  );
}

/* ---------- consistency heatmap ---------- */

function HeatmapSection({
  loading,
  hasData,
  cells,
}: {
  loading: boolean;
  hasData: boolean;
  cells: HeatCell[];
}) {
  const t = useT();
  if (loading) return <Skeleton className="h-24 w-full rounded-2xl" />;

  const total = cells.length;
  const days = trainedDays(cells);
  const ghostIdx = new Set([total - 12, total - 9, total - 5, total - 2]);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <p className="label-caps">{t("Consistency")}</p>
        <p className="text-xs text-muted-foreground">
          {hasData
            ? t("Trained on {days} of the last {total} days", { days, total })
            : t("Your first square shows up today.")}
        </p>
      </div>
      <div
        role="img"
        aria-label={t("Trained on {days} of the last {total} days", { days, total })}
        className="mt-2 grid grid-flow-col grid-rows-7 gap-1"
      >
        {cells.map((cell, i) => (
          <div
            key={cell.date}
            className={cn(
              "aspect-square rounded-[3px]",
              cell.level === 2 ? "bg-train" : cell.level === 1 ? "bg-train-dim" : "bg-surface-3",
              !hasData && ghostIdx.has(i) && "bg-train/30",
              cell.isToday && "ring-1 ring-inset ring-foreground/40",
            )}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------- latest PR ---------- */

function PRStrip({ loading, pr, name }: { loading: boolean; pr: PRInfo | null; name: string }) {
  const t = useT();
  if (loading) return <Skeleton className="h-14 w-full rounded-2xl" />;
  if (!pr) return null;

  return (
    <Link
      to="/progresso"
      className="tap-target flex items-center gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-3"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-bg text-success">
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
    <Card className="rounded-2xl border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label-caps">{t("Today's plan")}</p>
        <Link to="/dieta" className="text-xs font-semibold text-primary underline-offset-2">
          {t("See diet")}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-base font-semibold tabular-nums text-diet">
            {formatNumber(Math.round(kcal))}
            <span className="ml-1 text-xs font-semibold text-muted-foreground">
              {t("of {target} kcal", { target: formatNumber(Math.round(target)) })}
            </span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-diet" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {proteinTarget > 0 ? (
          <div>
            <p className="text-base font-semibold tabular-nums text-diet">
              {formatNumber(Math.round(protein))}g
              <span className="ml-1 text-xs font-semibold text-muted-foreground">
                {t("of {target}g protein", { target: formatNumber(Math.round(proteinTarget)) })}
              </span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-diet/70" style={{ width: `${pPct}%` }} />
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
    <Card className="rounded-2xl border-border bg-card p-4">
      <p className="label-caps">{t("Quick start")}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border",
                item.done ? "border-success bg-success-bg text-success" : "border-border",
              )}
            >
              {item.done && <Check className="size-3" />}
            </span>
            <span className={item.done ? "text-success" : "text-muted-foreground"}>
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
