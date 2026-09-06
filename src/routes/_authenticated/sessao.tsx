import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Flame,
  Check,
  ChevronDown,
  GripVertical,
  History,
  Maximize2,
  Minimize2,
  Info,
  MoreVertical,
  Replace,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Timer,
  Trash2,
  TrendingUp,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QueryError } from "@/components/QueryError";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { hapticTick } from "@/lib/haptics";
import {
  markScrubHintShown,
  shouldShowScrubHint,
  useValueScrub,
  type ScrubOptions,
} from "@/lib/use-value-scrub";

import { buildWarmupSets } from "@/lib/warmup";
import { unlockRestAudio } from "@/lib/rest-audio";
import { bumpExerciseUsage } from "@/lib/exercise-usage";
import { SessionExercisePickerSheet } from "@/components/SessionExercisePickerSheet";
import { useRestExpiry } from "@/lib/use-rest-expiry";

import {
  formatDateLong,
  formatDuration,
  formatKg,
  formatRest,
  weightUnitLabel,
} from "@/lib/format";
import { PlateCalculatorSheet } from "@/components/PlateCalculatorSheet";
import { usesPlates } from "@/lib/plates";
import { blockLabels, hasNextInBlock } from "@/lib/supersets";
import { displayStep, fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { enqueueWorkout, isOffline } from "@/lib/offline-queue";
import {
  canAskRestPermission,
  cancelRestNotification,
  declineRestPermission,
  ensureRestPermission,
  scheduleRestNotification,
  setRestNotifyEnabled,
} from "@/lib/rest-notification";
import { clampRest, getRestDefault, setRestDefault } from "@/lib/rest-defaults";
import { toast } from "sonner";
import { undoToast } from "@/lib/undo";
import { restForExercise } from "@/lib/prescription";
import { nextSetTarget } from "@/lib/next-set";
import {
  clearActiveSession,
  currentExerciseIndex,
  filledUncheckedSets,
  loadActiveSession,
  makeSets,
  restSecondsLeft,
  restOverdueSeconds,
  saveActiveSession,
  serieLabel,
  sessionElapsed,
  sessionSetsDone,
  sessionVolume,
  isSessionPaused,
  togglePause,
  takePendingExercise,
  takePendingReplaceSlot,
  setPendingReplaceSlot,
  type ActiveExercise,
  type ActiveSession,
  type ActiveSet,
  type RestState,
  sessionLabel,
} from "@/lib/session-state";
import { incrementoPara, isSerieTempo, isSerieValida } from "@/lib/progression";
import { buildActiveExercise } from "@/lib/start-session";
import {
  getExerciseHistory,
  getPersonalRecord,
  getWorkoutLog,
  getWorkouts,
  saveWorkout,
} from "@/lib/data/workouts";
import { getRecentCoachNotes } from "@/lib/data/coach-notes";
import {
  firedToday,
  getCoachingEvents,
  getCrossTraining,
  logCoachingEvent,
} from "@/lib/data/coaching";
import { detectPerformanceDrop } from "@/lib/coach/performance-drop";
import { buildPostWorkoutMessage } from "@/lib/coach/post-workout";
import { getTargets, getWeekPlan, isoDate, totalsFor } from "@/lib/data/nutrition";
import { SessionCoachSheet } from "@/components/SessionCoachSheet";
import { ExerciseExecutionCardById } from "@/components/ExerciseExecutionCard";
import { ExerciseDetailSheet } from "@/components/ExerciseDetailSheet";

import { ProgressRing } from "@/components/ProgressRing";
import { RestIsland } from "@/components/RestIsland";
import { RpeSheet } from "@/components/RpeScale";
import { askRpeEnabled } from "@/lib/rpe";
import { useQuery } from "@tanstack/react-query";
import type { TipoSerie, WorkoutSet } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/sessao")({
  head: () => ({
    meta: pageMeta({
      title: "Workout session",
      description:
        "Log sets, weight, reps and RPE during the workout with the previous load always visible.",
      ogDescription: "Stopwatch, fixed previous load, progression suggestion and rest timer.",
    }),
  }),
  component: SessionPage,
});

const COACH_MARK_KEY = "forja.sessionCoachMarks.v1";

const REST_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 135, 150, 180, 210, 240, 300];

/**
 * One line per set: type | previous | kg | reps | RPE | check.
 * Fine weight/rep stepping lives in a long-press popover so the row stays single-line.
 * Every tap target is at least 40px and the track fits 320-430px with no horizontal scroll.
 */
const ROW_GRID =
  "grid grid-cols-[40px_minmax(0,1fr)_58px_50px_40px_44px] items-center gap-1 sm:gap-1.5";

