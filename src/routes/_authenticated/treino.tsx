import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RoutineTemplateSheet } from "@/components/RoutineTemplateSheet";
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { AppShell } from "@/components/AppShell";
import { QueryError } from "@/components/QueryError";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { TodayCoachCard } from "@/components/TodayCoachCard";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { duplicateRoutine, getRoutines } from "@/lib/data/routines";
import type { Exercise, Routine, Workout } from "@/lib/types";
import { getWorkouts } from "@/lib/data/workouts";
import { formatDurationShort, formatKg, relativeDays } from "@/lib/format";
import { routineCover } from "@/lib/exercise-image";
import { EMPTY_TARGETS, getWeeklyTargets, type WeeklyTargets } from "@/lib/weekly-targets";

import {
  clearActiveSession,
  currentExerciseName,
  loadActiveSession,
  loadTodayChoice,
  saveTodayChoice,
  sessionElapsed,
  sessionSetsDone,
  type ActiveSession,
  sessionLabel,
} from "@/lib/session-state";

import { startBlankSession, startRoutineSession } from "@/lib/start-session";
import { getTodayCard } from "@/lib/coach/today-card";
import { swapCandidates } from "@/lib/coach/swap";
import { cn } from "@/lib/utils";
import { estimateRoutineMinutes } from "@/lib/routine-estimate";
import type { CoachInsight } from "@/lib/coach/types";
import { CoachChatButton, CoachChatRow } from "@/components/CoachChatSheet";

export const Route = createFileRoute("/_authenticated/treino")({
  head: () => ({
    meta: pageMeta({
      title: "Train",
      description: "Today's session, why it's queued, and your saved routines.",
      ogDescription: "Today's coached session plus your saved routines and weekly goal.",
      twitterCard: "summary",
    }),
  }),
  component: TrainPage,
});

function weekStart() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Monday = 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).getTime();
}

function TrainPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    setActive(loadActiveSession());
    setChoice(loadTodayChoice());
  }, []);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const routines = routinesQuery.data ?? [];
  const workouts = workoutsQuery.data ?? [];
  const exercises = exercisesQuery.data ?? [];
  const profile = profileQuery.data;

  const coachQuery = useQuery({
    queryKey: ["today-card", choice ?? "recommended"],
    enabled: routines.length > 0,
    queryFn: () => getTodayCard(choice),
  });
  const coach = coachQuery.data;
  const insights = coach?.insightsByRoutine ?? {};

  const swapOptions = useMemo(() => {
    if (!coach?.routineId || !profile) return {};
    const routine = routines.find((r) => r.id === coach.routineId);
    if (!routine) return {};
    const map: Record<string, Exercise[]> = {};
    for (const f of coach.flagged) {
      map[f.exerciseId] = swapCandidates(f.exerciseId, routine, exercises, profile);
    }
    return map;
  }, [coach, routines, exercises, profile]);

  const meta = profile?.metaTreinosSemana ?? 4;
  const start = weekStart();
  const weekWorkouts = workouts.filter((w) => new Date(w.iniciadoEm).getTime() >= start);
  const doneThisWeek = weekWorkouts.length;
  const volumeThisWeek = Math.round(weekWorkouts.reduce((s, w) => s + w.volumeTotalKg, 0));
  const [overrideRest, setOverrideRest] = useState(false);
  const [targets, setTargets] = useState<WeeklyTargets>(EMPTY_TARGETS);
  useEffect(() => setTargets(getWeeklyTargets()), []);

  /** What the next session looks like — shown on rest days so the plan stays visible. */
  const nextPreview = useMemo(() => {
    const id = coach?.recommendedRoutineId ?? coach?.routineId;
    const routine = routines.find((r) => r.id === id);
    if (!routine) return null;
    const nomes = routine.exercicios
      .map((re) => exercises.find((e) => e.id === re.exerciseId)?.nome)
      .filter((n): n is string => !!n);
    return {
      nome: routine.nome,
      primeiros: nomes.slice(0, 2),
      restantes: Math.max(0, nomes.length - 2),
      minutos: estimateRoutineMinutes(routine),
    };
  }, [coach?.recommendedRoutineId, coach?.routineId, routines, exercises]);


  const activeChoiceId = coach?.routineId ?? routines[0]?.id;
  const orderedRoutines = useMemo(() => {
    if (!coach?.recommendedRoutineId) return routines;
    const rec = routines.find((r) => r.id === coach.recommendedRoutineId);
    if (!rec) return routines;
    return [rec, ...routines.filter((r) => r.id !== rec.id)];
  }, [routines, coach?.recommendedRoutineId]);

  // One pass over the history instead of a filter+sort per routine card.
  const lastByRoutine = useMemo(() => {
    const map = new Map<string, (typeof workouts)[number]>();
    for (const w of workouts) {
      if (!w.routineId) continue;
      const current = map.get(w.routineId);
      if (!current || w.iniciadoEm > current.iniciadoEm) map.set(w.routineId, w);
    }
    return map;
  }, [workouts]);

  async function startRoutine(routineId: string, opts: { deload?: boolean } = {}) {
    if (active) {
      navigate({ to: "/sessao" });
      return;
    }
    setLoading(routineId);
    try {
      saveTodayChoice(routineId);
      const applied = Object.fromEntries(
        Object.entries(swaps).filter(([original]) =>
          routines
            .find((r) => r.id === routineId)
            ?.exercicios.some((re) => re.exerciseId === original),
        ),
      );
      await startRoutineSession(routineId, {
        ...(Object.keys(applied).length ? { swaps: applied } : {}),
        ...(opts.deload ? { deload: true } : {}),
      });
      navigate({ to: "/sessao" });
    } catch {
      toast.error(t("Could not start the session. Check your connection and try again."));
    } finally {
      setLoading(null);
    }
  }

  function pickRoutine(routineId: string) {
    saveTodayChoice(routineId);
    setChoice(routineId);
    setSwaps({});
  }

  /** Copy a routine so a variation can be edited without touching the original. */
  async function duplicate(routineId: string, nome: string) {
    try {
      const copy = await duplicateRoutine(routineId, t("{name} (copy)", { name: nome }));
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      if (copy) navigate({ to: "/rotina/$id", params: { id: copy.id } });
    } catch {
      toast.error(t("Could not duplicate the routine. Try again."));
    }
  }

  async function startBlank() {
    setLoading("blank");
    try {
      await startBlankSession();
      navigate({ to: "/sessao" });
    } catch {
      toast.error(t("Could not start the session. Check your connection and try again."));
    } finally {
      setLoading(null);
    }
  }

  return (
    <AppShell
      title={t("Train")}
      action={
        <div className="flex items-center gap-1">
          <CoachChatButton />
          <Button asChild variant="secondary" size="icon" className="tap-target size-11">
            <Link to="/rotina/$id" params={{ id: "nova" }} aria-label={t("Create new routine")}>
              <Plus className="size-6" />
            </Link>
          </Button>
        </div>
      }
    >
      {active ? (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <p className="text-sm font-semibold text-primary">{t("Unfinished workout")}</p>
          <p className="mt-1 text-base font-semibold">{sessionLabel(active)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("Started {time} · {duration} · {sets} sets logged", {
              time: new Date(active.iniciadoEm).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              }),
              duration: formatDurationShort(sessionElapsed(active)),
              sets: sessionSetsDone(active),
            })}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-foreground/80">
            {t("Next up")}: {currentExerciseName(active)}
          </p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1 font-semibold" onClick={() => navigate({ to: "/sessao" })}>
              <Play className="mr-2 size-4" /> {t("Resume workout")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="tap-target size-11 shrink-0">
                  <Trash2 className="size-5 text-destructive" />
                  <span className="sr-only">{t("Discard workout")}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Discard this workout?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("Everything you logged in this session will be lost.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      clearActiveSession();
                      setActive(null);
                    }}
                  >
                    {t("Discard")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}


      <section>
        <div className="flex items-end justify-between">
          <h2 className="label-caps">{t("Weekly goal")}</h2>
          <p className="font-display text-sm font-semibold tabular-nums">
            <span className="text-train">{doneThisWeek}</span>
            <span className="text-muted-foreground">/{meta}</span>
          </p>
        </div>
        <div
          className="mt-3 flex gap-1"
          role="img"
          aria-label={t("{doneThisWeek} of {meta} sessions this week", { doneThisWeek, meta })}
        >
          {Array.from({ length: meta }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < doneThisWeek ? "bg-train" : "bg-surface-3",
              )}
            />
          ))}
        </div>
        {targets.volumeKg > 0 ? (
          <div className="mt-3">
            <div className="flex items-end justify-between">
              <p className="label-caps">{t("Volume target")}</p>
              <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                {formatKg(volumeThisWeek)} / {formatKg(targets.volumeKg)}
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <span
                className="block h-full rounded-full bg-train"
                style={{
                  width: `${Math.min(100, Math.round((volumeThisWeek / targets.volumeKg) * 100))}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </section>


      {coach?.restDay && !overrideRest && !active ? (
        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <p className="label-caps text-muted-foreground">{t("Coach · today")}</p>
          <p className="mt-1 font-display text-lg font-semibold">{coach.restDay.title}</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{coach.restDay.line}</p>
          <ul className="mt-3 space-y-1.5">
            {coach.restDay.why.map((w) => (
              <li key={w} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                {w}
              </li>
            ))}
          </ul>
          {nextPreview ? (
            <div className="mt-3 rounded-xl border border-border/70 bg-surface-2 p-3">
              <p className="label-caps text-muted-foreground">{t("Next session")}</p>
              <p className="mt-1 truncate text-sm font-semibold">{nextPreview.nome}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {nextPreview.primeiros.join(" · ")}
                {nextPreview.restantes > 0
                  ? ` · +${nextPreview.restantes} ${t("more")}`
                  : ""}
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                ~{nextPreview.minutos} {t("min")}
              </p>
            </div>
          ) : null}

          <Button
            variant="secondary"
            className="mt-3 h-11 w-full font-semibold"
            onClick={() => setOverrideRest(true)}
          >
            {t("Train anyway")}
          </Button>
        </section>
      ) : null}

      {coachQuery.isLoading || !coach ? (
        routines.length ? (
          <div className="mt-5 h-24 animate-pulse rounded-2xl bg-card" />
        ) : null
      ) : coach.restDay && !overrideRest && !active ? null : (
        <TodayCoachCard
          model={coach}
          swapOptions={swapOptions}
          swaps={swaps}
          onSwap={(original, replacement) =>
            setSwaps((prev) => ({ ...prev, [original]: replacement }))
          }
          onStart={(opts) => coach.routineId && startRoutine(coach.routineId, opts)}
          onNoteSaved={() => coachQuery.refetch()}
          busy={loading !== null}
        />
      )}

      <div className="mt-4">
        <CoachChatRow />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button
          className="h-14 w-full text-base font-semibold"
          disabled={(!activeChoiceId && !active) || loading !== null}
          onClick={() =>
            active ? navigate({ to: "/sessao" }) : activeChoiceId && startRoutine(activeChoiceId)
          }
        >
          <Play className="mr-1 size-5" />
          {active ? t("Resume") : t("Start")}
        </Button>
        <Button
          variant="outline"
          className="h-14 w-full text-base font-semibold"
          disabled={active !== null || loading !== null}
          onClick={startBlank}
        >
          {t("Blank")}
        </Button>
      </div>

      <h2 className="label-caps mt-8 mb-3">{t("My routines")}</h2>

      {routinesQuery.isError ? (
        <QueryError
          message={t("Could not load your routines.")}
          onRetry={() => void routinesQuery.refetch()}
        />
      ) : routinesQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : routines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-display text-sm font-semibold">{t("No routines yet.")}</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {t(
              "A routine is your list of exercises, sets and rep ranges — the coach uses it to plan each day.",
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/rotina/$id" params={{ id: "nova" }}>
                <Plus className="mr-2 size-4" /> {t("Create routine")}
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
              {t("Start from a template")}
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {orderedRoutines.map((r) => (
            <RoutineCard
              key={r.id}
              r={r}
              exercises={exercises}
              last={lastByRoutine.get(r.id)}
              insights={insights[r.id] ?? {}}
              recommended={r.id === coach?.recommendedRoutineId}
              isChoice={r.id === activeChoiceId}
              open={expanded === r.id}
              onToggle={() => setExpanded((prev) => (prev === r.id ? null : r.id))}
              active={!!active}
              loading={loading}
              onStart={(opts) => startRoutine(r.id, opts ?? {})}
              onPick={() => pickRoutine(r.id)}
              onDuplicate={() => void duplicate(r.id, r.nome)}
              t={t}
            />
          ))}
        </ul>
      )}

      {orderedRoutines.length > 0 ? (
        <Button
          variant="outline"
          className="tap-target mt-3 w-full"
          onClick={() => setTemplatesOpen(true)}
        >
          {t("Start from a template")}
        </Button>
      ) : null}



      <RoutineTemplateSheet
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        exercises={exercises}
      />
    </AppShell>
  );
}

function RoutineCard({
  r,
  exercises,
  last,
  insights,
  recommended,
  isChoice,
  open,
  onToggle,
  active,
  loading,
  onStart,
  onPick,
  onDuplicate,
  t,
}: {
  r: Routine;
  exercises: Exercise[];
  last?: Workout | undefined;
  insights: Record<string, CoachInsight>;
  recommended: boolean;
  isChoice: boolean;
  open: boolean;
  onToggle: () => void;
  active: boolean;
  loading: string | null;
  onStart: (opts?: { deload?: boolean }) => void;
  onPick: () => void;
  onDuplicate: () => void;
  t: any;
}) {
  const flags = r.exercicios
    .map((re) => {
      const insight = insights[re.exerciseId];
      const ex = exercises.find((e) => e.id === re.exerciseId);
      if (!insight || insight.severity === "info" || !ex) return null;
      return { nome: ex.nome, insight };
    })
    .filter((v): v is { nome: string; insight: CoachInsight } => v !== null)
    .sort(
      (a, b) =>
        (a.insight.severity === "warning" ? -1 : 1) - (b.insight.severity === "warning" ? -1 : 1),
    )
    .slice(0, 2);

  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border bg-card",
        isChoice ? "border-primary/40" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
          <img src={routineCover(r.id)} alt="" loading="lazy" className="size-full object-cover" />
          <div className="veil absolute inset-0" />
        </div>
        <div className="min-w-0 flex-1">
          {recommended ? (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" /> {t("Recommended today")}
            </span>
          ) : null}
          <p className="font-display text-lg font-semibold leading-tight">{r.nome}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("{count} exercises", { count: r.exercicios.length })} ·{" "}
            {t("~{minutes} min", { minutes: estimateRoutineMinutes(r) })} ·{" "}
            {last
              ? t("last {time} · {duration}", {
                  time: relativeDays(last.iniciadoEm),
                  duration: formatDurationShort(last.duracaoSeg),
                })
              : t("never trained")}
          </p>
          {flags.length && !open ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {flags.map((f) => (
                <span
                  key={f.nome}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    f.insight.severity === "warning"
                      ? "bg-warn/15 text-warn"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {t("{name} · {label}", { name: f.nome, label: t(shortLabel(f.insight)) })}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <>
          <ul className="space-y-2 border-t border-border px-3 py-3">
            {r.exercicios.map((re) => {
              const ex = exercises.find((e) => e.id === re.exerciseId);
              const insight = insights[re.exerciseId];
              return (
                <li key={re.id} className="flex items-center gap-3">
                  <ExerciseThumb grupo={ex?.grupoPrimario} nome={ex?.nome} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{ex?.nome ?? t("Exercise")}</p>
                      {insight && insight.severity !== "info" ? (
                        <InsightBadge insight={insight} />
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground/80">
                      {t("{count} sets · {min}-{max} reps", {
                        count: re.seriesAlvo,
                        min: re.repsMin,
                        max: re.repsMax,
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2 px-3 pb-4">
            <Button
              variant={isChoice ? "default" : "secondary"}
              className="h-12 w-full font-semibold"
              disabled={loading !== null || active}
              onClick={() => onStart()}
            >
              {active ? t("Resume in player") : t("Start {name}", { name: r.nome })}
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-full text-xs font-semibold text-muted-foreground"
              disabled={loading !== null || active}
              onClick={() => onStart({ deload: true })}
            >
              {t("Start lighter (deload)")}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="h-10 text-xs font-semibold"
                disabled={isChoice}
                onClick={onPick}
              >
                {isChoice ? t("Today's pick") : t("Make today's pick")}
              </Button>
              <Button asChild variant="ghost" className="h-10 text-xs font-semibold">
                <Link to="/rotina/$id" params={{ id: r.id }}>
                  <Pencil className="mr-1.5 size-3.5" /> {t("Edit routine")}
                </Link>
              </Button>
            </div>
            <Button
              variant="ghost"
              className="h-10 w-full text-xs font-semibold text-muted-foreground"
              onClick={onDuplicate}
            >
              <Copy className="mr-1.5 size-3.5" /> {t("Duplicate routine")}
            </Button>
          </div>
        </>
      ) : null}
    </li>
  );
}

function shortLabel(insight: CoachInsight): string {
  switch (insight.plateauType) {
    case "strength":
      return "Increase";
    case "single-exercise":
      return "Stalled";
    case "fatigue":
      return "Ease off";
    default:
      return insight.title;
  }
}

function InsightBadge({ insight }: { insight: CoachInsight }) {
  const t = useT();
  const isWarning = insight.severity === "warning";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("{title} — see details", { title: insight.title })}
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-semibold",
            isWarning ? "bg-warn/15 text-warn" : "bg-primary/15 text-primary",
          )}
        >
          {isWarning ? (
            <AlertTriangle className="size-3" strokeWidth={3} />
          ) : (
            <TrendingUp className="size-3" strokeWidth={3} />
          )}
          {t(shortLabel(insight))}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 text-sm">
        <p className="font-semibold">{insight.title}</p>
        <p className="mt-1 text-muted-foreground">{insight.body}</p>
      </PopoverContent>
    </Popover>
  );
}
