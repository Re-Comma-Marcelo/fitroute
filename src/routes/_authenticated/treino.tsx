import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RoutineTemplateSheet } from "@/components/RoutineTemplateSheet";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Pencil,
  Plus,
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
import { ExerciseDetailSheet } from "@/components/ExerciseDetailSheet";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HeroPage } from "@/components/forja/HeroPage";
import { GlassCard, MonoLabel } from "@/components/forja/GlassCard";
import { StatStrip } from "@/components/forja/StatStrip";
import { DayBar, type DayBarDay } from "@/components/forja/DayBar";
import { Chip, type ChipTone } from "@/components/forja/Chip";
import { IconButton } from "@/components/forja/IconButton";
import { PillButton } from "@/components/forja/PillButton";
import { Metric } from "@/components/forja/Metric";
import { trainPhoto } from "@/config/heroImages";
import { MuscleMap, routineMuscles } from "@/components/forja/MuscleMap";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { duplicateRoutine, getRoutines } from "@/lib/data/routines";
import type { Exercise, Routine, Workout, WorkoutSet } from "@/lib/types";
import { getWorkoutLog, getWorkouts } from "@/lib/data/workouts";
import {
  getFolders,
  isStandard,
  routinesInFolder,
  variationSessionsOf,
  workoutsInFolder,
} from "@/lib/data/folders";
import { FoldersSheet } from "@/components/folders/FoldersSheet";
import { FolderVariations } from "@/components/folders/FolderVariations";
import { FolderDetailSheet } from "@/components/folders/FolderDetailSheet";
import { useFolderActions } from "@/components/folders/use-folder-actions";
import {
  formatDate,
  formatDurationShort,
  formatKg,
  formatWeekdayLong,
  formatWeekdayShort,
  relativeDays,
  weightUnitLabel,
} from "@/lib/format";
import { isoDay } from "@/lib/home-metrics";
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
import { cn } from "@/lib/utils";
import { estimateRoutineMinutes } from "@/lib/routine-estimate";
import type { CoachInsight } from "@/lib/coach/types";

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
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
}

/** First sentence only; the rest lives behind "See why". */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^[\s\S]*?[.?!](?=\s|$)/);
  return (match ? match[0] : trimmed).replace(/!+/g, ".");
}

function chipTone(insight: CoachInsight): ChipTone {
  if (insight.plateauType === "strength") return "up";
  if (insight.plateauType === "fatigue") return "calm";
  return insight.severity === "warning" ? "warn" : "up";
}

const CHIP_PRIORITY: Record<ChipTone, number> = { warn: 0, calm: 1, up: 2 };

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

type DayView =
  | { kind: "today" }
  | { kind: "done"; workout: Workout; routine: Routine | undefined }
  | { kind: "planned"; routine: Routine }
  | { kind: "rest"; past: boolean; missed: Routine | undefined };

function TrainPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [folderDetail, setFolderDetail] = useState<string | null>(null);
  const { promoteRoutine, promoteSession } = useFolderActions();
  const todayIso = isoDay(new Date());
  const [selectedDay, setSelectedDay] = useState(todayIso);

  useEffect(() => {
    setActive(loadActiveSession());
    setChoice(loadTodayChoice());
  }, []);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const logQuery = useQuery({ queryKey: ["workout-log"], queryFn: getWorkoutLog });
  // Folders are optional: before the migration the list is empty and the tab
  // shows every routine, as it always did.
  const foldersQuery = useQuery({ queryKey: ["folders"], queryFn: getFolders });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const allRoutines = useMemo(() => routinesQuery.data ?? [], [routinesQuery.data]);
  const workouts = useMemo(() => workoutsQuery.data ?? [], [workoutsQuery.data]);
  const sets = useMemo(() => logQuery.data?.sets ?? [], [logQuery.data]);
  const folders = foldersQuery.data ?? [];
  const currentFolder = folders.find((f) => f.status === "atual") ?? null;
  const currentFolderId = currentFolder?.id ?? null;

  /** The current folder's routines: standard ones lead, variations sit below. */
  const folderRoutines = useMemo(
    () =>
      currentFolderId
        ? routinesInFolder(allRoutines, currentFolderId, currentFolderId)
        : allRoutines,
    [allRoutines, currentFolderId],
  );
  const routines = useMemo(() => folderRoutines.filter(isStandard), [folderRoutines]);
  const variationRoutines = folderRoutines.filter((r) => !isStandard(r));
  const folderSessions = useMemo(
    () => (currentFolderId ? workoutsInFolder(workouts, currentFolderId, currentFolderId) : []),
    [workouts, currentFolderId],
  );

  /** Recent sessions that strayed from a standard routine still on file. */
  const variationSessions = useMemo(
    () => variationSessionsOf(folderSessions, allRoutines, sets, 5),
    [folderSessions, allRoutines, sets],
  );
  const exercises = useMemo(() => exercisesQuery.data ?? [], [exercisesQuery.data]);
  const profile = profileQuery.data;

  // A pick from another folder (made before switching) no longer counts.
  const folderChoice =
    choice && (!currentFolderId || folderRoutines.some((r) => r.id === choice)) ? choice : null;
  const coachQuery = useQuery({
    queryKey: ["today-card", folderChoice ?? "recommended"],
    enabled: routines.length > 0,
    queryFn: () => getTodayCard(folderChoice),
  });
  const coach = coachQuery.data;
  const insights = coach?.insightsByRoutine ?? {};

  const meta = profile?.metaTreinosSemana ?? 4;
  const start = weekStart();
  const weekWorkouts = workouts.filter((w) => new Date(w.iniciadoEm).getTime() >= start.getTime());
  const doneThisWeek = weekWorkouts.length;
  const volumeThisWeek = Math.round(weekWorkouts.reduce((s, w) => s + w.volumeTotalKg, 0));
  const [overrideRest, setOverrideRest] = useState(false);
  const [targets, setTargets] = useState<WeeklyTargets>(EMPTY_TARGETS);
  useEffect(() => setTargets(getWeeklyTargets()), []);

  const activeChoiceId = coach?.routineId ?? routines[0]?.id;
  const todayRoutine = allRoutines.find((r) => r.id === activeChoiceId);
  const isRestToday = !!coach?.restDay && !overrideRest && !active;

  // One pass over the history instead of a filter+sort per routine card.
  const lastByRoutine = useMemo(() => {
    const map = new Map<string, Workout>();
    for (const w of workouts) {
      if (!w.routineId) continue;
      const current = map.get(w.routineId);
      if (!current || w.iniciadoEm > current.iniciadoEm) map.set(w.routineId, w);
    }
    return map;
  }, [workouts]);

  /** Most recent working weight per exercise — the planned load for a future day. */
  const lastWeight = useMemo(() => {
    const startedAt = new Map(workouts.map((w) => [w.id, w.iniciadoEm]));
    const latest = new Map<string, { at: string; kg: number }>();
    for (const s of sets) {
      if (!s.concluida || s.pesoKg <= 0) continue;
      const at = startedAt.get(s.workoutId) ?? "";
      const prev = latest.get(s.exerciseId);
      if (!prev || at > prev.at || (at === prev.at && s.pesoKg > prev.kg)) {
        latest.set(s.exerciseId, { at, kg: s.pesoKg });
      }
    }
    return latest;
  }, [workouts, sets]);

  /* ---------- the week ---------- */

  const week = useMemo(() => {
    const days: (DayBarDay & { date: Date })[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const iso = isoDay(date);
      const planned = routines.some((r) => (r.diasSemana ?? []).includes(date.getDay()));
      const done = workouts.some((w) => w.finalizadoEm && isoDay(new Date(w.iniciadoEm)) === iso);
      days.push({
        iso,
        date,
        label: formatWeekdayShort(date).replace(/\./g, "").slice(0, 2).toUpperCase(),
        training: planned || done || (iso === todayIso && !isRestToday && !!todayRoutine),
        isToday: iso === todayIso,
      });
    }
    return days;
    // start is derived from today; recompute when the data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routines, workouts, todayIso, isRestToday, todayRoutine]);

  const selected = week.find((d) => d.iso === selectedDay) ?? week.find((d) => d.isToday)!;

  const view = useMemo<DayView>(() => {
    if (selected.iso === todayIso) return { kind: "today" };
    const done = workouts
      .filter((w) => w.finalizadoEm && isoDay(new Date(w.iniciadoEm)) === selected.iso)
      .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))[0];
    if (done) {
      return {
        kind: "done",
        workout: done,
        routine: allRoutines.find((r) => r.id === done.routineId),
      };
    }
    const planned = routines.find((r) => (r.diasSemana ?? []).includes(selected.date.getDay()));
    const past = selected.iso < todayIso;
    if (planned && !past) return { kind: "planned", routine: planned };
    return { kind: "rest", past, missed: planned };
  }, [selected, todayIso, workouts, routines]);

  /** The routine the hero, stats and Start button are about. */
  const shownRoutine =
    view.kind === "today"
      ? isRestToday
        ? undefined
        : todayRoutine
      : view.kind === "planned"
        ? view.routine
        : view.kind === "done"
          ? view.routine
          : undefined;

  /** Hero photo that fits what the shown routine trains; changes per day. */
  const heroPhoto = useMemo(() => {
    if (!shownRoutine) return trainPhoto([], selected.date);
    const { primary } = routineMuscles(
      shownRoutine.exercicios.map((e) => e.exerciseId),
      exercises,
    );
    return trainPhoto(primary, selected.date);
  }, [shownRoutine, exercises, selected.date]);

  /* ---------- actions ---------- */

  async function startRoutine(
    routineId: string,
    opts: { deload?: boolean; swaps?: Record<string, string> } = {},
  ) {
    if (active) {
      navigate({ to: "/sessao" });
      return;
    }
    setLoading(routineId);
    try {
      saveTodayChoice(routineId);
      const applied = Object.fromEntries(
        Object.entries(opts.swaps ?? {}).filter(([original]) =>
          allRoutines
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

  /* ---------- intro on the photo ---------- */

  const dayName = formatWeekdayLong(selected.date);
  let introLabel: string;
  let introTitle: string;
  let introLine: string | null = null;
  let labelTone: "accent" | "text" | "effort" = "accent";

  if (view.kind === "today") {
    if (active) {
      introLabel = t("Live · in progress");
      introTitle = sessionLabel(active);
      introLine = t("Next up: {exercise}.", { exercise: currentExerciseName(active) });
      labelTone = "effort";
    } else if (isRestToday && coach?.restDay) {
      introLabel = t("Today · rest");
      introTitle = coach.restDay.title;
      introLine = firstSentence(coach.restDay.line);
    } else {
      introLabel = !coach
        ? t("Today")
        : coach.isSwitch
          ? t("Your pick today")
          : t("Recommended today");
      introTitle = coach?.routineName ?? todayRoutine?.nome ?? t("Start a workout");
      // Same calm line as a planned day; the per-exercise chips carry the details.
      introLine = todayRoutine
        ? t("{count} exercises, about {min} min.", {
            count: todayRoutine.exercicios.length,
            min: estimateRoutineMinutes(todayRoutine),
          })
        : null;
      labelTone = "effort";
    }
  } else if (view.kind === "done") {
    introLabel = t("{day} · done", { day: dayName });
    introTitle = view.routine?.nome ?? t("Free session");
    introLine = t("{duration}, {volume} moved.", {
      duration: formatDurationShort(view.workout.duracaoSeg),
      volume: formatKg(view.workout.volumeTotalKg),
    });
    labelTone = "text";
  } else if (view.kind === "planned") {
    introLabel = t("{day} · planned", { day: dayName });
    introTitle = view.routine.nome;
    introLine = t("{count} exercises, about {min} min.", {
      count: view.routine.exercicios.length,
      min: estimateRoutineMinutes(view.routine),
    });
    labelTone = "text";
  } else {
    introLabel =
      view.past && view.missed
        ? t("{day} · not logged", { day: dayName })
        : t("{day} · rest", { day: dayName });
    introTitle = view.missed?.nome ?? t("Rest day");
    introLine = view.past && view.missed ? t("Nothing logged that day.") : t("No session planned.");
    labelTone = "text";
  }

  const restOverridable = view.kind === "today" && !active && isRestToday && !!coach?.restDay;

  const top = (
    <>
      <div className="flex items-center justify-between">
        <MonoLabel onPhoto className="text-fj-text">
          {t("Train")}
        </MonoLabel>
        <div className="flex items-center gap-2">
          <IconButton asChild aria-label={t("Create new routine")}>
            <Link to="/rotina/$id" params={{ id: "nova" }}>
              <Plus className="size-5" strokeWidth={1.9} />
            </Link>
          </IconButton>
        </div>
      </div>
      <DayBar
        days={week}
        selected={selected.iso}
        onSelect={setSelectedDay}
        className="mt-[calc(var(--daybar-top)-var(--page-top)-var(--icon-button))]"
      />
    </>
  );

  const intro = (
    <div className="on-photo">
      <MonoLabel
        onPhoto
        className={cn(
          "block",
          labelTone === "accent" && "text-fj-accent",
          labelTone === "effort" && "text-fj-effort",
          labelTone === "text" && "text-fj-text-2",
        )}
      >
        {introLabel}
      </MonoLabel>
      <h1 className="h1-hero mt-2 text-fj-text">{introTitle}</h1>
      {introLine ? (
        <p className="mt-2 text-coach leading-[1.4] text-fj-text-2">{introLine}</p>
      ) : null}
      {restOverridable ? (
        <button
          type="button"
          onClick={() => setOverrideRest(true)}
          className="label-on-photo mt-2 text-meta font-medium text-fj-effort"
        >
          {t("Train anyway")}
        </button>
      ) : null}
    </div>
  );

  /* ---------- per-exercise chips for today's routine ---------- */

  const todayChips =
    view.kind === "today" && !isRestToday && todayRoutine
      ? todayRoutine.exercicios
          .map((re) => {
            const insight = insights[todayRoutine.id]?.[re.exerciseId];
            const ex = exercises.find((e) => e.id === re.exerciseId);
            if (!insight || insight.severity === "info" || !ex) return null;
            return { nome: ex.nome, insight };
          })
          .filter((v): v is { nome: string; insight: CoachInsight } => v !== null)
          // Two at most, the ones that need action first: a stall before an easy day before an increase.
          .sort((a, b) => CHIP_PRIORITY[chipTone(a.insight)] - CHIP_PRIORITY[chipTone(b.insight)])
          .slice(0, 2)
      : [];

  /* ---------- stats ---------- */

  const last = shownRoutine ? lastByRoutine.get(shownRoutine.id) : undefined;
  const ago = (() => {
    if (!last) return { value: "—" as string | number, unit: undefined as string | undefined };
    const days = Math.max(
      0,
      Math.round((Date.now() - new Date(last.iniciadoEm).getTime()) / 86400000),
    );
    return days >= 14
      ? { value: Math.floor(days / 7), unit: t("w") }
      : { value: days, unit: t("d") };
  })();

  const listRoutines = routines.filter(
    (r) => !(coach?.recommendedRoutineId && r.id === coach.recommendedRoutineId),
  );

  return (
    <AppShell hero title={t("Train")}>
      <HeroPage image={heroPhoto} top={top} intro={intro}>
        {todayChips.length ? (
          <div className="flex flex-wrap gap-2">
            {todayChips.map((c) => (
              <InsightChip key={c.nome} name={c.nome} insight={c.insight} />
            ))}
          </div>
        ) : null}

        <StatStrip
          stats={[
            { label: t("Ex."), value: shownRoutine ? shownRoutine.exercicios.length : "—" },
            {
              label: t("Time"),
              value: shownRoutine ? estimateRoutineMinutes(shownRoutine) : "—",
              unit: shownRoutine ? t("min") : undefined,
            },
            { label: t("Ago"), value: ago.value, unit: ago.unit },
            { label: t("Week"), value: `${doneThisWeek}/${meta}`, color: "accent" },
          ]}
        />
        {targets.volumeKg > 0 ? (
          <p className="-mt-1 px-1 text-meta text-fj-label">
            {t("Volume target")}: {formatKg(volumeThisWeek)} / {formatKg(targets.volumeKg)}
          </p>
        ) : null}

        {view.kind === "done" ? (
          <DoneSession workout={view.workout} sets={sets} exercises={exercises} />
        ) : null}
        {view.kind === "planned" ? (
          <PlannedSession routine={view.routine} exercises={exercises} lastWeight={lastWeight} />
        ) : null}

        {active ? (
          <ActiveBanner
            active={active}
            onResume={() => navigate({ to: "/sessao" })}
            onDiscard={() => {
              clearActiveSession();
              setActive(null);
            }}
          />
        ) : view.kind === "today" || view.kind === "planned" ? (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            {isRestToday && view.kind === "today" ? (
              <PillButton onClick={() => setOverrideRest(true)}>{t("Train anyway")}</PillButton>
            ) : (
              <PillButton
                disabled={!(shownRoutine ?? todayRoutine) || loading !== null}
                onClick={() => {
                  const id = shownRoutine?.id ?? activeChoiceId;
                  if (id) void startRoutine(id);
                }}
              >
                {t("Start workout")}
              </PillButton>
            )}
            <PillButton variant="secondary" disabled={loading !== null} onClick={startBlank}>
              {t("Blank")}
            </PillButton>
          </div>
        ) : null}

        {currentFolder ? (
          <button
            type="button"
            onClick={() => setFoldersOpen(true)}
            aria-label={t("Current folder: {name}. Open my folders", { name: currentFolder.nome })}
            className="mt-3 flex items-center justify-between gap-3 px-1 text-left"
          >
            <MonoLabel className="truncate">{currentFolder.nome}</MonoLabel>
            <span className="flex shrink-0 items-center gap-1 text-meta text-fj-label">
              {t("{count} sessions since {date}", {
                count: folderSessions.length,
                date: formatDate(currentFolder.inicioEm),
              })}
              <ChevronDown className="size-4" />
            </span>
          </button>
        ) : (
          <div className="mt-3 flex items-center justify-between px-1">
            <MonoLabel>{t("My training")}</MonoLabel>
            <span className="text-meta text-fj-label">
              {t("{count} routines", { count: routines.length })}
            </span>
          </div>
        )}

        {routinesQuery.isError ? (
          <QueryError
            message={t("Could not load your routines.")}
            onRetry={() => void routinesQuery.refetch()}
          />
        ) : routinesQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="glass h-20 animate-pulse rounded-card" />
            ))}
          </div>
        ) : routines.length === 0 ? (
          <GlassCard className="text-center">
            <p className="text-name font-medium">{t("No routines yet.")}</p>
            <p className="mt-1 text-meta text-fj-label">
              {t(
                "A routine is your list of exercises, sets and rep ranges — the coach uses it to plan each day.",
              )}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <PillButton asChild>
                <Link to="/rotina/$id" params={{ id: "nova" }}>
                  {t("Create routine")}
                </Link>
              </PillButton>
              <PillButton variant="secondary" onClick={() => setTemplatesOpen(true)}>
                {t("Start from a template")}
              </PillButton>
            </div>
          </GlassCard>
        ) : (
          <ul className="flex flex-col gap-block">
            {listRoutines.map((r) => (
              <RoutineCard
                key={r.id}
                r={r}
                exercises={exercises}
                last={lastByRoutine.get(r.id)}
                insights={insights[r.id] ?? {}}
                isChoice={r.id === activeChoiceId}
                open={expanded === r.id}
                onToggle={() => setExpanded((prev) => (prev === r.id ? null : r.id))}
                active={!!active}
                loading={loading}
                onStart={(opts) => startRoutine(r.id, opts ?? {})}
                onPick={() => pickRoutine(r.id)}
                onDuplicate={() => void duplicate(r.id, r.nome)}
              />
            ))}
          </ul>
        )}

        <FolderVariations
          routines={variationRoutines}
          sessions={variationSessions}
          allRoutines={allRoutines}
          exercises={exercises}
          disabled={loading !== null || !!active}
          onStartRoutine={(id) => void startRoutine(id)}
          onRepeatSession={(s) => void startRoutine(s.routine.id, { swaps: s.swaps })}
          onPromoteRoutine={(id) => void promoteRoutine(id)}
          onPromoteSession={(s) => void promoteSession(s)}
        />

        {routines.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            <PillButton variant="dashed" asChild>
              <Link to="/rotina/$id" params={{ id: "nova" }}>
                <Plus className="size-4" /> {t("New routine")}
              </Link>
            </PillButton>
            <PillButton variant="dashed" onClick={() => setTemplatesOpen(true)}>
              {t("From a template")}
            </PillButton>
          </div>
        ) : null}
      </HeroPage>

      <FoldersSheet
        open={foldersOpen}
        onOpenChange={setFoldersOpen}
        folders={folders}
        routines={allRoutines}
        workouts={workouts}
        onOpenFolder={(id) => {
          setFoldersOpen(false);
          setFolderDetail(id);
        }}
      />

      <FolderDetailSheet
        folderId={folderDetail}
        onOpenChange={(o) => {
          if (!o) setFolderDetail(null);
        }}
        onStartRoutine={(id, swaps) => {
          setFolderDetail(null);
          void startRoutine(id, swaps ? { swaps } : {});
        }}
        startDisabled={loading !== null || !!active}
      />

      <RoutineTemplateSheet
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        exercises={exercises}
      />
    </AppShell>
  );
}

