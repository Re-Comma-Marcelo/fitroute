import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Dumbbell,
  ChevronRight,
  Flame,
  Clock,
  Layers,
  Timer,
  MessageSquare,
  Target,
  Moon,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getRoutines } from "@/lib/data/routines";
import { getWorkouts } from "@/lib/data/workouts";
import { getProfile } from "@/lib/data/profile";
import { getRecentCoachNotes, saveCoachNote } from "@/lib/data/coach-notes";
import { getTodayPlan } from "@/lib/coach/recommendations";
import { currentWeekStart } from "@/lib/coach/signals";
import { loadActiveSession, type ActiveSession } from "@/lib/session-state";
import { startRoutineSession, startBlankSession } from "@/lib/start-session";
import {
  formatDate,
  formatDurationShort,
  formatKg,
  relativeDays,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { CoachChatButton } from "@/components/CoachChatSheet";
import type { CoachNote, Profile } from "@/lib/types";
import type { TodayPlan } from "@/lib/coach/types";

export const Route = createFileRoute("/inicio")({
  component: Inicio,
  head: () => ({
    meta: [
      { title: "Home — Forja" },
      {
        name: "description",
        content: "Your training dashboard, weekly goal and coach recommendations.",
      },
      { property: "og:title", content: "Home — Forja" },
      {
        property: "og:description",
        content: "Your training dashboard, weekly goal and coach recommendations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Inicio() {
  const navigate = useNavigate();
  const [active, setActive] = useState(loadActiveSession());

  useEffect(() => {
    const id = setInterval(() => setActive(loadActiveSession()), 1000);
    return () => clearInterval(id);
  }, []);

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const routinesQ = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const workoutsQ = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const coachQ = useQuery({ queryKey: ["coach-today"], queryFn: getTodayPlan });
  const notesQ = useQuery({ queryKey: ["coach-notes"], queryFn: () => getRecentCoachNotes() });

  async function startAction() {
    if (active) {
      navigate({ to: "/sessao" });
      return;
    }
    const rec = coachQ.data?.recommendation;
    if (rec?.routineId) {
      await startRoutineSession(rec.routineId);
    } else {
      await startBlankSession();
    }
    navigate({ to: "/sessao" });
  }

  const profile = profileQ.data;
  const routines = routinesQ.data ?? [];
  const workouts = workoutsQ.data ?? [];
  const coach = coachQ.data;
  const notes = notesQ.data ?? [];

  const weekStart = currentWeekStart();
  const thisWeek = workouts.filter(
    (w) => w.finalizadoEm && new Date(w.iniciadoEm).toISOString() >= weekStart,
  );
  const weekSessions = thisWeek.length;
  const target = profile?.metaTreinosSemana ?? 4;
  const weekVolume = thisWeek.reduce((sum, w) => sum + w.volumeTotalKg, 0);
  const weekTime = thisWeek.reduce((sum, w) => sum + w.duracaoSeg, 0);

  const isLoading =
    profileQ.isLoading || routinesQ.isLoading || workoutsQ.isLoading || coachQ.isLoading;

  return (
    <AppShell hideHeader title="Home">
      <div className="space-y-5 pb-28">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 pt-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {greeting()},{" "}
              {isLoading ? (
                <Skeleton className="inline-block h-4 w-20 align-middle" />
              ) : (
                profile?.nome.split(" ")[0] ?? "Athlete"
              )}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(new Date())}
            </h1>
          </div>
          <CoachChatButton />
        </header>

        {/* Check-in */}
        {!isLoading && <CheckInPrompt profile={profile} notes={notes} onSaved={() => notesQ.refetch()} />}

        {/* Today recommendation */}
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (
          <TodayCard
            active={active}
            recommendation={coach?.recommendation}
            onStart={startAction}
          />
        )}

        {/* Weekly goal + segmented progress */}
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : (
          <WeeklyGoalCard
            sessions={weekSessions}
            target={target}
            onStart={startAction}
            active={!!active}
          />
        )}

        {/* Insights */}
        {!isLoading && coach?.insights && coach.insights.length > 0 && (
          <div className="space-y-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Coach notes
            </h2>
            <div className="grid gap-2">
              {coach.insights.map((insight) => (
                <Card
                  key={insight.id}
                  className={cn(
                    "border-l-4 p-3 shadow-none",
                    insight.severity === "warning"
                      ? "border-l-warn bg-warn/10"
                      : "border-l-info bg-info/10",
                  )}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {insight.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug">{insight.body}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Metrics */}
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : (
          <div className="flex items-stretch justify-between rounded-2xl border border-border bg-card/50 p-3">
            <Metric label="Volume" value={formatKg(weekVolume)} icon={Layers} />
            <Metric label="Time" value={formatDurationShort(weekTime)} icon={Clock} />
            <Metric label="Sets" value={String(thisWeek.length * 4)} icon={Timer} />
          </div>
        )}

        {/* Routines */}
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Routines
            </h2>
            <Link
              to="/treino"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              See all <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-2">
              {routines.slice(0, 2).map((r) => (
                <RoutineCard key={r.id} routine={r} />
              ))}
            </div>
          )}
        </section>

        {/* Recent sessions */}
        <section>
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Recent sessions
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : workouts.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {workouts
                .filter((w) => w.finalizadoEm)
                .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))
                .slice(0, 3)
                .map((w) => (
                  <SessionRow key={w.id} workout={w} />
                ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-1 items-center gap-2 px-2">
      <div className="flex size-9 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function TodayCard({
  active,
  recommendation,
  onStart,
}: {
  active: ActiveSession | null;
  recommendation?: TodayPlan["recommendation"] | undefined;
  onStart: () => void;
}) {
  if (active) {
    return (
      <Card className="relative overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
        <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Flame className="size-4" />
            Session in progress
          </div>
          <h2 className="mt-2 text-xl font-bold">{active.routineNome}</h2>
          <p className="text-sm text-muted-foreground">
            Tap resume to keep going where you left off.
          </p>
          <Button onClick={onStart} className="mt-4 w-full font-bold">
            <Timer className="mr-2 size-4" /> Resume workout
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <MessageSquare className="size-4" />
          Today
        </div>
        <h2 className="mt-2 text-xl font-bold">
          {recommendation?.title ?? "Start a workout"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {recommendation?.reason ?? "Pick a routine and start logging."}
        </p>
        <Button onClick={onStart} className="mt-4 w-full font-bold">
          <Dumbbell className="mr-2 size-4" />
          {recommendation?.routineId ? "Start recommended" : "Start blank workout"}
        </Button>
      </div>
    </Card>
  );
}

function WeeklyGoalCard({
  sessions,
  target,
  onStart,
  active,
}: {
  sessions: number;
  target: number;
  onStart: () => void;
  active: boolean;
}) {
  const blocks = Array.from({ length: target }, (_, i) => i < sessions);
  return (
    <Card className="rounded-2xl border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Weekly goal
          </p>
          <p className="mt-0.5 text-lg font-bold">
            {sessions}/{target} sessions
          </p>
        </div>
        <Button onClick={onStart} variant="outline" className="h-10 font-bold">
          {active ? "Resume" : "Train"}
        </Button>
      </div>
      <div className="mt-3 flex gap-1.5">
        {blocks.map((filled, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full",
              filled ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {sessions >= target
          ? "Weekly goal hit. Well done."
          : `${target - sessions} more to hit your weekly target.`}
      </p>
    </Card>
  );
}

function RoutineCard({ routine }: { routine: Awaited<ReturnType<typeof getRoutines>>[number] }) {
  const first = routine.exercicios[0];
  const primaryGroup = first ? first.exerciseId : "";
  // Note: this is a placeholder group; real group would come from exercise lookup.
  return (
    <Link
      to="/rotina/$id"
      params={{ id: routine.id }}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-accent"
    >
      <ExerciseThumb grupo="Chest" className="size-14 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{routine.nome}</p>
        <p className="text-sm text-muted-foreground">
          {routine.exercicios.length} exercises
        </p>
      </div>
      <ChevronRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
    </Link>
  );
}

function SessionRow({ workout }: { workout: Awaited<ReturnType<typeof getWorkouts>>[number] }) {
  return (
    <Link
      to="/resumo/$id"
      params={{ id: workout.id }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
    >
      <ExerciseThumb grupo="Back" className="size-12 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {workout.routineId ? "Routine" : "Free workout"} · {relativeDays(workout.iniciadoEm)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(workout.iniciadoEm)} · {formatDurationShort(workout.duracaoSeg)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold tabular-nums">{formatKg(workout.volumeTotalKg)}</p>
        <p className="text-[10px] text-muted-foreground">volume</p>
      </div>
    </Link>
  );
}

function CheckInPrompt({
  profile,
  notes,
  onSaved,
}: {
  profile: Profile | undefined;
  notes: CoachNote[];
  onSaved: () => void;
}) {
  if (profile?.checkInMode === "prompt") return null;
  const day = new Date().getDay();
  if (day !== 0 && day !== 1) return null;
  const recent = notes.some(
    (n) => n.createdAt > new Date(Date.now() - 7 * 86400000).toISOString() && n.kind === "checkin",
  );
  if (recent) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Card className="cursor-pointer rounded-2xl border-warn/30 bg-warn/10 p-3">
          <p className="text-sm font-semibold text-warn">Weekly check-in</p>
          <p className="text-xs text-muted-foreground">
            Two quick questions to keep your coach aligned.
          </p>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col">
        <SheetHeader className="pb-2">
          <SheetTitle>Weekly check-in</SheetTitle>
        </SheetHeader>
        <CheckInForm onSaved={onSaved} />
      </SheetContent>
    </Sheet>
  );
}

function CheckInForm({ onSaved }: { onSaved: () => void }) {
  const [soreness, setSoreness] = useState("");
  const [workoutIssue, setWorkoutIssue] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const tags: string[] = [];
    if (soreness.trim()) tags.push("soreness");
    if (workoutIssue) tags.push(workoutIssue);
    await saveCoachNote({
      kind: "checkin",
      content: [soreness, note].filter(Boolean).join(" ") || "Weekly check-in",
      tags,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-6">
      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          Did anything bother you last week?
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          Soreness, tweak, or anything that limited your training.
        </p>
        <textarea
          value={soreness}
          onChange={(e) => setSoreness(e.target.value)}
          placeholder="Knee felt off on squats..."
          className="min-h-[80px] w-full rounded-xl border border-border bg-card p-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">
          Did anything about the workouts not work?
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "too-long", label: "Too long" },
            { value: "disliked", label: "Disliked an exercise" },
            { value: "missed", label: "Missed sessions" },
            { value: "none", label: "Nothing" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setWorkoutIssue(opt.value === "none" ? null : opt.value)}
              className={cn(
                "tap-target rounded-full border px-3 py-1.5 text-xs font-semibold",
                workoutIssue === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold">Anything else?</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Sleep, stress, nutrition, energy..."
          className="min-h-[60px] w-full rounded-xl border border-border bg-card p-3 text-sm"
        />
      </div>
      <Button type="submit" className="w-full font-bold" disabled={saving}>
        Save check-in
      </Button>
    </form>
  );
}
