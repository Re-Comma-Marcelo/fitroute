import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Play, Plus, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { getRoutines, type Routine } from "@/lib/data/routines";
import { getWorkouts } from "@/lib/data/workouts";
import { formatDurationShort, relativeDays } from "@/lib/format";
import { routineCover } from "@/lib/exercise-image";
import { loadActiveSession, type ActiveSession } from "@/lib/session-state";
import { startBlankSession, startRoutineSession } from "@/lib/start-session";
import { getRoutineInsights } from "@/lib/coach/exercise-insights";
import { cn } from "@/lib/utils";
import type { CoachInsight } from "@/lib/coach/types";
import { CoachChatButton } from "@/components/CoachChatSheet";

export const Route = createFileRoute("/treino")({
  head: () => ({
    meta: [
      { title: "Train — Forja" },
      {
        name: "description",
        content: "Your routines, weekly goal and quick-start session.",
      },
      { property: "og:title", content: "Train — Forja" },
      {
        property: "og:description",
        content: "Saved routines, weekly goal and quick-start session.",
      },
    ],
  }),
  component: TrainPage,
});

function weekStart() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Monday = 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).getTime();
}

function TrainPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => setActive(loadActiveSession()), []);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const routines = routinesQuery.data ?? [];
  const workouts = workoutsQuery.data ?? [];
  const exercises = exercisesQuery.data ?? [];

  const insightsQuery = useQuery({
    queryKey: ["routine-insights", routines.map((r) => r.id).join("|")],
    enabled: routines.length > 0 && workouts.length > 0,
    queryFn: async () => {
      const map: Record<string, Record<string, CoachInsight>> = {};
      await Promise.all(
        routines.map(async (r) => {
          map[r.id] = await getRoutineInsights(r, workouts);
        }),
      );
      return map;
    },
  });
  const insights = insightsQuery.data ?? {};

  const meta = profileQuery.data?.metaTreinosSemana ?? 4;
  const start = weekStart();
  const doneThisWeek = workouts.filter((w) => new Date(w.iniciadoEm).getTime() >= start).length;

  function lastOfRoutine(routineId: string) {
    return workouts
      .filter((w) => w.routineId === routineId)
      .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))[0];
  }

  async function startRoutine(routineId: string) {
    if (active) {
      navigate({ to: "/sessao" });
      return;
    }
    setLoading(routineId);
    await startRoutineSession(routineId);
    navigate({ to: "/sessao" });
  }

  async function startBlank() {
    setLoading("blank");
    await startBlankSession();
    navigate({ to: "/sessao" });
  }

  return (
    <AppShell
      title="Train"
      action={
        <Button asChild variant="secondary" size="icon" className="tap-target size-11">
          <Link to="/rotina/$id" params={{ id: "nova" }} aria-label="Create new routine">
            <Plus className="size-6" />
          </Link>
        </Button>
      }
    >
      {active ? (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <p className="text-sm font-semibold text-primary">Session in progress</p>
          <p className="mt-1 text-base font-semibold">{active.routineNome}</p>
          <Button className="mt-3 w-full font-bold" onClick={() => navigate({ to: "/sessao" })}>
            <Play className="mr-2 size-4" /> Resume workout
          </Button>
        </div>
      ) : null}

      <section className="mb-6">
        <div className="flex items-end justify-between">
          <h2 className="label-caps">Weekly goal</h2>
          <p className="font-display text-sm font-semibold tabular-nums">
            <span className="text-primary">{doneThisWeek}</span>
            <span className="text-muted-foreground">/{meta}</span>
          </p>
        </div>
        <div
          className="mt-3 flex gap-1"
          role="img"
          aria-label={`${doneThisWeek} of ${meta} sessions this week`}
        >
          {Array.from({ length: meta }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-full", i < doneThisWeek ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-14 w-full text-base font-semibold"
          disabled={(!routines[0] && !active) || loading !== null}
          onClick={() => (active ? navigate({ to: "/sessao" }) : routines[0] && startRoutine(routines[0].id))}
        >
          <Play className="mr-1 size-5" />
          {active ? "Resume" : "Start"}
        </Button>
        <Button
          variant="outline"
          className="h-14 w-full text-base font-semibold"
          disabled={active !== null || loading !== null}
          onClick={startBlank}
        >
          Blank
        </Button>
      </div>

      <h2 className="label-caps mt-8 mb-3">My routines</h2>

      {routinesQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : routines.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No routines yet.</p>
          <Button asChild className="mt-3">
            <Link to="/rotina/$id" params={{ id: "nova" }}>
              <Plus className="mr-2 size-4" /> Create routine
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {routines.map((r) => (
            <RoutineCard
              key={r.id}
              r={r}
              exercises={exercises}
              last={lastOfRoutine(r.id)}
              insights={insights[r.id] ?? {}}
              active={!!active}
              loading={loading}
              onStart={() => startRoutine(r.id)}
            />
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function RoutineCard({
  r,
  exercises,
  last,
  insights,
  active,
  loading,
  onStart,
}: {
  r: Routine;
  exercises: Awaited<ReturnType<typeof getExercises>>;
  last?: ReturnType<typeof getWorkouts>[number];
  insights: Record<string, CoachInsight>;
  active: boolean;
  loading: string | null;
  onStart: () => void;
}) {
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      <Link
        to="/rotina/$id"
        params={{ id: r.id }}
        className="group flex items-center gap-3 p-3"
        aria-label={`Edit routine ${r.nome}`}
      >
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
          <img src={routineCover(r.id)} alt="" loading="lazy" className="size-full object-cover" />
          <div className="veil absolute inset-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight">{r.nome}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{r.exercicios.length} exercises</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            {last
              ? `Last ${relativeDays(last.iniciadoEm)} · ${formatDurationShort(last.duracaoSeg)}`
              : "Never trained"}
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
      </Link>

      <ul className="space-y-2 border-t border-border px-3 py-3">
        {r.exercicios.map((re) => {
          const ex = exercises.find((e) => e.id === re.exerciseId);
          const insight = insights[re.exerciseId];
          return (
            <li key={re.id} className="flex items-center gap-3">
              <ExerciseThumb grupo={ex?.grupoPrimario} nome={ex?.nome} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{ex?.nome ?? "Exercise"}</p>
                  {insight && insight.severity !== "info" ? (
                    <InsightBadge insight={insight} />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground/80">
                  {re.seriesAlvo} sets · {re.repsMin}-{re.repsMax} reps
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="px-3 pb-4">
        <Button
          variant="secondary"
          className="h-12 w-full font-semibold"
          disabled={loading !== null || active}
          onClick={onStart}
        >
          {active ? "Resume in player" : `Start ${r.nome}`}
        </Button>
      </div>
    </li>
  );
}

function InsightBadge({ insight }: { insight: CoachInsight }) {
  const isWarning = insight.severity === "warning";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${insight.title} — see details`}
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-bold",
            isWarning
              ? "bg-warn/15 text-warn"
              : "bg-primary/15 text-primary",
          )}
        >
          {isWarning ? (
            <AlertTriangle className="size-3" strokeWidth={3} />
          ) : (
            <TrendingUp className="size-3" strokeWidth={3} />
          )}
          {insight.title}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 text-sm">
        <p className="font-semibold">{insight.title}</p>
        <p className="mt-1 text-muted-foreground">{insight.body}</p>
      </PopoverContent>
    </Popover>
  );
}
