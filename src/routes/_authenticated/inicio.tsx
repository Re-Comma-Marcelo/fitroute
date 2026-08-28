import { pageMeta } from "@/lib/route-meta";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Dumbbell, Timer, Trophy } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/CountUp";
import { CoachChatButton } from "@/components/CoachChatSheet";
import { useT } from "@/lib/i18n";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { getRoutines } from "@/lib/data/routines";
import { getWorkoutLog } from "@/lib/data/workouts";
import { getTargets, getWeekPlan, isoDate, totalsFor } from "@/lib/data/nutrition";
import { onboardingDone } from "@/lib/onboarding";
import { loadActiveSession, sessionLabel } from "@/lib/session-state";
import { startRoutineSession } from "@/lib/start-session";
import { formatFullDate, formatKg, formatNumber, relativeDays } from "@/lib/format";
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

  // First-run: send brand-new accounts through onboarding once.
  useEffect(() => {
    if (!logQ.isSuccess || hasData || onboardingDone()) return;
    navigate({ to: "/onboarding" });
  }, [logQ.isSuccess, hasData, navigate]);


  const today = isoDate(new Date());
  const kcalToday = useMemo(() => totalsFor(planQ.data?.[today]).kcal, [planQ.data, today]);
  const kcalTarget = targetsQ.data?.kcal ?? 0;

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
      <div className="route-enter space-y-7 pb-28">
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
          <CoachChatButton />
        </header>

        <VolumeHero loading={isLoading} hasData={hasData} volume={volume} />

        <HeatmapSection
          loading={isLoading}
          hasData={hasData}
          cells={cells}
          sessions={sessions}
          streak={streak}
        />

        <PRCard loading={isLoading} pr={pr} name={prName} />

        <div className="space-y-2">
          <Button
            onClick={primaryAction}
            disabled={isLoading}
            className="h-14 w-full text-base font-semibold"
          >
            {active ? (
              <>
                <Timer className="mr-2 size-5" /> {t("Resume workout")}
              </>
            ) : next ? (
              <>
                <Dumbbell className="mr-2 size-5" /> {t("Start {routine}", { routine: next.nome })}
              </>
            ) : (
              <>
                <Dumbbell className="mr-2 size-5" /> {t("Create my routine")}
              </>
            )}
          </Button>
          {active && (
            <p className="text-center text-xs text-muted-foreground">{sessionLabel(active)}</p>
          )}
        </div>

        <DietCard kcal={kcalToday} target={kcalTarget} />

        {!isLoading && (
          <QuickStartChecklist
            hasRoutine={routines.length > 0}
            hasWorkout={hasData}
            hasPR={!!pr}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ---------- hero volume ---------- */

function VolumeHero({
  loading,
  hasData,
  volume,
}: {
  loading: boolean;
  hasData: boolean;
  volume: ReturnType<typeof weeklyVolume>;
}) {
  const t = useT();
  if (loading) return <Skeleton className="h-24 w-full rounded-2xl" />;

  if (!hasData) {
    return (
      <section>
        <p className="label-caps">{t("This week's volume")}</p>
        <p className="num-hero mt-1 text-muted-foreground/30" aria-label="0 kg">
          0 kg
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Your first workout lights this number up.")}
        </p>
      </section>
    );
  }

  const pct = volume.deltaPct;
  const label = `${formatNumber(Math.round(volume.current))} kg`;

  return (
    <section>
      <p className="label-caps">{t("This week's volume")}</p>
      <p className="num-hero mt-1" aria-label={label}>
        <span aria-hidden="true">
          <CountUp value={volume.current} format={(n) => formatNumber(Math.round(n))} />{" "}
          <span className="text-xl font-semibold text-muted-foreground">kg</span>
        </span>
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          volume.isRecord
            ? "text-success"
            : pct === null
              ? "text-muted-foreground"
              : pct >= 0
                ? "text-train"
                : "text-muted-foreground",
        )}
      >
        {volume.isRecord
          ? t("New weekly record")
          : pct === null
            ? t("First week logged")
            : t("{pct}% vs last week", {
                pct: `${pct >= 0 ? "+" : ""}${formatNumber(pct, 0)}`,
              })}
      </p>
    </section>
  );
}

/* ---------- consistency heatmap ---------- */

function HeatmapSection({
  loading,
  hasData,
  cells,
  sessions,
  streak,
}: {
  loading: boolean;
  hasData: boolean;
  cells: HeatCell[];
  sessions: number;
  streak: number;
}) {
  const t = useT();
  if (loading) return <Skeleton className="h-28 w-full rounded-2xl" />;

  const total = cells.length;
  const days = trainedDays(cells);
  const ghostIdx = new Set([total - 12, total - 9, total - 5, total - 2]);

  return (
    <section>
      <p className="label-caps">{t("Consistency")}</p>
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
              cell.level === 2
                ? "bg-train"
                : cell.level === 1
                  ? "bg-train-dim"
                  : "bg-surface-3",
              !hasData && ghostIdx.has(i) && "bg-train/30",
              cell.isToday && "ring-1 ring-inset ring-foreground/40",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {hasData
          ? t("{sessions} workouts this week · {weeks} week streak", { sessions, weeks: streak })
          : t("Your first square shows up today.")}
      </p>
    </section>
  );
}

/* ---------- latest PR ---------- */

function PRCard({
  loading,
  pr,
  name,
}: {
  loading: boolean;
  pr: PRInfo | null;
  name: string;
}) {
  const t = useT();
  if (loading) return <Skeleton className="h-24 w-full rounded-2xl" />;

  if (!pr) {
    return (
      <Card className="rounded-2xl border-border bg-surface-1 p-4">
        <p className="label-caps">{t("Latest PR")}</p>
        <div className="mt-3 h-4 w-2/3 rounded-full bg-surface-3" />
        <div className="mt-2 h-4 w-1/3 rounded-full bg-surface-3" />
        <p className="mt-3 text-sm text-muted-foreground">
          {t("Complete a workout to log your first record.")}
        </p>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-surface-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="label-caps">{t("Latest PR")}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success">
          <Trophy className="size-3" /> PR
        </span>
      </div>
      <p className="mt-2 truncate font-semibold">{name}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="num-big">
          {formatKg(pr.pesoKg)}{" "}
          <span className="text-sm font-semibold text-muted-foreground">
            × {pr.reps}
          </span>
        </p>
        {pr.date && (
          <p className="text-xs text-muted-foreground">{relativeDays(pr.date)}</p>
        )}
      </div>
    </Card>
  );
}

/* ---------- diet ---------- */

function DietCard({ kcal, target }: { kcal: number; target: number }) {
  const t = useT();
  const pct = target > 0 ? Math.max(0, Math.min(100, (kcal / target) * 100)) : 0;
  return (
    <Card className="rounded-2xl border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label-caps">{t("Today's plan")}</p>
        <Link to="/dieta" className="text-xs font-semibold text-primary underline-offset-2">
          {t("See diet")}
        </Link>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-diet">
        {formatNumber(Math.round(kcal))}{" "}
        <span className="text-sm font-semibold text-muted-foreground">
          {t("of {target} kcal", { target: formatNumber(Math.round(target)) })}
        </span>
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-diet" style={{ width: `${pct}%` }} />
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