/* ---------- day views ---------- */

function DoneSession({
  workout,
  sets,
  exercises,
}: {
  workout: Workout;
  sets: WorkoutSet[];
  exercises: Exercise[];
}) {
  const t = useT();
  const rows = useMemo(() => {
    const own = sets.filter((s) => s.workoutId === workout.id);
    const order = [
      ...new Set(own.sort((a, b) => a.ordemExercicio - b.ordemExercicio).map((s) => s.exerciseId)),
    ];
    return order.map((id) => {
      const mine = own.filter((s) => s.exerciseId === id);
      return {
        id,
        nome: exercises.find((e) => e.id === id)?.nome ?? t("Exercise"),
        done: mine.some((s) => s.concluida),
        sets: mine.filter((s) => s.concluida).length,
      };
    });
  }, [sets, workout.id, exercises, t]);

  return (
    <GlassCard>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                r.done ? "bg-fj-accent text-fj-on-accent" : "border border-fj-glass-border",
              )}
            >
              {r.done ? <Check className="size-3" /> : null}
            </span>
            <span className="min-w-0 flex-1 truncate text-body">{r.nome}</span>
            <span className="text-meta text-fj-label">{t("{count} sets", { count: r.sets })}</span>
          </li>
        ))}
      </ul>
      <PillButton variant="secondary" asChild className="mt-card w-full">
        <Link to="/resumo/$id" params={{ id: workout.id }}>
          {t("View session")}
        </Link>
      </PillButton>
    </GlassCard>
  );
}

