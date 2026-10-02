import { pageMeta } from "@/lib/route-meta";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronRight, Search, CalendarDays } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QueryError } from "@/components/QueryError";
import { WeeklyCheckInCard } from "@/components/WeeklyCheckInCard";
import { WeekMenuPrompt } from "@/components/diet/WeekMenuPrompt";
import { CrossTrainingSheet } from "@/components/CrossTrainingSheet";
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
import { TodayWeightCard } from "@/components/forja/TodayWeightCard";
import { CoachNotesCard, useInactivityCheckIn } from "@/components/CoachNotesCard";
import { HeroPage } from "@/components/forja/HeroPage";
import { GlassCard, MonoLabel } from "@/components/forja/GlassCard";
import { StatStrip } from "@/components/forja/StatStrip";
import { CoachCard } from "@/components/forja/CoachCard";
import { RouteLine } from "@/components/forja/RouteLine";
import { Metric } from "@/components/forja/Metric";
import { heroImages } from "@/config/heroImages";

import { useT } from "@/lib/i18n";
import { getProfile } from "@/lib/data/profile";
import { getRoutines } from "@/lib/data/routines";
import { getWorkoutLog } from "@/lib/data/workouts";
import { getExercises } from "@/lib/data/exercises";
import { getCoachNotes } from "@/lib/data/coach-notes";
import { getCoachingEvents } from "@/lib/data/coaching";
import { getTargets, isoDate } from "@/lib/data/nutrition";
import { getDayNutrition } from "@/lib/data/diet-entries";
import { onboardingDone } from "@/lib/onboarding";
import { loadActiveSession, sessionLabel } from "@/lib/session-state";
import { startRoutineSession } from "@/lib/start-session";
import { estimateRoutineMinutes } from "@/lib/routine-estimate";
import {
  formatDurationShort,
  formatKg,
  formatNumber,
  formatTopDate,
  formatWeekdayLong,
  weightUnitLabel,
} from "@/lib/format";
import {
  isoDay,
  latestPR,
  nextRoutine,
  sessionsThisWeek,
  weekStreak,
  weeklyVolume,
} from "@/lib/home-metrics";
import { checkInDue, checkInFor, hydrateCheckIns, planWeekKey } from "@/lib/coach/weekly-checkin";
import { getCheckpoints } from "@/lib/data/route";
import { currentCheckpoint } from "@/lib/route/status";
import { routePace } from "@/lib/route/pace";
import type { Checkpoint } from "@/lib/route/types";
import type { CoachingEvent } from "@/lib/types";

import { cn } from "@/lib/utils";

const QUICKSTART_KEY = "iron-logger-quickstart-done";
/** How long a performance-drop message stays on the Home coach card. */
const DROP_MESSAGE_DAYS = 3;
const PR_LABEL_DAYS = 7;

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

/** First sentence only — the rest lives behind "See why" or in the notes. */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^[\s\S]*?[.?!](?=\s|$)/);
  return (match ? match[0] : trimmed).replace(/!+/g, ".");
}

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

type SheetKey = "notes" | "checkin" | "calendar" | null;