function useTick(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

function SessionPage() {
  const t = useT();
  const typeName: Record<TipoSerie, string> = {
    aquecimento: t("Warm-up"),
    normal: t("Normal"),
    falha: t("Failure"),
    drop: t("Drop set"),
    tempo: t("Timed set"),
  };
  const navigate = useNavigate();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [ready, setReady] = useState(false);
  const [restFinished, setRestFinished] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [scrollTo, setScrollTo] = useState<number | null>(null);
  /** Key of the set just checked (drives the pop + green flash) and of the exercise just completed. */
  const [justSet, setJustSet] = useState<string | null>(null);
  // Asked right after a working set is ticked, so effort is never forgotten.
  const [rpePrompt, setRpePrompt] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const [justExercise, setJustExercise] = useState<number | null>(null);
  const [coachMark, setCoachMark] = useState<0 | 1 | 2>(0);
  const [historyFor, setHistoryFor] = useState<ActiveExercise | null>(null);
  /** Coach comment per exercise index, shown above the sets. */
  const [coachTips, setCoachTips] = useState<Record<number, string>>({});
  /** Target the app computed for the next set of an exercise. */
  const [targetTips, setTargetTips] = useState<Record<number, string>>({});
  /** Focus mode: only the current exercise is rendered, full width. */
  const [focusMode, setFocusMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const cardRefs = useRef<Record<number, HTMLElement | null>>({});
  const [drag, setDrag] = useState<{ idx: number; offset: number } | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const baseYRef = useRef(0);
  const loadedRef = useRef(false);
  const rest = session?.rest ?? null;
  const restEndsAt = rest?.endsAt ?? null;

  useTick(true);

  /** iOS Safari starts the AudioContext suspended: unlock it on the first tap. */
  const unlockAudio = useCallback(() => {
    unlockRestAudio();
  }, []);

  /** Clear the persisted rest countdown (it is consumed once and never re-fires). */
  const clearRest = useCallback((markOverdue = false) => {
    setSession((prev) => {
      if (!prev?.rest) return prev;
      const next = {
        ...prev,
        rest: null,
        restExpirouEm: markOverdue ? Date.now() : null,
      };
      saveActiveSession(next);
      return next;
    });
  }, []);

  /**
   * Prominent rest timer: sound + vibration + full-screen overlay when done.
   * The same expiry hook runs in the mini-player, so the countdown also clears
   * itself (with feedback) when you navigate to another tab while resting.
   */
  const onRestExpired = useCallback(
    (live: boolean) => {
      // Live expiry starts the "overdue" count-up; stale rest is dropped silently.
      clearRest(live);
      if (live) {
        hapticTick();
        setRestFinished(true);
      }
    },
    [clearRest],
  );

  useRestExpiry(restEndsAt, onRestExpired);
  useEffect(() => {
    if (restEndsAt) setRestFinished(false);
  }, [restEndsAt]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const loaded = loadActiveSession();
    setSession(loaded);
    setReady(true);
    if (!loaded) return;
    // Exercise chosen from library during session
    const pending = takePendingExercise();
    const slot = takePendingReplaceSlot();
    if (pending) {
      buildActiveExercise(pending)
        .then((built) => {
          if (!built) {
            toast.error(t("Could not add the exercise. Try again."));
            return;
          }
          setSession((prev) => {
            if (!prev) return prev;
            // Coming from "Replace exercise": swap in place, keeping the order.
            if (slot !== null && prev.exercicios[slot]) {
              const exercicios = prev.exercicios.map((e, i) => (i === slot ? built : e));
              const next = { ...prev, exercicios, atual: slot };
              saveActiveSession(next);
              return next;
            }
            const next = { ...prev, exercicios: [...prev.exercicios, built] };
            next.atual = next.exercicios.length - 1;
            saveActiveSession(next);
            return next;
          });
        })
        .catch(() => toast.error(t("Could not add the exercise. Try again.")));
    }
  }, []);

  const update = useCallback((mutate: (s: ActiveSession) => ActiveSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = mutate(structuredClone(prev));
      saveActiveSession(next);
      return next;
    });
  }, []);

  /**
   * Shallow immutable set patch: only the touched exercise/set objects are
   * recreated. Used by every keystroke, where a full structuredClone of the
   * session was the main source of input lag on long workouts.
   */
  const patchSet = useCallback((exIdx: number, setIdx: number, patch: Partial<ActiveSet>) => {
    setSession((prev) => {
      if (!prev) return prev;
      const ex = prev.exercicios[exIdx];
      const set = ex?.sets[setIdx];
      if (!ex || !set) return prev;
      const sets = ex.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s));
      const exercicios = prev.exercicios.map((e, i) => (i === exIdx ? { ...ex, sets } : e));
      const next = { ...prev, exercicios };
      saveActiveSession(next);
      return next;
    });
  }, []);

  const hasSession = !!session;

  /** Zero finished workouts means this is the user's first session. */
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const firstSession =
    workoutsQuery.isSuccess &&
    (workoutsQuery.data ?? []).filter((w) => w.finalizadoEm).length === 0;

  /** Keep the screen awake while training; silently ignored where unsupported. */
  useEffect(() => {
    if (!hasSession || typeof navigator === "undefined") return;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;
    type Sentinel = {
      release: () => Promise<void>;
      addEventListener?: (type: "release", cb: () => void) => void;
    };
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    const acquire = () => {
      if (document.visibilityState !== "visible") return;
      nav
        .wakeLock!.request("screen")
        .then((s) => {
          if (cancelled) {
            void s.release().catch(() => {});
            return;
          }
          sentinel = s as Sentinel;
          // The OS can drop the lock on its own; re-acquire while still visible.
          sentinel.addEventListener?.("release", () => {
            sentinel = null;
            if (!cancelled) acquire();
          });
        })
        .catch(() => {});
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [hasSession]);

  /** Warn before closing the tab while sets are typed but not confirmed. */
  const unsavedSets = session ? filledUncheckedSets(session) : 0;
  useEffect(() => {
    if (unsavedSets === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsavedSets]);

  /** Bring the newly opened exercise into view when a card auto-advances. */
  useEffect(() => {
    if (scrollTo === null) return;
    const node = cardRefs.current[scrollTo];
    setScrollTo(null);
    if (!node) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [scrollTo]);

  /** First-ever session: two dismissible coach marks, shown once per device. */
  useEffect(() => {
    if (!hasSession || typeof window === "undefined") return;
    if (!workoutsQuery.isSuccess) return;
    if (window.localStorage.getItem(COACH_MARK_KEY) === "done") return;
    if (firstSession) setCoachMark(1);
  }, [hasSession, workoutsQuery.isSuccess, firstSession]);

  const advanceCoachMark = useCallback(() => {
    setCoachMark((step) => {
      if (step === 1) return 2;
      if (typeof window !== "undefined") window.localStorage.setItem(COACH_MARK_KEY, "done");
      return 0;
    });
  }, []);

  /** Clear the transient set/exercise feedback after the animation window. */
  useEffect(() => {
    if (!justSet) return;
    const id = setTimeout(() => setJustSet(null), 450);
    return () => clearTimeout(id);
  }, [justSet]);

  useEffect(() => {
    if (justExercise === null) return;
    const id = setTimeout(() => setJustExercise(null), 600);
    return () => clearTimeout(id);
  }, [justExercise]);

  const [scrubHint] = useState(() => shouldShowScrubHint());
  useEffect(() => {
    if (scrubHint) markScrubHintShown();
  }, [scrubHint]);
  if (!ready) return <div className="min-h-screen bg-background" />;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-lg font-semibold">{t("No workout in progress")}</p>
        <Button className="h-12 w-full max-w-xs" onClick={() => navigate({ to: "/treino" })}>
          {t("Back to training")}
        </Button>
      </div>
    );
  }

  const elapsed = sessionElapsed(session);
  const paused = isSessionPaused(session);
  const restLeft = restSecondsLeft(session);
  const restOverdue = restOverdueSeconds(session);

  /**
   * Never zero: the length you saved for this exercise wins, then the routine
   * value, then a length derived from the rep range.
   */
  function restFor(ex: ActiveExercise): number {
    const saved = getRestDefault(ex.exerciseId);
    if (saved) return saved;
    return clampRest(ex.descansoSeg > 0 ? ex.descansoSeg : restForExercise(ex) || 90);
  }

  /** Ask for notification permission the first time a rest actually starts. */
  function maybeAskRestPermission() {
    if (!canAskRestPermission()) return;
    toast(t("Get a heads-up when rest ends?"), {
      duration: 12000,
      action: {
        label: t("Allow"),
        onClick: () => {
          void ensureRestPermission().then((granted) => setRestNotifyEnabled(granted));
        },
      },
      cancel: { label: t("Not now"), onClick: () => declineRestPermission() },
    });
  }

  function startRest(segundos: number) {
    const total = clampRest(segundos);
    if (total <= 0) return;
    update((s) => ({
      ...s,
      restExpirouEm: null,
      rest: { total, endsAt: Date.now() + total * 1000 },
    }));
    // Backgrounded phones stop running timers; the worker still alerts.
    scheduleRestNotification(
      total * 1000,
      t("Rest is over"),
      t("Time for your next set."),
      t("Resting"),
    );
    maybeAskRestPermission();
  }

  function clearOverdue() {
    update((s) => ({ ...s, restExpirouEm: null }));
  }

  function patchRest(mutate: (r: RestState) => RestState | null) {
    update((s) => {
      const raw = s.rest ? mutate(s.rest) : null;
      // The ring stays honest: total and deadline are clamped together.
      const next: RestState | null = raw
        ? {
            total: clampRest(raw.total),
            endsAt: Math.min(
              Date.now() + clampRest(raw.total) * 1000,
              Math.max(Date.now() + 1000, raw.endsAt),
            ),
          }
        : null;
      if (!next) cancelRestNotification();
      else
        scheduleRestNotification(
          Math.max(0, next.endsAt - Date.now()),
          t("Rest is over"),
          t("Time for your next set."),
          t("Resting"),
        );
      return { ...s, rest: next, restExpirouEm: null };
    });
  }

  /** True when a later exercise belongs to the same superset block. */
  function supersetChain(state: ActiveSession, exIdx: number): boolean {
    if (!state.routineId) return false;
    return hasNextInBlock(
      state.routineId,
      state.exercicios.map((e) => e.exerciseId),
      exIdx,
    );
  }

  /**
   * Performance drop with context: compare the set just logged with the last
   * session at the same weight, look for a plausible cause, and comment once.
   */
  async function checkPerformanceDrop(
    ex: ActiveExercise,
    exIdx: number,
    logged: { pesoKg: number; reps: number },
    workoutId: string,
  ) {
    try {
      const [history, log, cross, notes, events] = await Promise.all([
        getExerciseHistory(ex.exerciseId),
        getWorkoutLog(),
        getCrossTraining(),
        getRecentCoachNotes(5),
        getCoachingEvents(),
      ]);
      const dates = new Map(log.workouts.map((w) => [w.id, w.iniciadoEm]));
      const result = detectPerformanceDrop({
        exerciseName: ex.nome,
        current: logged,
        history,
        sessionDate: (id) => dates.get(id),
        crossTraining: cross,
        recentNotes: notes,
        currentWorkoutId: workoutId,
      });
      if (!result) return;
      setCoachTips((prev) => ({ ...prev, [exIdx]: result.message }));
      if (firedToday(events, "performance_drop", ex.exerciseId)) return;
      await logCoachingEvent({
        kind: "performance_drop",
        message: result.message,
        exerciseId: ex.exerciseId,
        workoutId,
        cause: result.cause,
        detail: {
          repsLost: result.repsLost,
          pesoKg: result.pesoKg,
          ...(result.suggestedKg ? { suggestedKg: result.suggestedKg } : {}),
        },
      });
    } catch {
      /* detection is best effort — never block logging */
    }
  }

  function toggleSet(exIdx: number, setIdx: number) {
    unlockAudio();
    let descanso = 0;
    let proximo: number | null = null;
    let completou = false;
    let logged: { pesoKg: number; reps: number } | null = null;
    let alvoLinha: string | null = null;
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      const set = ex.sets[setIdx]!;
      if (set.concluida) {
        set.concluida = false;
        return s;
      }
      // Registro em 2 toques: valores sugeridos são aceitos sem digitar nada.
      if (!set.pesoKg) set.pesoKg = String(set.sugPeso ?? set.antPeso ?? "");
      if (!set.reps) set.reps = String(set.sugReps ?? ex.repsMax);
      set.concluida = true;
      if (isSerieValida(set)) {
        logged = { pesoKg: Number(set.pesoKg) || 0, reps: Number(set.reps) || 0 };
        // The app sets the goal for the next set from what just happened.
        const target = nextSetTarget(ex, {
          pesoKg: logged.pesoKg,
          reps: logged.reps,
          rpe: Number(set.rpe) || null,
        });
        const proximaValida = ex.sets.find(
          (x, i) => i > setIdx && !x.concluida && isSerieValida(x),
        );
        if (target && proximaValida) {
          proximaValida.sugPeso = target.pesoKg;
          proximaValida.sugReps = target.reps;
          // Targets stay grey hints, never typed-in values.
          proximaValida.pesoKg = "";
          proximaValida.reps = "";
          alvoLinha = target.line;
        }
      }
      // Inside a superset you move straight to the next exercise: no rest yet.
      descanso = supersetChain(s, exIdx) ? 0 : restFor(ex);
      const todasFeitas = ex.sets.every((x) => x.concluida);
      completou = todasFeitas;
      if (todasFeitas && exIdx === s.atual && exIdx < s.exercicios.length - 1) {
        s.atual = exIdx + 1;
        proximo = s.atual;
      }
      return s;
    });
    hapticTick();
    setJustSet(`${exIdx}:${setIdx}`);
    setTargetTips((prev) => {
      const next = { ...prev };
      if (alvoLinha) next[exIdx] = alvoLinha;
      else delete next[exIdx];
      return next;
    });
    if (completou) setJustExercise(exIdx);
    if (descanso > 0) startRest(descanso);
    if (proximo !== null) setScrollTo(proximo);
    const exercise = session?.exercicios[exIdx];
    if (logged !== null && askRpeEnabled() && !exercise?.sets[setIdx]?.rpe) {
      setRpePrompt({ exIdx, setIdx });
    }
    if (logged && exercise && session) {
      void checkPerformanceDrop(exercise, exIdx, logged, session.id);
    }
  }

  function setField(
    exIdx: number,
    setIdx: number,
    field: "pesoKg" | "reps" | "rpe",
    value: string,
  ) {
    patchSet(exIdx, setIdx, { [field]: value });
  }

  function setTipo(exIdx: number, setIdx: number, tipo: TipoSerie) {
    update((s) => {
      s.exercicios[exIdx]!.sets[setIdx]!.tipoSerie = tipo;
      return s;
    });
  }

  function setExerciseRest(exIdx: number, segundos: number) {
    update((s) => {
      s.exercicios[exIdx]!.descansoSeg = segundos;
      return s;
    });
  }

  /** Context the coach reads later ("lower back felt tight"). */
  function setSetNote(exIdx: number, setIdx: number, value: string) {
    update((s) => {
      s.exercicios[exIdx]!.sets[setIdx]!.coachNote = value;
      return s;
    });
  }

  /** Swap the exercise in place, accepted from the in-workout coach chat. */
  async function swapExerciseTo(exIdx: number, exerciseId: string) {
    const current = session?.exercicios[exIdx];
    if (!current) return;
    const built = await buildActiveExercise(exerciseId, {
      seriesAlvo: current.sets.filter(isSerieValida).length,
      repsMin: current.repsMin,
      repsMax: current.repsMax,
      descansoSeg: current.descansoSeg,
    });
    if (!built) return;
    update((s) => {
      s.exercicios[exIdx] = built;
      return s;
    });
    setCoachTips((prev) => {
      const next = { ...prev };
      delete next[exIdx];
      return next;
    });
    toast.success(t("Swapped to {name}", { name: built.nome }));
  }

  /** Ramp up to the first working weight instead of hand-typing light sets. */
  function addWarmup(exIdx: number) {
    const ex = session?.exercicios[exIdx];
    if (!ex) return;
    const working = ex.sets.find((s) => isSerieValida(s));
    const target = Number(working?.pesoKg) || working?.sugPeso || 0;
    const warm = buildWarmupSets(target);
    if (!warm.length) {
      toast(t("Set a working weight first to build the warm-up."));
      return;
    }
    update((s) => {
      const target2 = s.exercicios[exIdx]!;
      target2.sets = [...warm, ...target2.sets];
      target2.sets.forEach((x, i) => (x.serieNum = i + 1));
      return s;
    });
    hapticTick();
  }

  function addSet(exIdx: number) {
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      const last = ex.sets[ex.sets.length - 1];
      const base = makeSets(1, [])[0]!;
      ex.sets.push({
        ...base,
        serieNum: ex.sets.length + 1,
        tipoSerie: "normal",
        sugPeso: last ? Number(last.pesoKg) || last.sugPeso : null,
        sugReps: last ? Number(last.reps) || last.sugReps : null,
        pesoKg: last ? last.pesoKg : "",
        reps: last ? last.reps : "",
      });
      return s;
    });
  }

  /** One tap: copy weight/reps from the last completed set into the next pending one. */
  function repeatLastSet(exIdx: number) {
    unlockAudio();
    let descanso = 0;
    let proximo: number | null = null;
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      const feitas = ex.sets.filter((x) => x.concluida);
      const ultima = feitas[feitas.length - 1];
      const proxima = ex.sets.find((x) => !x.concluida);
      if (!ultima || !proxima) return s;
      proxima.pesoKg = ultima.pesoKg;
      proxima.reps = ultima.reps;
      proxima.concluida = true;
      descanso = restFor(ex);
      const todasFeitas = ex.sets.every((x) => x.concluida);
      if (todasFeitas && exIdx === s.atual && exIdx < s.exercicios.length - 1) {
        s.atual = exIdx + 1;
        proximo = s.atual;
      }
      return s;
    });
    hapticTick();
    if (descanso > 0) startRest(descanso);
    if (proximo !== null) setScrollTo(proximo);
  }

  function removeSet(exIdx: number, setIdx: number) {
    const removed = session?.exercicios[exIdx]?.sets[setIdx];
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      ex.sets.splice(setIdx, 1);
      ex.sets.forEach((x, i) => (x.serieNum = i + 1));
      return s;
    });
    if (!removed) return;
    undoToast({
      message: t("Set removed"),
      undoLabel: t("Undo"),
      onUndo: () =>
        update((s) => {
          const ex = s.exercicios[exIdx];
          if (!ex) return s;
          ex.sets.splice(Math.min(setIdx, ex.sets.length), 0, removed);
          ex.sets.forEach((x, i) => (x.serieNum = i + 1));
          return s;
        }),
    });
  }

  function removeExercise(exIdx: number) {
    const removed = session?.exercicios[exIdx];
    const previousAtual = session?.atual ?? 0;
    update((s) => {
      s.exercicios.splice(exIdx, 1);
      s.atual = Math.min(s.atual, Math.max(0, s.exercicios.length - 1));
      return s;
    });
    if (!removed) return;
    undoToast({
      message: t("{name} removed", { name: removed.nome }),
      undoLabel: t("Undo"),
      onUndo: () =>
        update((s) => {
          s.exercicios.splice(Math.min(exIdx, s.exercicios.length), 0, removed);
          s.atual = previousAtual;
          return s;
        }),
    });
  }

  /** Reorder the remaining work without leaving the session. */
  function moveExercise(exIdx: number, dir: -1 | 1) {
    const target = exIdx + dir;
    update((s) => {
      if (target < 0 || target >= s.exercicios.length) return s;
      const exercicios = [...s.exercicios];
      const [moved] = exercicios.splice(exIdx, 1);
      exercicios.splice(target, 0, moved!);
      const atual = s.atual === exIdx ? target : s.atual === target ? exIdx : s.atual;
      return { ...s, exercicios, atual };
    });
    hapticTick();
    setScrollTo(target);
  }

  /** Same move, but silent: used while the finger is dragging a card. */
  function shiftExercise(exIdx: number, dir: -1 | 1) {
    const target = exIdx + dir;
    update((s) => {
      if (target < 0 || target >= s.exercicios.length) return s;
      const exercicios = [...s.exercicios];
      const [moved] = exercicios.splice(exIdx, 1);
      exercicios.splice(target, 0, moved!);
      const atual = s.atual === exIdx ? target : s.atual === target ? exIdx : s.atual;
      return { ...s, exercicios, atual };
    });
  }

  /** Press and hold a card's grip, then drag it up or down to reorder. */
  function beginDragHold(exIdx: number, event: React.PointerEvent<HTMLElement>) {
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    const startY = event.clientY;
    let armed = false;

    const timer = window.setTimeout(() => {
      armed = true;
      dragIdxRef.current = exIdx;
      baseYRef.current = startY;
      setDrag({ idx: exIdx, offset: 0 });
      hapticTick();
      try {
        target.setPointerCapture(pointerId);
      } catch {
        /* capture is a nicety, not a requirement */
      }
    }, 220);

    function onMove(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      if (!armed) {
        // Moving before the hold completes means the user is scrolling.
        if (Math.abs(e.clientY - startY) > 8) cleanup();
        return;
      }
      e.preventDefault();
      const idx = dragIdxRef.current;
      if (idx === null) return;
      const above = cardRefs.current[idx - 1]?.getBoundingClientRect();
      const below = cardRefs.current[idx + 1]?.getBoundingClientRect();
      if (above && e.clientY < above.top + above.height / 2) {
        shiftExercise(idx, -1);
        dragIdxRef.current = idx - 1;
        baseYRef.current = e.clientY;
        hapticTick();
        setDrag({ idx: idx - 1, offset: 0 });
        return;
      }
      if (below && e.clientY > below.top + below.height / 2) {
        shiftExercise(idx, 1);
        dragIdxRef.current = idx + 1;
        baseYRef.current = e.clientY;
        hapticTick();
        setDrag({ idx: idx + 1, offset: 0 });
        return;
      }
      setDrag({ idx, offset: e.clientY - baseYRef.current });
    }

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      dragIdxRef.current = null;
      setDrag(null);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  }

  /** Send the user to the library and swap the picked exercise into this slot. */
  function replaceExercise(exIdx: number) {
    setPendingReplaceSlot(exIdx);
    navigate({
      to: "/biblioteca",
      search: { para: "sessao", rotinaId: undefined, exercicioId: undefined },
    });
  }

  /** Add an exercise mid-session from the in-workout picker (no navigation). */
  async function addExerciseFromPicker(exerciseId: string) {
    setPickerOpen(false);
    const built = await buildActiveExercise(exerciseId).catch(() => null);
    if (!built) {
      toast.error(t("Could not add the exercise. Try again."));
      return;
    }
    bumpExerciseUsage(exerciseId);
    update((s) => {
      const exercicios = [...s.exercicios, built];
      return { ...s, exercicios, atual: exercicios.length - 1 };
    });
    hapticTick();
    setScrollTo(session ? session.exercicios.length : 0);
    toast.success(t("{name} added", { name: built.nome }));
  }

  function skipExercise(exIdx: number) {
    update((s) => {
      s.exercicios[exIdx]!.pulado = !s.exercicios[exIdx]!.pulado;
      if (s.exercicios[exIdx]!.pulado && exIdx < s.exercicios.length - 1) s.atual = exIdx + 1;
      return s;
    });
  }

  /** Every finish path goes through the single confirmation dialog. */
  function requestFinish() {
    if (!session) return;
    setConfirmFinish(true);
  }

  function finishDiscardingPending() {
    setConfirmFinish(false);
    void finalizar();
  }

  function finishIncludingPending() {
    setConfirmFinish(false);
    const target = structuredClone(session!);
    target.exercicios.forEach((ex) =>
      ex.sets.forEach((set) => {
        if (!set.concluida && set.pesoKg.trim() !== "" && set.reps.trim() !== "") {
          set.concluida = true;
        }
      }),
    );
    setSession(target);
    saveActiveSession(target);
    void finalizar(target);
  }

  async function finalizar(override?: ActiveSession) {
    const target = override ?? session;
    if (!target) return;
    setFinishing(true);
    try {
      const duracaoSeg = elapsed;
      const sets: WorkoutSet[] = [];
      let volume = 0;
      const prs: { nome: string; pesoKg: number; anteriorKg: number }[] = [];

      for (let i = 0; i < target.exercicios.length; i++) {
        const ex = target.exercicios[i]!;
        // Offline the PR lookup can fail; a missing PR must not block the save.
        const pr = await getPersonalRecord(ex.exerciseId).catch(() => 0);
        let melhor = 0;
        ex.sets.forEach((s) => {
          if (!s.concluida) return;
          const peso = Number(s.pesoKg) || 0;
          const reps = Number(s.reps) || 0;
          // Warm-up is logged but does not count toward volume.
          if (isSerieValida(s)) {
            volume += peso * reps;
            melhor = Math.max(melhor, peso);
          }
          sets.push({
            id: `${target.id}_${i}_${s.serieNum}`,
            workoutId: target.id,
            exerciseId: ex.exerciseId,
            ordemExercicio: i,
            serieNum: s.serieNum,
            tipoSerie: s.tipoSerie,
            pesoKg: peso,
            reps,
            concluida: true,
            ...(s.rpe ? { rpe: Number(s.rpe) } : {}),
            ...(s.coachNote?.trim() ? { coachNote: s.coachNote.trim() } : {}),
          });
        });
        if (melhor > pr && melhor > 0) prs.push({ nome: ex.nome, pesoKg: melhor, anteriorKg: pr });
      }

      // Per-exercise notes would otherwise be dropped: fold them into the
      // workout note so they show up on the workout detail screen.
      const exerciseNotes = target.exercicios
        .filter((ex) => ex.notas.trim() !== "")
        .map((ex) => `${ex.nome}: ${ex.notas.trim()}`);
      const notas = [target.notas.trim(), ...exerciseNotes].filter(Boolean).join("\n");

      const workout = {
        id: target.id,
        ...(target.routineId ? { routineId: target.routineId } : {}),
        iniciadoEm: target.iniciadoEm,
        finalizadoEm: new Date().toISOString(),
        duracaoSeg,
        volumeTotalKg: Math.round(volume),
        notas,
        origem: (target.routineId ? "rotina" : "branco") as "rotina" | "branco",
      };

      // Offline: queue it locally and let the app sync when the connection is back.
      if (isOffline()) {
        enqueueWorkout(workout, sets);
        toast.success(t("Saved on this device — it will sync when you are back online."));
      } else {
        await saveWorkout(workout, sets);
      }

      // Post-workout coach message: recovery + food that fits the open macros.
      let coachMessage = "";
      try {
        const [log, targets, plan] = await Promise.all([
          getWorkoutLog(),
          getTargets(),
          getWeekPlan(),
        ]);
        const recent = log.workouts.filter((w) => w.finalizadoEm && w.id !== target.id).slice(-8);
        const avgVolume = recent.length
          ? recent.reduce((sum, w) => sum + w.volumeTotalKg, 0) / recent.length
          : 0;
        const avgDuration = recent.length
          ? recent.reduce((sum, w) => sum + w.duracaoSeg, 0) / recent.length
          : 0;
        const built = buildPostWorkoutMessage({
          volumeKg: workout.volumeTotalKg,
          durationSeg: duracaoSeg,
          avgVolumeKg: avgVolume,
          avgDurationSeg: avgDuration,
          targets,
          consumed: totalsFor(plan[isoDate(new Date())]),
        });
        coachMessage = built.message;
        await logCoachingEvent({
          kind: "post_workout",
          message: built.message,
          workoutId: target.id,
          detail: { intensity: built.intensity },
        });
      } catch {
        /* the summary still works without the coach message */
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `forja.resumo.${target.id}`,
          JSON.stringify({
            prs,
            series: sets.length,
            ...(coachMessage ? { coach: coachMessage } : {}),
          }),
        );
      }
      cancelRestNotification();
      clearActiveSession();
      navigate({ to: "/resumo/$id", params: { id: target.id } });
    } catch {
      // Keep the session in localStorage so nothing is lost.
      toast.error(
        t("Could not save the workout. It is still stored on this device — try again in a moment."),
      );
    } finally {
      setFinishing(false);
    }
  }

  const focusIdx = currentExerciseIndex(session);
  const setsDone = sessionSetsDone(session);

  const setsTotal = session.exercicios
    .filter((ex) => !ex.pulado)
    .reduce((total, ex) => total + ex.sets.filter(isSerieValida).length, 0);
  const volumeAtual = sessionVolume(session);
  const pendCount = filledUncheckedSets(session);
  /** Exactly which sets the finish dialog would drop, so the choice is never blind. */
  const pendingList = session.exercicios.flatMap((ex, exIdx) =>
    ex.sets
      .map((set, setIdx) => ({ set, setIdx }))
      .filter(({ set }) => !set.concluida && set.pesoKg.trim() !== "" && set.reps.trim() !== "")
      .map(({ set, setIdx }) => ({
        key: `${exIdx}:${setIdx}`,
        nome: `${ex.nome} · ${serieLabel(ex.sets, setIdx)}`,
        detalhe: `${formatKg(Number(set.pesoKg) || 0)} kg × ${Number(set.reps) || 0}`,
      })),
  );

  const currentExercise = session.exercicios[focusIdx];
  const currentRest = currentExercise ? restFor(currentExercise) : 90;
  const blockLabel: Record<string, string> = session.routineId
    ? blockLabels(
        session.routineId,
        session.exercicios.map((e) => e.exerciseId),
      )
    : {};

  return (
    <div className="min-h-screen bg-background pb-44">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex max-w-md items-center gap-1 px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            aria-label={t("Collapse session")}
            onClick={() => navigate({ to: "/treino" })}
          >
            <ChevronDown className="size-6" />
          </Button>
          <h1 className="flex-1 truncate text-base font-semibold">{sessionLabel(session)}</h1>
          <ProgressRing done={setsDone} total={setsTotal} />
          <Button
            variant="ghost"
            size="icon"
            className={cn("tap-target", focusMode && "text-train")}
            aria-label={focusMode ? t("Show all exercises") : t("Focus on current exercise")}
            aria-pressed={focusMode}
            onClick={() => {
              setFocusMode((v) => !v);
              hapticTick();
            }}
          >
            {focusMode ? <Minimize2 className="size-6" /> : <Maximize2 className="size-6" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="tap-target text-info"
            aria-label={restLeft > 0 ? t("Restart rest") : t("Start rest")}
            onClick={() => {
              hapticTick();
              startRest(currentRest);
            }}
          >
            <Timer className="size-6" />
          </Button>
        </div>
        <dl className="mx-auto grid max-w-md grid-cols-3 border-t border-border">
          <div className="flex items-center justify-center gap-1 px-1 py-2">
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Duration")}
              </dt>
              <dd
                className={cn(
                  "font-mono text-lg font-semibold tabular-nums",
                  paused && "text-muted-foreground",
                )}
              >
                {formatDuration(elapsed)}
              </dd>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="tap-target shrink-0"
              aria-label={paused ? t("Resume clock") : t("Pause clock")}
              aria-pressed={paused}
              onClick={() => update((s) => togglePause(s))}
            >
              {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
            </Button>
          </div>
          <HeaderStat label={t("Volume")} value={formatKg(Math.round(volumeAtual))} />
          <HeaderStat label={t("Sets")} value={String(setsDone)} />
        </dl>
        {paused ? (
          <p className="mx-auto max-w-md px-3 pb-2 text-center text-[11px] font-semibold text-muted-foreground">
            {t("Clock paused — logging still works.")}
          </p>
        ) : null}
        {session.exercicios.length > 1 ? (
          <nav
            aria-label={t("Jump to exercise")}
            className="mx-auto max-w-md overflow-x-auto border-t border-border px-2 py-1.5"
          >
            <ul className="flex items-center gap-1.5">
              {session.exercicios.map((ex, exIdx) => {
                const validas = ex.sets.filter(isSerieValida).length;
                const feitas = ex.sets.filter((s) => s.concluida && isSerieValida(s)).length;
                const done = validas > 0 && feitas >= validas;
                const active = exIdx === session.atual;
                return (
                  <li key={`chip-${ex.exerciseId}-${exIdx}`}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => {
                        update((s) => ({ ...s, atual: exIdx }));
                        setScrollTo(exIdx);
                      }}
                      className={cn(
                        "tap-target flex h-8 max-w-[8.5rem] items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                            ? "bg-success/15 text-success"
                            : "bg-surface-3 text-muted-foreground",
                        ex.pulado && "opacity-50 line-through",
                      )}
                    >
                      {done && !active ? <Check className="size-3" strokeWidth={3} /> : null}
                      <span className="truncate">{ex.nome}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-md space-y-3 px-3 py-3">
        {focusMode ? (
          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-train">
            {t("Focus mode · one exercise at a time")}
          </p>
        ) : null}
        {session.exercicios.map((ex, exIdx) => {
          const dragging = drag?.idx === exIdx;
          // Focus mode hides everything except the exercise you are on.
          if (focusMode && exIdx !== focusIdx) return null;
          const aberto = focusMode ? true : exIdx === session.atual && !dragging;

          const feitas = ex.sets.filter((s) => s.concluida && isSerieValida(s)).length;
          const validas = ex.sets.filter(isSerieValida).length;
          const exDone = validas > 0 && feitas >= validas;
          // Last completed valid set — shown in the collapsed header so you
          // can recall where you are without expanding the card.
          const lastDone = [...ex.sets].filter((s) => s.concluida && isSerieValida(s)).pop();
          const lastKg = lastDone ? Number(lastDone.pesoKg) || 0 : 0;
          const lastLabel =
            lastKg > 0 ? `${formatKg(lastKg)} kg × ${Number(lastDone!.reps) || 0}` : null;
          return (
            <section
              key={ex.exerciseId + exIdx}
              ref={(node) => {
                cardRefs.current[exIdx] = node;
              }}
              style={{
                scrollMarginTop: "7rem",
                ...(dragging
                  ? { transform: `translateY(${drag.offset}px) scale(1.02)`, zIndex: 30 }
                  : null),
              }}
              className={cn(
                "relative rounded-xl border bg-card",
                aberto ? "border-primary/50" : "border-border",
                ex.pulado && "opacity-50",
                dragging && "border-primary shadow-lg",
                drag && !dragging && "opacity-60",
              )}
            >
              <div className="flex items-start gap-1 p-3">
                <button
                  type="button"
                  aria-label={t("Hold and drag to reorder")}
                  title={t("Hold and drag to reorder")}
                  onPointerDown={(e) => beginDragHold(exIdx, e)}
                  onContextMenu={(e) => e.preventDefault()}
                  className="-ml-1 flex h-9 w-6 shrink-0 touch-none select-none items-center justify-center text-muted-foreground"
                >
                  <GripVertical className="size-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    aria-expanded={aberto}
                    className="flex w-full items-start gap-2 text-left"
                    onClick={() => update((s) => ({ ...s, atual: aberto ? -1 : exIdx }))}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-base font-semibold leading-tight">
                        {blockLabel[ex.exerciseId] ? (
                          <span className="shrink-0 rounded-md bg-train/15 px-1.5 py-0.5 text-[11px] font-bold text-train">
                            {blockLabel[ex.exerciseId]}
                          </span>
                        ) : null}
                        <span className="min-w-0 truncate">{ex.nome}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                        <span className="truncate tabular-nums">
                          {t("{count}/{total} sets · target {min}-{max} reps", {
                            count: feitas,
                            total: validas,
                            min: ex.repsMin,
                            max: ex.repsMax,
                          })}
                        </span>

                        {!aberto && lastLabel ? (
                          <span className="shrink-0 tabular-nums text-foreground/70">
                            · {lastLabel}
                          </span>
                        ) : null}

                        {exDone ? (
                          <Check
                            className="size-3.5 shrink-0 text-success"
                            strokeWidth={3}
                            aria-label={t("Exercise complete")}
                          />
                        ) : null}
                      </p>
                      <div
                        className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-surface-3"
                        role="img"
                        aria-label={t("{done} of {total} sets completed", {
                          done: feitas,
                          total: validas,
                        })}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full motion-safe:transition-all motion-safe:duration-300",
                            justExercise === exIdx ? "bg-success" : "bg-train",
                          )}
                          style={{ width: `${validas > 0 ? (feitas / validas) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <ChevronDown
                      className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${
                        aberto ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <RestPicker
                      value={restFor(ex)}
                      onChange={(segundos) => setExerciseRest(exIdx, segundos)}
                    />
                    {usesPlates(ex.equipamento) ? (
                      <PlateCalculatorSheet
                        targetKg={
                          Number(
                            ex.sets.find((s) => !s.concluida)?.pesoKg ||
                              ex.sets.find((s) => !s.concluida)?.sugPeso ||
                              ex.sets[0]?.pesoKg ||
                              0,
                          ) || 0
                        }
                      />
                    ) : null}
                    {ex.sugestao?.aumentou ? <ProgressBadge motivo={ex.sugestao.motivo} /> : null}
                    <ExerciseInfoButton exerciseId={ex.exerciseId} nome={ex.nome} />
                    <SessionCoachSheet
                      exerciseId={ex.exerciseId}
                      exerciseName={ex.nome}
                      sessionExerciseIds={session.exercicios.map((e) => e.exerciseId)}
                      workoutId={session.id}
                      onSwap={(picked) => void swapExerciseTo(exIdx, picked.id)}
                    />
                  </div>
                  {aberto ? (
                    <ExerciseExecutionCardById
                      exerciseId={ex.exerciseId}
                      nome={ex.nome}
                      className="mt-2"
                    />
                  ) : null}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="tap-target"
                      aria-label={t("Exercise options")}
                    >
                      <MoreVertical className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => skipExercise(exIdx)}>
                      <SkipForward className="mr-2 size-4" />
                      {ex.pulado ? t("Resume exercise") : t("Skip exercise")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addSet(exIdx)}>
                      <Plus className="mr-2 size-4" /> {t("Add set")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addWarmup(exIdx)}>
                      <Flame className="mr-2 size-4" /> {t("Add warm-up sets")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={exIdx === 0}
                      onClick={() => moveExercise(exIdx, -1)}
                    >
                      <ArrowUp className="mr-2 size-4" /> {t("Move up")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={exIdx === session.exercicios.length - 1}
                      onClick={() => moveExercise(exIdx, 1)}
                    >
                      <ArrowDown className="mr-2 size-4" /> {t("Move down")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => replaceExercise(exIdx)}>
                      <Replace className="mr-2 size-4" /> {t("Replace exercise")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHistoryFor(ex)}>
                      <History className="mr-2 size-4" /> {t("Exercise history")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => removeExercise(exIdx)}
                    >
                      <Trash2 className="mr-2 size-4" /> {t("Remove exercise")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {aberto ? (
                <div className="px-3 pb-3">
                  <ExercisePlanLine
                    target={targetTips[exIdx] ?? ex.prescricao?.line}
                    warmup={targetTips[exIdx] ? undefined : ex.prescricao?.warmup?.line}
                    note={coachTips[exIdx]}
                  />

                  <div
                    className={`${ROW_GRID} pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`}
                  >
                    <span className="text-center">{t("Set")}</span>
                    <span className="truncate">{t("Previous")}</span>
                    <span className="text-center">{weightUnitLabel()}</span>
                    <span className="text-center">{t("Reps")}</span>
                    <span className="text-center">{t("RPE")}</span>
                    <span />
                  </div>
                  {scrubHint && exIdx === 0 ? (
                    <p className="pb-1.5 text-[11px] leading-snug text-muted-foreground">
                      {t(
                        "Tip: hold a number and slide up or down — slide further and it jumps 10 or 20 at a time.",
                      )}

                    </p>
                  ) : null}
                  <ul className="divide-y divide-border/60 border-y border-border/60">
                    {ex.sets.map((set, setIdx) => (
                      <Fragment key={set.id}>
                        <SetRow
                          set={set}
                          label={serieLabel(ex.sets, setIdx)}
                          exercise={ex}
                          onTipo={(tipo) => setTipo(exIdx, setIdx, tipo)}
                          onRemove={() => removeSet(exIdx, setIdx)}
                          onField={(field, value) => setField(exIdx, setIdx, field, value)}
                          onCheck={() => toggleSet(exIdx, setIdx)}
                          justDone={justSet === `${exIdx}:${setIdx}`}
                          typeName={typeName}
                          t={t}
                        />
                        {/* Optional context for the coach, kept out of sight until asked for. */}
                        {set.concluida ? (
                          <li className="border-0 px-0.5 pb-1.5">
                            <SetNoteField
                              value={set.coachNote ?? ""}
                              onChange={(value) => setSetNote(exIdx, setIdx, value)}
                            />
                          </li>
                        ) : null}
                      </Fragment>
                    ))}
                  </ul>

                  {coachMark === 1 && exIdx === session.atual ? (
                    <CoachMark
                      text={t("Adjust weight and reps, then tap ✓ when the set is done")}
                      onDismiss={advanceCoachMark}
                      t={t}
                    />
                  ) : null}
                  <div className="mt-1 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="h-10 px-2 text-xs font-semibold text-muted-foreground"
                      onClick={() => addSet(exIdx)}
                    >
                      <Plus className="mr-1 size-3.5" /> {t("Add set")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10 px-2 text-xs font-semibold text-info"
                      disabled={
                        !ex.sets.some((s) => s.concluida) || !ex.sets.some((s) => !s.concluida)
                      }
                      onClick={() => repeatLastSet(exIdx)}
                    >
                      <RotateCcw className="mr-1 size-3.5" /> {t("Repeat set")}
                    </Button>
                  </div>

                  <CollapsibleNote
                    value={ex.notas}
                    onChange={(value) =>
                      update((s) => {
                        s.exercicios[exIdx]!.notas = value;
                        return s;
                      })
                    }
                    placeholder={t("Exercise note (e.g., closer grip)")}
                  />

                  {/* Rhythm between exercises: finish one, move to the next. */}
                  {exDone && exIdx < session.exercicios.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = exIdx + 1;
                        update((s) => ({ ...s, atual: next }));
                        setScrollTo(next);
                        hapticTick();
                      }}
                      className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2.5 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-success">
                          {t("Exercise done")}
                        </span>
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {t("Next: {name}", {
                            name: session.exercicios[exIdx + 1]?.nome ?? "",
                          })}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-background">
                        {t("Next")}
                      </span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}

        <Button
          variant="secondary"
          className="h-12 w-full font-semibold"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="mr-1 size-5" /> {t("Add exercise")}
        </Button>

        <CollapsibleNote
          value={session.notas}
          onChange={(value) => update((s) => ({ ...s, notas: value }))}
          placeholder={t("Session note")}
        />
      </main>

      <SessionExercisePickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(exercise) => void addExerciseFromPicker(exercise.id)}
      />

      {rpePrompt ? (
        <RpeSheet
          open
          onOpenChange={(next) => {
            if (!next) setRpePrompt(null);
          }}
          exerciseName={session.exercicios[rpePrompt.exIdx]?.nome ?? ""}
          setLabel={serieLabel(session.exercicios[rpePrompt.exIdx]?.sets ?? [], rpePrompt.setIdx)}
          value={session.exercicios[rpePrompt.exIdx]?.sets[rpePrompt.setIdx]?.rpe ?? ""}
          onSave={(value) => {
            setField(rpePrompt.exIdx, rpePrompt.setIdx, "rpe", value);
            setRpePrompt(null);
          }}
          onSkip={() => setRpePrompt(null)}
        />
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur">
        {/* The rest bar lives inside the bottom bar, so it can never be hidden behind it. */}
        {rest || restOverdue > 0 ? (
          <div className="mx-auto max-w-md px-3 pt-2">
            <RestIsland
              total={rest?.total ?? 0}
              left={restLeft}
              overdue={restOverdue}
              label={currentExercise?.nome}
              onAdd={() => patchRest((r) => ({ total: r.total + 15, endsAt: r.endsAt + 15000 }))}
              onSubtract={() =>
                patchRest((r) => ({ total: r.total - 15, endsAt: r.endsAt - 15000 }))
              }
              onSkip={() => (rest ? patchRest(() => null) : clearOverdue())}
              onOpenSettings={() => startRest(currentRest)}
              onPreset={(segundos) => {
                hapticTick();
                startRest(segundos);
              }}
              onSaveDefault={() => {
                const segundos = clampRest(rest?.total ?? currentRest);
                if (currentExercise) {
                  setRestDefault(currentExercise.exerciseId, segundos);
                  setExerciseRest(focusIdx, segundos);
                }
                hapticTick();
                toast.success(t("Saved as this exercise's rest"));
              }}
            />
          </div>
        ) : (
          /* Idle state: the rest length is always visible, one tap from starting. */
          <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-3 pt-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Timer className="size-4 text-info" />
              {t("Rest")} {formatRest(currentRest)}
            </span>
            <Button
              variant="ghost"
              className="h-9 px-3 text-xs font-semibold text-info"
              onClick={() => {
                hapticTick();
                startRest(currentRest);
              }}
            >
              {t("Start rest")}
            </Button>
          </div>
        )}
        <div className="mx-auto max-w-md px-3 py-3">
          {coachMark === 2 ? (
            <CoachMark
              text={t("When everything is done, finish here to save your workout")}
              onDismiss={advanceCoachMark}
              t={t}
            />
          ) : null}
          <Button
            className="h-14 w-full flex-col gap-0 text-base font-semibold leading-tight"
            disabled={finishing}
            onClick={requestFinish}
          >
            <span>{t("Finish workout")}</span>
            <span className="text-[11px] font-medium opacity-80">
              {t("{sets} sets · {volume} kg", {
                sets: setsDone,
                volume: formatKg(Math.round(volumeAtual)),
              })}
            </span>
          </Button>
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* One dialog for every finish path, so no two modals swap in the same tick. */}
      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendCount > 0
                ? t("{count} sets filled in but not checked — include them?", { count: pendCount })
                : t("Finish this workout?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendCount > 0
                ? t("Unchecked sets are discarded when the workout is saved.")
                : t("{count} completed sets will be saved.", { count: setsDone })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendCount > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface-2 p-2 text-xs">
              {pendingList.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">{item.nome}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">
                    {item.detalhe}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel className="tap-target">{t("Keep training")}</AlertDialogCancel>
            {pendCount > 0 ? (
              <>
                <Button variant="outline" className="tap-target" onClick={finishDiscardingPending}>
                  {t("Discard")}
                </Button>
                <AlertDialogAction className="tap-target" onClick={finishIncludingPending}>
                  {t("Include")}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction className="tap-target" onClick={finishDiscardingPending}>
                {t("Finish")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExerciseHistorySheet exercise={historyFor} onClose={() => setHistoryFor(null)} />

      {restFinished ? <RestFinishedOverlay onResume={() => setRestFinished(false)} /> : null}
    </div>
  );
}

/** Enter jumps to the next numeric field so a whole set is one thumb flow. */
function focusNextField(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const fields = Array.from(document.querySelectorAll<HTMLInputElement>("input.numeric-field"));
  const next = fields[fields.indexOf(event.currentTarget) + 1];
  next?.focus();
  next?.select();
}

/** Last loads for one exercise, opened from the exercise menu during a session. */
function ExerciseHistorySheet({
  exercise,
  onClose,
}: {
  exercise: ActiveExercise | null;
  onClose: () => void;
}) {
  const t = useT();
  const { unit } = useWeightUnit();
  const historyQuery = useQuery({
    queryKey: ["exercise-history", exercise?.exerciseId],
    enabled: !!exercise,
    queryFn: () => getExerciseHistory(exercise!.exerciseId),
  });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const dates = new Map((workoutsQuery.data ?? []).map((w) => [w.id, w.iniciadoEm]));

  const byWorkout = new Map<string, WorkoutSet[]>();
  for (const set of historyQuery.data ?? []) {
    const list = byWorkout.get(set.workoutId) ?? [];
    list.push(set);
    byWorkout.set(set.workoutId, list);
  }
  const sessions = [...byWorkout.entries()]
    .sort((a, b) => (dates.get(b[0]) ?? "").localeCompare(dates.get(a[0]) ?? ""))
    .slice(0, 6);

  return (
    <Sheet open={exercise !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{exercise?.nome}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-8">
          {historyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("Loading…")}</p>
          ) : historyQuery.isError ? (
            <QueryError onRetry={() => void historyQuery.refetch()} />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No history for this exercise yet — today is the baseline.")}
            </p>
          ) : (
            sessions.map(([workoutId, sets]) => (
              <div key={workoutId} className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  {dates.get(workoutId) ? formatDateLong(dates.get(workoutId)!) : t("Session")}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {sets
                    .slice()
                    .sort((a, b) => a.serieNum - b.serieNum)
                    .map((set) => (
                      <li key={set.id} className="text-sm tabular-nums">
                        <span className="text-muted-foreground">{set.serieNum}.</span>{" "}
                        {toDisplayWeight(set.pesoKg, unit)} {unit} x {set.reps}
                        {set.rpe ? (
                          <span className="text-muted-foreground">
                            {" "}
                            {t("@ {rpe} rpe", { rpe: set.rpe })}
                          </span>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HeaderStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`text-lg font-semibold tabular-nums ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function ProgressBadge({ motivo }: { motivo: string }) {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="tap-target inline-flex h-9 items-center gap-1 rounded-full bg-primary/15 px-3 text-xs font-semibold text-primary"
        >
          <TrendingUp className="size-3.5" strokeWidth={3} />
          {t("Weight increased")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 text-sm">
        {motivo}
      </PopoverContent>
    </Popover>
  );
}

function RestPicker({ value, onChange }: { value: number; onChange: (segundos: number) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="tap-target inline-flex h-9 items-center gap-1 rounded-full bg-info/15 px-3 text-xs font-semibold text-info"
        >
          <Timer className="size-3.5" strokeWidth={2.6} />
          {t("Rest: {time}", { time: formatRest(value) })}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Rest for this exercise")}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {REST_OPTIONS.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => {
                onChange(op);
                setOpen(false);
              }}
              className={`tap-target rounded-lg border px-1 text-sm font-semibold ${
                op === value ? "border-info bg-info text-info-foreground" : "border-border bg-card"
              }`}
            >
              {formatRest(op)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PsePicker({
  value,
  onChange,
  exerciseName,
  setLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  exerciseName: string;
  setLabel: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={value ? `RPE ${value}` : t("Set RPE (optional)")}
        className={`tap-target h-10 w-full rounded-lg border text-[11px] font-semibold tabular-nums ${
          value
            ? "border-info/60 bg-info/15 text-info"
            : "border-border bg-muted text-muted-foreground"
        }`}
      >
        {value || t("RPE")}
      </button>
      <RpeSheet
        open={open}
        onOpenChange={setOpen}
        exerciseName={exerciseName}
        setLabel={setLabel}
        value={value}
        onSave={onChange}
        onSkip={() => setOpen(false)}
      />
    </>
  );
}

function SetRow({
  set,
  label,
  exercise,
  onField,
  onCheck,
  onTipo,
  onRemove,
  typeName,
  justDone,
  t,
}: {
  set: ActiveSet;
  justDone?: boolean;
  label: string;
  exercise: ActiveExercise;
  onField: (field: "pesoKg" | "reps" | "rpe", value: string) => void;
  onCheck: () => void;
  onTipo: (tipo: TipoSerie) => void;
  onRemove: () => void;
  typeName: Record<TipoSerie, string>;
  t: any;
}) {
  const aquecimento = !isSerieValida(set);
  const tempo = isSerieTempo(set);
  const passoKg = incrementoPara(exercise.equipamento);
  const { unit } = useWeightUnit();
  /** Weight is always stored in kg; the field shows the user's unit. */
  const [draft, setDraft] = useState<string | null>(null);
  const shownWeight =
    draft ??
    (set.pesoKg === ""
      ? ""
      : String(Math.round(toDisplayWeight(Number(set.pesoKg) || 0, unit) * 100) / 100));
  /** Target the app decided for this set, shown grey until you type or accept it. */
  const alvoPeso =
    set.sugPeso !== null && set.sugPeso > 0
      ? String(Math.round(toDisplayWeight(set.sugPeso, unit) * 100) / 100)
      : "";
  const alvoReps = set.sugReps !== null && set.sugReps > 0 ? String(set.sugReps) : "";

  function writeWeight(displayValue: string) {
    setDraft(displayValue);
    if (displayValue.trim() === "") {
      onField("pesoKg", "");
      return;
    }
    const parsed = Number(displayValue.replace(",", "."));
    if (Number.isNaN(parsed)) return;
    onField("pesoKg", String(Math.round(fromDisplayWeight(parsed, unit) * 1000) / 1000));
  }

  function stepKg(deltaKg: number) {
    const atualKg = Number(set.pesoKg) || set.sugPeso || set.antPeso || 0;
    const step = displayStep(deltaKg, unit);
    const nextDisplay = Math.max(
      0,
      Math.round((toDisplayWeight(atualKg, unit) + step) * 100) / 100,
    );
    setDraft(String(nextDisplay));
    onField("pesoKg", String(Math.round(fromDisplayWeight(nextDisplay, unit) * 1000) / 1000));
  }

  function stepReps(delta: number) {
    const atual = Number(set.reps) || set.sugReps || 0;
    const next = Math.max(0, Math.round(atual + delta));
    onField("reps", String(next));
  }

  /** Tapping an empty field accepts the grey target so you only edit what changed. */
  function acceptWeightTarget() {
    if (shownWeight === "" && alvoPeso !== "") writeWeight(alvoPeso);
  }
  function acceptRepsTarget() {
    if (set.reps === "" && alvoReps !== "") onField("reps", alvoReps);
  }

  return (
    <li
      className={cn(
        "px-0.5 py-1",
        set.concluida ? "bg-primary/10" : "",
        justDone ? "set-flash" : "",
      )}
    >
      <div className={ROW_GRID}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "tap-target flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-semibold",
                aquecimento && "text-warn",
                tempo && "text-info",
              )}
              aria-label={t("Set {label} — type {type}", { label, type: typeName[set.tipoSerie] })}
            >
              {tempo ? `${label}s` : label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(["aquecimento", "normal", "falha", "drop", "tempo"] as TipoSerie[]).map((tipo) => (
              <DropdownMenuItem key={tipo} onClick={() => onTipo(tipo)}>
                {typeName[tipo]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem className="text-destructive" onClick={onRemove}>
              <Trash2 className="mr-2 size-4" /> {t("Remove set")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="min-w-0 truncate text-[11px] font-semibold tabular-nums text-muted-foreground">
          {set.antPeso !== null && set.antReps !== null
            ? `${formatKg(set.antPeso)}×${set.antReps}${set.antRpe ? ` @${set.antRpe}` : ""}`
            : "—"}
        </span>

        <NumberField
          value={shownWeight}
          onChange={writeWeight}
          onBlur={() => setDraft(null)}
          onFocus={acceptWeightTarget}
          onStep={(direction, big) => stepKg(direction * (big ? passoKg * 4 : passoKg))}
          scrub={{
            getValue: () =>
              toDisplayWeight(Number(set.pesoKg) || set.sugPeso || set.antPeso || 0, unit),
            stepFor: (tier) =>
              displayStep(tier === "coarsest" ? 20 : tier === "coarse" ? 10 : passoKg, unit),
            onValue: (value) => writeWeight(String(value)),
            formatValue: (value, delta) =>
              `${formatKg(value)} ${weightUnitLabel()}${delta ? ` ${formatSignedStep(delta)}` : ""}`,
            formatStep: (step) => t("step {step}", { step: formatKg(step) }),
          }}
          inputMode="decimal"
          placeholder={alvoPeso || weightUnitLabel()}
          ariaLabel={t("Weight in {unit}", { unit: weightUnitLabel() })}
        />

        <NumberField
          value={set.reps}
          onChange={(v) => onField("reps", v)}
          onFocus={acceptRepsTarget}
          onStep={(direction, big) => stepReps(direction * (big ? 5 : 1))}
          scrub={{
            getValue: () => Number(set.reps) || set.sugReps || 0,
            stepFor: (tier) => (tier === "fine" ? 1 : 5),
            onValue: (value) => onField("reps", String(Math.round(value))),
            formatValue: (value, delta) =>
              `${Math.round(value)}${delta ? ` ${formatSignedStep(delta)}` : ""}`,
            formatStep: (step) => t("step {step}", { step: String(step) }),
          }}
          inputMode="numeric"
          placeholder={tempo ? t("sec") : alvoReps || `${exercise.repsMin}-${exercise.repsMax}`}
          ariaLabel={tempo ? t("Seconds") : t("Reps")}
        />


        <PsePicker
          value={set.rpe}
          onChange={(v) => onField("rpe", v)}
          exerciseName={exercise.nome}
          setLabel={label}
        />

        <button
          type="button"
          onClick={onCheck}
          aria-label={set.concluida ? t("Uncheck set") : t("Complete set")}
          aria-pressed={set.concluida}
          className={cn(
            "tap-target flex size-11 items-center justify-center rounded-lg border transition-colors",
            set.concluida
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted text-muted-foreground",
            justDone ? "set-pop" : "",
          )}
        >
          <Check className="size-6" strokeWidth={3} />
        </button>
      </div>
    </li>
  );
}

/** Shows the running change while a number is being slid, e.g. "+2.5". */
function formatSignedStep(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}

/**
 * Numeric field built for the thumb: hold it and slide up or down and the value
 * moves in steps that grow with the distance travelled, so heavy lifts get there
 * in one gesture. A plain tap still opens the keyboard for typing, and arrow
 * keys do the same job for keyboard users.
 */
function NumberField({
  value,
  onChange,
  onBlur,
  onFocus,
  inputMode,
  placeholder,
  ariaLabel,
  onStep,
  scrub: scrubOptions,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  inputMode: "decimal" | "numeric";
  placeholder: string;
  ariaLabel: string;
  onStep?: (direction: 1 | -1, big: boolean) => void;
  scrub?: ScrubOptions;
}) {
  const t = useT();
  const scrub = useValueScrub(scrubOptions);
  return (
    <div className="relative min-w-0">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...(onBlur ? { onBlur } : {})}
        inputMode={inputMode}
        enterKeyHint="next"
        onKeyDown={(e) => {
          if (onStep && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            onStep(e.key === "ArrowUp" ? 1 : -1, e.shiftKey);
            return;
          }
          focusNextField(e);
        }}
        placeholder={placeholder}
        aria-label={scrubOptions ? `${ariaLabel} — ${t("hold and slide to adjust")}` : ariaLabel}
        {...scrub.handlers}
        onFocus={(e) => {
          onFocus?.();
          // Select-all: typing overwrites instead of appending to the old number.
          requestAnimationFrame(() => e.target.select());
        }}
        className={cn(
          "numeric-field h-10 min-w-0 px-0.5 text-center text-[15px]",
          scrubOptions && "touch-none",
          scrub.scrubbing && "scale-105 border-primary text-primary motion-reduce:scale-100",
        )}
      />
      {scrub.scrubbing ? (
        <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-primary-foreground">
          {scrub.valueLabel}
          <span className="ml-1 font-semibold opacity-80">{scrub.stepLabel}</span>
        </span>
      ) : null}
    </div>
  );
}


function RestFinishedOverlay({ onResume }: { onResume: () => void }) {
  const t = useT();
  const resumeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    resumeRef.current?.focus();
  }, []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("Rest done")}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-6 backdrop-blur-sm"
    >
      <div className="flex size-24 items-center justify-center rounded-full bg-info/15 text-info">
        <Volume2 className="size-12" />
      </div>
      <h2 className="mt-6 text-center font-display text-3xl font-semibold" aria-live="assertive">
        {t("Rest done")}
      </h2>
      <p className="mt-2 text-center text-base text-muted-foreground">
        {t("Time for the next set. Keep the pace up.")}
      </p>
      <Button
        ref={resumeRef}
        className="mt-8 h-14 w-full max-w-xs text-base font-semibold"
        onClick={onResume}
      >
        {t("Resume workout")}
      </Button>
    </div>
  );
}

/** Non-blocking tooltip used only on the user's first session. */
function CoachMark({ text, onDismiss, t }: { text: string; onDismiss: () => void; t: any }) {
  return (
    <div
      role="note"
      onClick={onDismiss}
      className="motion-safe:animate-fade-in mt-2 flex items-start gap-2 rounded-xl border border-foreground/10 bg-surface-2 p-3"
    >
      <p className="flex-1 text-xs leading-snug text-muted-foreground">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-semibold text-primary"
      >
        {t("Got it")}
      </button>
    </div>
  );
}

/** Opens the exercise detail sheet (execution, tips, history, scoped chat). */
function ExerciseInfoButton({ exerciseId, nome }: { exerciseId: string; nome: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target flex h-8 items-center gap-1 rounded-full border border-border px-2.5 text-[11px] font-semibold text-muted-foreground"
      >
        <Info className="size-3.5" /> {t("How to do it")}
      </button>
      <ExerciseDetailSheet exerciseId={exerciseId} nome={nome} open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * One coach line per exercise: the target you are aiming for, with the
 * reasoning tucked behind a tap so the sets stay the loudest thing on screen.
 */
function ExercisePlanLine({
  target,
  warmup,
  note,
}: {
  target?: string | undefined;
  warmup?: string | undefined;
  note?: string | undefined;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!target && !note) return null;
  return (
    <div className="mb-2 rounded-xl border border-train/30 bg-train/10 px-3 py-2">
      {target ? (
        <p className="text-xs font-semibold leading-snug text-foreground">{target}</p>
      ) : null}
      {warmup ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{warmup}</p>
      ) : null}
      {note ? (
        <>
          {target ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="mt-1 text-[11px] font-semibold text-train underline-offset-2 hover:underline"
            >
              {open ? t("Hide why") : t("Why this target")}
            </button>
          ) : null}
          {open || !target ? (
            <p className="mt-1 text-[11px] leading-snug text-foreground">{note}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Coach note for a single set: hidden behind a link until there is something to say. */
function SetNoteField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(value.trim() !== "");
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-7 px-0.5 text-[11px] font-semibold text-muted-foreground"
      >
        + {t("Note for coach")}
      </button>
    );
  }
  return (
    <input
      autoFocus={value === ""}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t("Note for coach (optional)")}
      aria-label={t("Note for coach (optional)")}
      maxLength={140}
      className="h-8 w-full rounded-lg border border-border/60 bg-surface-2 px-2 text-[11px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

/** Free-text note that only takes space once you decide to write one. */
function CollapsibleNote({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(value.trim() !== "");
  if (!open) {
    return (
      <Button
        variant="ghost"
        className="mt-1 h-9 px-2 text-xs font-semibold text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-1 size-3.5" /> {t("Add note")}
      </Button>
    );
  }
  return (
    <Textarea
      autoFocus={value === ""}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-2 min-h-11 text-sm"
    />
  );
}
