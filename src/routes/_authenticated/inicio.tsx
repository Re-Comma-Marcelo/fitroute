import { pageMeta } from "@/lib/route-meta";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
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
import { loadActiveSession, sessionLabel, type ActiveSession } from "@/lib/session-state";
import { startRoutineSession, startBlankSession } from "@/lib/start-session";
import {
  formatDate,
  formatDurationShort,
  formatFullDate,
  formatKg,
  formatMonthYear,
  formatNumber,
  relativeDays,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { CoachChatButton } from "@/components/CoachChatSheet";
import type { CoachNote, Profile } from "@/lib/types";
import type { TodayPlan } from "@/lib/coach/types";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: Inicio,
  head: () => ({
    meta: pageMeta({
      title: "Home",
      description: "Your training dashboard, weekly goal and coach recommendations.",
      twitterCard: "summary",
    }),
  }),
});

export default function Inicio() {
  const t = useT();
  const navigate = useNavigate();
  const [active, setActive] = useState(loadActiveSession());

  const h = new Date().getHours();
  const greeting = h < 12 ? t("Good morning") : h < 18 ? t("Good afternoon") : t("Good evening");

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

  const trainedToday = thisWeek.some(
    (w) => new Date(w.iniciadoEm).toDateString() === new Date().toDateString(),
  );
  const restDay = !active && (trainedToday || weekSessions >= target);

  return (
    <AppShell hideHeader title={t("Home")}>
      <div className="space-y-5 pb-28">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 pt-2">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {greeting},{" "}
              {isLoading ? (
                <Skeleton className="inline-block h-6 w-24 align-middle" />
              ) : (
                (profile?.nome.split(" ")[0] ?? t("Athlete"))
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatFullDate(new Date())}
            </p>
          </div>
          <CoachChatButton />
        </header>

        {/* Body goal */}
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (
          <BodyGoalCard profile={profile} />
        )}

        {/* Check-in */}
        {!isLoading && <CheckInPrompt profile={profile} notes={notes} onSaved={() => notesQ.refetch()} />}

        {/* Today recommendation */}
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (
          <TodayCard
            active={active}
            restDay={restDay}
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

        {/* Optional AI plan entry — dismissible, never blocking */}
        {!isLoading && <GetAPlanCard dismissible />}


        {/* Insights */}
        {!isLoading && coach?.insights && coach.insights.length > 0 && (
          <div className="space-y-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("Coach notes")}
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
            <Metric label={t("Volume")} value={formatKg(weekVolume)} icon={Layers} />
            <Metric label={t("Time")} value={formatDurationShort(weekTime)} icon={Clock} />
            <Metric label={t("Sets")} value={String(thisWeek.length * 4)} icon={Timer} />
          </div>
        )}

        {/* Routines */}
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("Routines")}
            </h2>
            <Link
              to="/treino"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              {t("See all")} <ChevronRight className="size-3.5" />
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
            {t("Recent sessions")}
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : workouts.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">{t("No sessions yet.")}</p>
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

function BodyGoalCard({ profile }: { profile: Profile | undefined }) {
  const t = useT();
  if (!profile?.pesoMetaKg) return null;
  const current = profile.pesoKg;
  const target = profile.pesoMetaKg;
  const start = profile.pesoInicialKg ?? current;
  const gaining = target >= start;
  const total = Math.abs(target - start) || 1;
  const done = Math.abs(current - start);
  const pct = Math.max(0, Math.min(100, (done / total) * 100));
  const remaining = Math.abs(target - current);

  const daysElapsed = profile.metaIniciadaEm
    ? Math.max(1, Math.round((Date.now() - new Date(profile.metaIniciadaEm).getTime()) / 86400000))
    : 0;
  const perDay = daysElapsed && done > 0 ? done / daysElapsed : 0;
  const paceDate =
    perDay > 0 && remaining > 0
      ? new Date(Date.now() + (remaining / perDay) * 86400000)
      : null;

  const fmtKgLocale = (n: number) => formatNumber(n, 1);
  const shortDate = (d: Date) =>
    formatMonthYear(d);

  return (
    <Card className="rounded-2xl border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Target className="size-4 text-primary" />
          {t("Body goal")}
        </div>
        {profile.metaPrazo && (
          <span className="text-xs text-muted-foreground">
            {t("by {date}", { date: shortDate(new Date(profile.metaPrazo)) })}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("Current")}</p>
          <p className="font-display text-3xl font-bold tabular-nums">
            {fmtKgLocale(current)} <span className="text-sm font-semibold text-muted-foreground">kg</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t("Target")}</p>
          <p className="font-display text-3xl font-bold tabular-nums text-primary">
            {fmtKgLocale(target)} <span className="text-sm font-semibold text-muted-foreground">kg</span>
          </p>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-2 text-sm leading-snug text-muted-foreground">
        {remaining < 0.05 ? (
          t("Goal reached. Time to set a new one.")
        ) : (
          <>
            <span className="font-semibold text-foreground">
              {t("{remaining} kg", { remaining: fmtKgLocale(remaining) })}
            </span>{" "}
            {t("to {action}", { action: gaining ? t("gain") : t("lose") })}.
            {paceDate ? (
              <>
                {" "}
                {t("At the current pace: {date}", { date: formatDate(paceDate.toISOString()) })}
              </>
            ) : (
              t(" Log your weight to project a date.")
            )}
          </>
        )}
      </p>
    </Card>
  );
}

function TodayCard({
  active,
  restDay,
  recommendation,
  onStart,
}: {
  active: ActiveSession | null;
  restDay?: boolean;
  recommendation?: TodayPlan["recommendation"] | undefined;
  onStart: () => void;
}) {
  const t = useT();
  if (active) {
    return (
      <Card className="relative overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
        <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Flame className="size-4" />
            {t("Session in progress")}
          </div>
          <h2 className="mt-2 font-display text-xl font-bold">{sessionLabel(active)}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Tap resume to keep going where you left off.")}
          </p>
          <Button onClick={onStart} className="mt-4 w-full font-bold">
            <Timer className="mr-2 size-4" /> {t("Resume workout")}
          </Button>
        </div>
      </Card>
    );
  }

  if (restDay) {
    return (
      <Card className="rounded-2xl border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-warn">
          <Moon className="size-4" />
          {t("Today's training")}
        </div>
        <h2 className="mt-2 font-display text-xl font-bold">{t("Rest day")}</h2>
        <p className="text-sm leading-snug text-muted-foreground">
          {t("Use it to recover. Hydrate and sleep well.")}
        </p>
        <Button onClick={onStart} variant="outline" className="mt-4 w-full font-bold">
          <Dumbbell className="mr-2 size-4" /> {t("Train anyway")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <MessageSquare className="size-4" />
          {t("Today's training")}
        </div>
        <h2 className="mt-2 font-display text-xl font-bold">
          {recommendation?.title ?? t("Start a workout")}
        </h2>
        <p className="text-sm leading-snug text-muted-foreground">
          {recommendation?.reason ?? t("Pick a routine and start logging.")}
        </p>
        <Button onClick={onStart} className="mt-4 w-full font-bold">
          <Dumbbell className="mr-2 size-4" />
          {recommendation?.routineId ? t("Start recommended") : t("Start blank workout")}
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
  const t = useT();
  const blocks = Array.from({ length: target }, (_, i) => i < sessions);
  return (
    <Card className="rounded-2xl border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("Weekly goal")}
          </p>
          <p className="mt-0.5 text-lg font-bold">
            {t("{sessions}/{target} sessions", { sessions, target })}
          </p>
        </div>
        <Button onClick={onStart} variant="outline" className="h-10 font-bold">
          {active ? t("Resume") : t("Train")}
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
          ? t("Weekly goal hit. Well done.")
          : t("{count} more to hit your weekly target.", { count: target - sessions })}
      </p>
    </Card>
  );
}

function RoutineCard({ routine }: { routine: Awaited<ReturnType<typeof getRoutines>>[number] }) {
  const t = useT();
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
          {t("{count} exercises", { count: routine.exercicios.length })}
        </p>
      </div>
      <ChevronRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
    </Link>
  );
}

function SessionRow({ workout }: { workout: Awaited<ReturnType<typeof getWorkouts>>[number] }) {
  const t = useT();
  return (
    <Link
      to="/resumo/$id"
      params={{ id: workout.id }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
    >
      <ExerciseThumb grupo="Back" className="size-12 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {workout.routineId ? t("Routine") : t("Free workout")} · {relativeDays(workout.iniciadoEm)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(workout.iniciadoEm)} · {formatDurationShort(workout.duracaoSeg)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold tabular-nums">{formatKg(workout.volumeTotalKg)}</p>
        <p className="text-[10px] text-muted-foreground">{t("volume")}</p>
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
  const t = useT();
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
          <p className="text-sm font-semibold text-warn">{t("Weekly check-in")}</p>
          <p className="text-xs text-muted-foreground">
            {t("Two quick questions to keep your coach aligned.")}
          </p>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col">
        <SheetHeader className="pb-2">
          <SheetTitle>{t("Weekly check-in")}</SheetTitle>
        </SheetHeader>
        <CheckInForm onSaved={onSaved} />
      </SheetContent>
    </Sheet>
  );
}

function CheckInForm({ onSaved }: { onSaved: () => void }) {
  const t = useT();
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

  const issues = [
    { value: "too-long", label: t("Too long") },
    { value: "disliked", label: t("Disliked an exercise") },
    { value: "missed", label: t("Missed sessions") },
    { value: "none", label: t("Nothing") },
  ];

  return (
    <form onSubmit={submit} className="space-y-4 pb-6">
      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          {t("Did anything bother you last week?")}
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          {t("Soreness, tweak, or anything that limited your training.")}
        </p>
        <textarea
          value={soreness}
          onChange={(e) => setSoreness(e.target.value)}
          placeholder={t("Knee felt off on squats...")}
          className="min-h-[80px] w-full rounded-xl border border-border bg-card p-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">
          {t("Did anything about the workouts not work?")}
        </label>
        <div className="flex flex-wrap gap-2">
          {issues.map((opt) => (
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
        <label className="mb-1.5 block text-sm font-semibold">{t("Anything else?")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("Sleep, stress, nutrition, energy...")}
          className="min-h-[60px] w-full rounded-xl border border-border bg-card p-3 text-sm"
        />
      </div>
      <Button type="submit" className="w-full font-bold" disabled={saving}>
        {t("Save check-in")}
      </Button>
    </form>
  );
}