export default function Inicio() {
  const t = useT();
  const navigate = useNavigate();
  const [active, setActive] = useState(loadActiveSession());
  const [sheet, setSheet] = useState<SheetKey>(null);

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
  const today = isoDate(new Date());
  const dayFoodQ = useQuery({
    queryKey: ["dayNutrition", today],
    queryFn: () => getDayNutrition(today),
  });
  const checkpointsQ = useQuery({ queryKey: ["route-checkpoints"], queryFn: getCheckpoints });
  const notesQ = useQuery({ queryKey: ["coach-notes"], queryFn: getCoachNotes });
  const eventsQ = useQuery({ queryKey: ["coaching-events"], queryFn: getCoachingEvents });
  // Pulls in check-ins saved on another device before deciding if one is due.
  const checkInsQ = useQuery({ queryKey: ["weekly-checkins"], queryFn: hydrateCheckIns });
  const inactivity = useInactivityCheckIn();

  const isLoading = profileQ.isLoading || routinesQ.isLoading || logQ.isLoading;
  /** A failed fetch must read as an error, never as "you have no data yet". */
  const loadFailed = profileQ.isError || routinesQ.isError || logQ.isError;

  const workouts = useMemo(() => logQ.data?.workouts ?? [], [logQ.data]);
  const sets = useMemo(() => logQ.data?.sets ?? [], [logQ.data]);
  const routines = useMemo(() => routinesQ.data ?? [], [routinesQ.data]);
  const exercises = useMemo(() => exercisesQ.data ?? [], [exercisesQ.data]);
  const checkpoints = useMemo(() => checkpointsQ.data ?? [], [checkpointsQ.data]);

  const volume = useMemo(() => weeklyVolume(workouts, sets), [workouts, sets]);
  const sessions = useMemo(() => sessionsThisWeek(workouts), [workouts]);
  const streak = useMemo(() => weekStreak(workouts), [workouts]);
  const next = useMemo(() => nextRoutine(routines, workouts), [routines, workouts]);
  const pr = useMemo(() => latestPR(workouts, sets), [workouts, sets]);

  const hasData = workouts.some((w) => w.finalizadoEm);
  const doneToday = useMemo(() => {
    const todayKey = isoDay(new Date());
    return workouts.some((w) => w.finalizadoEm && isoDay(new Date(w.iniciadoEm)) === todayKey);
  }, [workouts]);
  const weekGoal = Math.max(1, profileQ.data?.metaTreinosSemana ?? 4);

  const checkInIsDue = useMemo(
    () => hasData && checkInDue() && !checkInFor(planWeekKey()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasData, checkInsQ.dataUpdatedAt, sheet],
  );

  // First-run: brand-new accounts go through onboarding before the dashboard
  // paints. Completion comes from the profile, with the local flag as fallback.
  const needsOnboarding =
    logQ.isSuccess && profileQ.isSuccess && !hasData && !onboardingDone(profileQ.data);
  useEffect(() => {
    if (needsOnboarding) navigate({ to: "/onboarding", replace: true });
  }, [needsOnboarding, navigate]);

  const kcalLeft = (targetsQ.data?.kcal ?? 0) - (dayFoodQ.data?.eaten.kcal ?? 0);
  const proteinTarget = targetsQ.data?.proteinG ?? 0;
  const proteinLeft = proteinTarget - (dayFoodQ.data?.eaten.proteinG ?? 0);

  /** Newest thing the coach wrote: a coach note or an adaptive coaching message. */
  const latestNote = useMemo(() => {
    const items = [
      ...(notesQ.data ?? []).map((n) => ({ at: n.createdAt, text: n.content })),
      ...(eventsQ.data ?? []).map((e) => ({ at: e.createdAt, text: e.message })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return items[0] ? firstSentence(items[0].text) : null;
  }, [notesQ.data, eventsQ.data]);

  const drop = useMemo<CoachingEvent | null>(
    () =>
      (eventsQ.data ?? [])
        .filter((e) => e.kind === "performance_drop" && daysAgo(e.createdAt) <= DROP_MESSAGE_DAYS)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null,
    [eventsQ.data],
  );

  const prLabel = useMemo(() => {
    if (!pr?.date || daysAgo(pr.date) > PR_LABEL_DAYS) return null;
    const name = exercises.find((e) => e.id === pr.exerciseId)?.nome;
    if (!name) return null;
    return t("{day} · {exercise} PR", { day: formatWeekdayLong(pr.date), exercise: name });
  }, [pr, exercises, t]);

  const lastSession = useMemo(() => {
    const last = workouts
      .filter((w) => w.finalizadoEm)
      .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))[0];
    if (!last) return null;
    const exerciseCount = new Set(
      sets.filter((s) => s.workoutId === last.id).map((s) => s.exerciseId),
    ).size;
    const routine = routines.find((r) => r.id === last.routineId);
    return {
      workout: last,
      name: routine?.nome ?? t("Free session"),
      exerciseCount,
      prKg: pr && pr.date === last.iniciadoEm ? pr.pesoKg : null,
    };
  }, [workouts, sets, routines, pr, t]);

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

  const name = profileQ.data?.nome.split(" ")[0] ?? t("Athlete");

  const top = (
    <div className="flex items-center justify-between">
      <MonoLabel onPhoto className="text-fj-text">
        {t("Route")}
      </MonoLabel>
      <MonoLabel onPhoto className="text-fj-text">
        {formatTopDate(new Date())}
      </MonoLabel>
    </div>
  );

  const intro = (
    <div className="on-photo">
      {prLabel ? (
        <MonoLabel onPhoto className="mb-2 block text-fj-effort">
          {prLabel}
        </MonoLabel>
      ) : null}
      <h1 className="h1-hero text-fj-text">
        {isLoading ? (
          <Skeleton className="inline-block h-8 w-48 align-middle" />
        ) : (
          t("{greeting}, {name}.", { greeting, name })
        )}
      </h1>
      {latestNote ? (
        <button
          type="button"
          onClick={() => setSheet("notes")}
          className="mt-2 block text-left text-body leading-[1.4] text-fj-text-2"
        >
          {latestNote}
        </button>
      ) : null}
    </div>
  );

  if (needsOnboarding) {
    return (
      <AppShell hero title={t("Home")}>
        <HeroPage image={heroImages.home} top={top} intro={null}>
          <Skeleton className="h-44 w-full rounded-card" />
        </HeroPage>
      </AppShell>
    );
  }

  return (
    <AppShell hero title={t("Home")}>
      <HeroPage image={heroImages.home} top={top} intro={intro}>
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
            <Link to="/dieta" aria-label={t("See diet")}>
              <StatStrip
                stats={[
                  { label: t("Week"), value: `${sessions}/${weekGoal}` },
                  {
                    label: t("Kcal left"),
                    value: targetsQ.data?.kcal
                      ? formatNumber(Math.max(0, Math.round(kcalLeft)))
                      : "—",
                    color: "recovery",
                  },
                  {
                    label: t("Protein left"),
                    value:
                      proteinTarget > 0 ? formatNumber(Math.max(0, Math.round(proteinLeft))) : "—",
                    unit: proteinTarget > 0 ? "g" : undefined,
                    color: "recovery",
                  },
                ]}
              />
            </Link>

            <TodayCoach
              loading={isLoading}
              activeLabel={active ? sessionLabel(active) : null}
              routine={next}
              doneToday={doneToday}
              inactivity={inactivity}
              drop={drop}
              onStart={primaryAction}
              onReply={() => setSheet("notes")}
            />

            <TodayWeightCard />

            {checkInIsDue ? (
              <CoachCard
                text={t("Your weekly check-in is ready.")}
                action={{ label: t("Start check-in"), onClick: () => setSheet("checkin") }}
              />
            ) : null}

            {hasData ? <WeekMenuPrompt /> : null}

            <RouteCard checkpoints={checkpoints} loading={checkpointsQ.isLoading} />

            {lastSession ? (
              <GlassCard asChild>
                <Link to="/resumo/$id" params={{ id: lastSession.workout.id }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <MonoLabel>
                        {t("Last session · {day}", {
                          day: formatWeekdayLong(lastSession.workout.iniciadoEm),
                        })}
                      </MonoLabel>
                      <p className="mt-2 truncate text-name font-medium">{lastSession.name}</p>
                      <p className="mt-1 text-meta text-fj-label">
                        {formatDurationShort(lastSession.workout.duracaoSeg)} ·{" "}
                        {t("{count} exercises", { count: lastSession.exerciseCount })}
                      </p>
                    </div>
                    {lastSession.prKg ? (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Metric
                          value={formatKg(lastSession.prKg, { unit: false })}
                          unit={weightUnitLabel()}
                          size={28}
                          color="effort"
                        />
                        <MonoLabel className="text-fj-effort">{t("PR")}</MonoLabel>
                      </div>
                    ) : null}
                  </div>
                </Link>
              </GlassCard>
            ) : null}

            {/* Everything else from the old dashboard, one tap away. */}
            <GlassCard padding="none" className="divide-y divide-fj-divider overflow-hidden">
              <MoreRow
                icon={<CalendarDays className="size-4" />}
                label={t("Training calendar")}
                onClick={() => setSheet("calendar")}
              />
              <MoreRow icon={<Search className="size-4" />} label={t("Search")} to="/buscar" />
            </GlassCard>

            <CrossTrainingSheet className="glass rounded-card border-[var(--glass-border)] bg-transparent" />

            {!isLoading && (
              <QuickStartChecklist
                hasRoutine={routines.length > 0}
                hasWorkout={hasData}
                hasRoute={checkpoints.length > 0}
              />
            )}
          </>
        )}
      </HeroPage>

      <HomeSheet open={sheet === "notes"} onClose={() => setSheet(null)} title={t("Coach notes")}>
        <CoachNotesCard />
      </HomeSheet>
      <HomeSheet
        open={sheet === "checkin"}
        onClose={() => setSheet(null)}
        title={t("Weekly check-in")}
      >
        <WeeklyCheckInCard />
      </HomeSheet>
      <HomeSheet
        open={sheet === "calendar"}
        onClose={() => setSheet(null)}
        title={t("Training calendar")}
      >
        <div className="space-y-4">
          <StatsRow
            loading={isLoading}
            hasData={hasData}
            volume={volume}
            sessions={sessions}
            streak={streak}
          />
          {!isLoading && <WorkoutCalendar workouts={workouts} />}
        </div>
      </HomeSheet>
    </AppShell>
  );
}

function HomeSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

function MoreRow({
  icon,
  label,
  onClick,
  to,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  to?: "/buscar";
}) {
  const inner = (
    <>
      <span className="text-fj-label">{icon}</span>
      <span className="flex-1 text-body">{label}</span>
      <ChevronRight className="size-4 text-fj-label" />
    </>
  );
  const cls = "tap-target flex w-full items-center gap-3 px-card py-3 text-left";
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/* ---------- Ro: today's session, or what needs saying first ---------- */

function TodayCoach({
  loading,
  activeLabel,
  routine,
  doneToday,
  inactivity,
  drop,
  onStart,
  onReply,
}: {
  loading: boolean;
  activeLabel: string | null;
  routine: ReturnType<typeof nextRoutine>;
  doneToday: boolean;
  inactivity: CoachingEvent | null;
  drop: CoachingEvent | null;
  onStart: () => void;
  onReply: () => void;
}) {
  const t = useT();
  if (loading) return <Skeleton className="h-40 w-full rounded-card" />;

  const startLabel = activeLabel
    ? t("Resume workout")
    : doneToday
      ? t("Train again")
      : routine
        ? t("Start session")
        : t("Create my routine");
  const action = { label: startLabel, onClick: onStart };

  if (activeLabel) {
    return (
      <CoachCard
        text={t("{session} is still running.", { session: activeLabel })}
        action={action}
      />
    );
  }
  if (inactivity) {
    return (
      <CoachCard
        text={firstSentence(inactivity.message)}
        why={
          inactivity.message !== firstSentence(inactivity.message) ? inactivity.message : undefined
        }
        link={{ label: t("Reply"), onClick: onReply }}
        action={action}
      />
    );
  }
  if (drop) {
    return (
      <CoachCard
        text={firstSentence(drop.message)}
        why={drop.message !== firstSentence(drop.message) ? drop.message : undefined}
        action={action}
      />
    );
  }
  if (doneToday) {
    return (
      <CoachCard
        text={
          routine
            ? t("Session logged. Up next: {routine}.", { routine: routine.nome })
            : t("Session logged. Rest up for tomorrow.")
        }
        action={action}
      />
    );
  }
  return (
    <CoachCard
      text={
        routine
          ? t("{routine} today. {count} exercises, about {min} min.", {
              routine: routine.nome,
              count: routine.exercicios.length,
              min: estimateRoutineMinutes(routine),
            })
          : t("No routine yet. Build one and I'll plan your days.")
      }
      action={action}
    />
  );
}

/* ---------- route ---------- */

function RouteCard({ checkpoints, loading }: { checkpoints: Checkpoint[]; loading: boolean }) {
  const t = useT();
  if (loading) return <Skeleton className="h-36 w-full rounded-card" />;

  const total = checkpoints.length;
  if (total === 0) {
    return (
      <GlassCard asChild>
        <Link to="/rota" className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <MonoLabel>{t("Your route")}</MonoLabel>
            <span className="mt-2 block text-name font-medium">
              {t("Map your route to your goal")}
            </span>
            <span className="mt-1 block text-meta text-fj-label">
              {t("Set checkpoints on the way there")}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-fj-label" />
        </Link>
      </GlassCard>
    );
  }

  const ordered = [...checkpoints].sort((a, b) => a.orderIndex - b.orderIndex);
  const reached = ordered.filter((c) => c.status === "achieved").length;
  const current = currentCheckpoint(checkpoints);
  const currentIndex = current ? ordered.findIndex((c) => c.id === current.id) : -1;
  const pct = Math.round((reached / total) * 100);
  const pace = routePace(checkpoints);
  const paceLabel =
    pace.state === "behind"
      ? t("{days} day(s) behind", { days: pace.daysBehind })
      : pace.state === "ahead"
        ? t("Ahead of your route")
        : t("On your route");

  return (
    <GlassCard asChild>
      <Link to="/rota">
        <div className="flex items-center justify-between">
          <MonoLabel>{t("Your route")}</MonoLabel>
          <Metric value={pct} unit="%" size={22} color="accent" />
        </div>
        <RouteLine
          total={total}
          reached={reached}
          currentIndex={currentIndex}
          className="mt-3 h-16 w-full"
        />
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="text-body">
            {t("Checkpoint {x} of {y}", { x: Math.min(reached + 1, total), y: total })}
          </p>
          <p
            className={cn(
              "shrink-0 text-meta",
              pace.state === "behind" ? "text-fj-effort-text" : "text-fj-label",
            )}
          >
            {paceLabel}
          </p>
        </div>
        {pace.next ? (
          <p className="mt-1 truncate text-meta text-fj-label">
            {t("Next: {title}", { title: pace.next.title })}
          </p>
        ) : null}
      </Link>
    </GlassCard>
  );
}

/* ---------- this week's numbers (behind "Training calendar") ---------- */

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
  if (loading) return <Skeleton className="h-24 w-full rounded-card" />;

  const pct = volume.deltaPct;
  const trend = volume.isRecord
    ? t("New weekly record")
    : pct === null
      ? t("First week logged")
      : t("{pct}% vs last week", { pct: `${pct >= 0 ? "+" : ""}${formatNumber(pct, 0)}` });

  return (
    <div>
      <StatStrip
        stats={[
          {
            label: t("Volume"),
            value: hasData ? formatNumber(Math.round(volume.current)) : "0",
            unit: "kg",
          },
          { label: t("Workouts"), value: sessions },
          { label: t("Streak"), value: streak, unit: t("wks") },
        ]}
      />
      <p
        className={cn(
          "mt-2 text-meta font-medium",
          volume.isRecord ? "text-fj-effort" : "text-fj-label",
        )}
      >
        {hasData ? trend : t("Your first workout lights this number up.")}
      </p>
    </div>
  );
}