function PlannedSession({
  routine,
  exercises,
  lastWeight,
}: {
  routine: Routine;
  exercises: Exercise[];
  lastWeight: Map<string, { at: string; kg: number }>;
}) {
  const t = useT();
  return (
    <GlassCard>
      <ul className="space-y-3">
        {[...routine.exercicios]
          .sort((a, b) => a.ordem - b.ordem)
          .map((re) => {
            const kg = lastWeight.get(re.exerciseId)?.kg;
            return (
              <li key={re.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body">
                    {exercises.find((e) => e.id === re.exerciseId)?.nome ?? t("Exercise")}
                  </span>
                  <span className="block text-meta text-fj-label">
                    {t("{count} sets · {min}-{max} reps", {
                      count: re.seriesAlvo,
                      min: re.repsMin,
                      max: re.repsMax,
                    })}
                  </span>
                </span>
                {kg ? (
                  <Metric
                    value={formatKg(kg, { unit: false })}
                    unit={weightUnitLabel()}
                    size={22}
                  />
                ) : (
                  <span className="text-meta text-fj-label">{t("new")}</span>
                )}
              </li>
            );
          })}
      </ul>
      <PillButton variant="secondary" asChild className="mt-card w-full">
        <Link to="/rotina/$id" params={{ id: routine.id }}>
          {t("View plan")}
        </Link>
      </PillButton>
    </GlassCard>
  );
}

function ActiveBanner({
  active,
  onResume,
  onDiscard,
}: {
  active: ActiveSession;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const t = useT();
  return (
    <GlassCard>
      <MonoLabel className="text-fj-effort">{t("Unfinished workout")}</MonoLabel>
      <p className="mt-2 text-name font-medium">{sessionLabel(active)}</p>
      <p className="mt-1 text-meta text-fj-label">
        {t("Started {time} · {duration} · {sets} sets logged", {
          time: new Date(active.iniciadoEm).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }),
          duration: formatDurationShort(sessionElapsed(active)),
          sets: sessionSetsDone(active),
        })}
      </p>
      <div className="mt-card flex gap-2">
        <PillButton className="flex-1" onClick={onResume}>
          {t("Resume workout")}
        </PillButton>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <IconButton className="size-button" aria-label={t("Discard workout")}>
              <Trash2 className="size-5 text-destructive" />
            </IconButton>
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
              <AlertDialogAction onClick={onDiscard}>{t("Discard")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </GlassCard>
  );
}

/* ---------- routine list ---------- */

function RoutineCard({
  r,
  exercises,
  last,
  insights,
  isChoice,
  open,
  onToggle,
  active,
  loading,
  onStart,
  onPick,
  onDuplicate,
}: {
  r: Routine;
  exercises: Exercise[];
  last?: Workout | undefined;
  insights: Record<string, CoachInsight>;
  isChoice: boolean;
  open: boolean;
  onToggle: () => void;
  active: boolean;
  loading: string | null;
  onStart: (opts?: { deload?: boolean }) => void;
  onPick: () => void;
  onDuplicate: () => void;
}) {
  const t = useT();
  const flag = r.exercicios
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
    )[0];

  return (
    <li
      className={cn(
        "glass overflow-hidden rounded-card",
        isChoice && "border-[var(--accent-tint-border)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-list text-left"
      >
        <RoutineMuscleThumb routine={r} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-name font-medium text-fj-text">{r.nome}</p>
          <p className="mt-0.5 truncate text-meta text-fj-label">
            {last
              ? `${t("{minutes} min", { minutes: estimateRoutineMinutes(r) })} · ${relativeDays(last.iniciadoEm)}`
              : t("new")}
          </p>
          {flag && !open ? (
            <Chip tone={chipTone(flag.insight)} className="mt-2" tabIndex={-1}>
              {t("{name} · {label}", { name: flag.nome, label: t(shortLabel(flag.insight)) })}
            </Chip>
          ) : null}
        </div>
        <ChevronDown
          className={cn("size-5 shrink-0 text-fj-label transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="border-t border-fj-divider">
          <RoutineDetails
            r={r}
            exercises={exercises}
            insights={insights}
            isChoice={isChoice}
            active={active}
            loading={loading}
            onStart={onStart}
            onPick={onPick}
            onDuplicate={onDuplicate}
          />
        </div>
      ) : null}
    </li>
  );
}

/** The expanded routine: every exercise (tap for how-to) and every routine action. */
function RoutineDetails({
  r,
  exercises,
  insights,
  isChoice,
  active,
  loading,
  onStart,
  onPick,
  onDuplicate,
}: {
  r: Routine;
  exercises: Exercise[];
  insights: Record<string, CoachInsight>;
  isChoice: boolean;
  active: boolean;
  loading: string | null;
  onStart: (opts?: { deload?: boolean }) => void;
  onPick: () => void;
  onDuplicate: () => void;
}) {
  const t = useT();
  const [detail, setDetail] = useState<{ id: string; nome: string } | null>(null);

  return (
    <>
      <ul className="space-y-1 px-list py-2">
        {r.exercicios.map((re) => {
          const ex = exercises.find((e) => e.id === re.exerciseId);
          const insight = insights[re.exerciseId];
          const nome = ex?.nome ?? t("Exercise");
          return (
            <li key={re.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDetail({ id: re.exerciseId, nome })}
                aria-label={t("How to perform {name}", { name: nome })}
                className="tap-target flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-2 text-left"
              >
                <ExerciseThumb
                  round
                  exerciseId={re.exerciseId}
                  grupo={ex?.grupoPrimario}
                  nome={ex?.nome}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium">{nome}</p>
                  <p className="text-meta text-fj-label">
                    {t("{count} sets · {min}-{max} reps", {
                      count: re.seriesAlvo,
                      min: re.repsMin,
                      max: re.repsMax,
                    })}
                  </p>
                </div>
              </button>
              {insight && insight.severity !== "info" ? (
                <InsightChip insight={insight} />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-fj-label" />
              )}
            </li>
          );
        })}
      </ul>

      <ExerciseDetailSheet
        exerciseId={detail?.id ?? ""}
        nome={detail?.nome ?? ""}
        open={detail !== null}
        onOpenChange={(o) => {
          if (!o) setDetail(null);
        }}
      />

      <div className="space-y-2 px-list pb-card">
        <PillButton
          variant={isChoice ? "primary" : "secondary"}
          className="w-full"
          disabled={loading !== null}
          onClick={() => onStart()}
        >
          {active ? t("Resume in player") : t("Start {name}", { name: r.nome })}
        </PillButton>
        <Button
          variant="ghost"
          className="h-10 w-full text-meta font-medium text-fj-label"
          disabled={loading !== null || active}
          onClick={() => onStart({ deload: true })}
        >
          {t("Start lighter (deload)")}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            className="h-10 text-meta font-medium"
            disabled={isChoice}
            onClick={onPick}
          >
            {isChoice ? t("Today's pick") : t("Make today's pick")}
          </Button>
          <Button asChild variant="ghost" className="h-10 text-meta font-medium">
            <Link to="/rotina/$id" params={{ id: r.id }}>
              <Pencil className="mr-1.5 size-3.5" /> {t("Edit routine")}
            </Link>
          </Button>
        </div>
        <Button
          variant="ghost"
          className="h-10 w-full text-meta font-medium text-fj-label"
          onClick={onDuplicate}
        >
          <Copy className="mr-1.5 size-3.5" /> {t("Duplicate routine")}
        </Button>
      </div>
    </>
  );
}

/** Coach status chip; tap for the full insight. */
function InsightChip({ insight, name }: { insight: CoachInsight; name?: string }) {
  const t = useT();
  const tone = chipTone(insight);
  const label = t(shortLabel(insight));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Chip tone={tone} aria-label={t("{title} — see details", { title: insight.title })}>
          {tone === "warn" ? (
            <AlertTriangle className="size-3" strokeWidth={2.5} />
          ) : tone === "up" ? (
            <TrendingUp className="size-3" strokeWidth={2.5} />
          ) : null}
          {name ? t("{name} · {label}", { name, label }) : label}
        </Chip>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 text-sm">
        <p className="font-semibold">{insight.title}</p>
        <p className="mt-1 text-muted-foreground">{insight.body}</p>
      </PopoverContent>
    </Popover>
  );
}

/** The routine's muscles on a small body map, in place of a photo thumbnail. */
function RoutineMuscleThumb({ routine }: { routine: Routine }) {
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const { primary, secondary } = useMemo(
    () =>
      routineMuscles(
        routine.exercicios.map((e) => e.exerciseId),
        exercisesQuery.data ?? [],
      ),
    [routine.exercicios, exercisesQuery.data],
  );
  return (
    <span className="grid size-thumb shrink-0 place-items-center rounded-thumb bg-white/5">
      <MuscleMap primary={primary} secondary={secondary} className="size-[88%]" />
    </span>
  );
}