/* ---------- first stretch checklist ---------- */

/** The first stretch of the route: routine, first workout, route mapped. */
function QuickStartChecklist({
  hasRoutine,
  hasWorkout,
  hasRoute,
}: {
  hasRoutine: boolean;
  hasWorkout: boolean;
  hasRoute: boolean;
}) {
  const t = useT();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(QUICKSTART_KEY) === "1");
  }, []);

  const items = [
    { label: t("Account created"), done: true },
    { label: t("Routine ready"), done: hasRoutine },
    { label: t("First workout"), done: hasWorkout },
    { label: t("Route mapped"), done: hasRoute },
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
    <GlassCard>
      <MonoLabel>{t("First stretch")}</MonoLabel>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-body">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border",
                item.done
                  ? "border-fj-accent bg-fj-accent text-fj-on-accent"
                  : "border-fj-glass-border",
              )}
            >
              {item.done && <Check className="size-3" />}
            </span>
            <span className={item.done ? "text-fj-text" : "text-fj-label"}>{item.label}</span>
          </li>
        ))}
      </ul>
      <Link
        to={hasRoutine && hasWorkout ? "/rota" : "/treino"}
        className="mt-3 inline-flex items-center gap-1 text-meta font-medium text-fj-accent"
      >
        {hasRoutine && hasWorkout ? t("My route") : t("Routines")}{" "}
        <ChevronRight className="size-3.5" />
      </Link>
    </GlassCard>
  );
}
