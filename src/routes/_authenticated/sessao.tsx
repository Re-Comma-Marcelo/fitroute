import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Flag, Plus, RotateCcw, Trophy, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { hapticSuccess, hapticTick } from "@/lib/haptics";
import { markScrubHintShown, shouldShowScrubHint } from "@/lib/use-value-scrub";

import { buildWarmupSets } from "@/lib/warmup";
import { unlockRestAudio } from "@/lib/rest-audio";
import { bumpExerciseUsage } from "@/lib/exercise-usage";
import { SessionExercisePickerSheet } from "@/components/SessionExercisePickerSheet";
import { useRestExpiry } from "@/lib/use-rest-expiry";

import { formatKg } from "@/lib/format";
import { blockLabels, hasNextInBlock } from "@/lib/supersets";
import { enqueueWorkout, isOffline } from "@/lib/offline-queue";
import {
  canAskRestPermission,
  cancelRestNotification,
  declineRestPermission,
  ensureRestPermission,
  scheduleRestNotification,
  setRestNotifyEnabled,
} from "@/lib/rest-notification";
import { clampRest, getRestDefault } from "@/lib/rest-defaults";
import { toast } from "sonner";
import { undoToast } from "@/lib/undo";
import { restForExercise } from "@/lib/prescription";
import {
  applyNextTarget,
  completeSet,
  repeatLastSet as repeatLast,
  uncompleteSet,
} from "@/lib/complete-set";
import {
  clearActiveSession,
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
  type ActiveExercise,
  type ActiveSession,
  type ActiveSet,
  type RestState,
  sessionLabel,
} from "@/lib/session-state";
import { isSerieValida } from "@/lib/progression";
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
import { getTargets, isoDate } from "@/lib/data/nutrition";
import { getDayNutrition } from "@/lib/data/diet-entries";
import { SessionCoachSheet } from "@/components/SessionCoachSheet";
import { ExerciseDetailSheet } from "@/components/ExerciseDetailSheet";

import { RestIsland } from "@/components/RestIsland";
import { RpeSheet } from "@/components/RpeScale";
import { askRpeEnabled } from "@/lib/rpe";
import { useQuery } from "@tanstack/react-query";
import type { TipoSerie, WorkoutSet } from "@/lib/types";

import { SessionHeader, type SegmentStatus } from "@/components/session/SessionHeader";
import { CurrentSetCard } from "@/components/session/CurrentSetCard";
import { DoneSetRow, PendingSetRow } from "@/components/session/SetRows";
import { SetEditSheet } from "@/components/session/SetEditSheet";
import { ExerciseMenuSheet, type ExerciseMenuAction } from "@/components/session/ExerciseMenuSheet";
import { SessionSheet } from "@/components/session/SessionSheet";
import { ExerciseHistorySheet } from "@/components/session/ExerciseHistorySheet";
import type { SetField } from "@/components/session/SetFields";

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

function useTick(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

/** The exercise on screen: `atual`, clamped to the list (older sessions stored -1). */
function viewIndex(session: ActiveSession): number {
  if (session.exercicios.length === 0) return 0;
  return Math.max(0, Math.min(session.atual, session.exercicios.length - 1));
}

/** Next exercise with something left to do, searching forward and wrapping. */
function nextPendingIndex(session: ActiveSession, from: number): number | null {
  const n = session.exercicios.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    if (idx === from) continue;
    const ex = session.exercicios[idx];
    if (ex && !ex.pulado && ex.sets.some((s) => !s.concluida)) return idx;
  }
  return null;
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
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  /** Key of the set just checked (drives the pop + green flash) and of the exercise just completed. */
  const [justSet, setJustSet] = useState<string | null>(null);
  const [justExercise, setJustExercise] = useState<number | null>(null);
  // Asked right after a working set is ticked, so effort is never forgotten.
  const [rpePrompt, setRpePrompt] = useState<{ exIdx: number; setIdx: number } | null>(null);
  /** "+240 kg" chip that flies into the header volume counter after a tick. */
  const [volumeBurst, setVolumeBurst] = useState<{ key: number; kg: number } | null>(null);
  /** Exercise that just hit a personal record (confetti + badge). */
  const [prBurst, setPrBurst] = useState<{ key: number; nome: string } | null>(null);
  /** Superset tick: no rest, the chained exercise is next. Shown in the bottom bar. */
  const [supersetHint, setSupersetHint] = useState<{ until: number; nome: string } | null>(null);
  /** Rest just ran out while the screen was open: the island pulses instead of a modal. */
  const [restDonePulse, setRestDonePulse] = useState(false);
  const [coachMark, setCoachMark] = useState(false);
  const [historyFor, setHistoryFor] = useState<ActiveExercise | null>(null);
  const [detailFor, setDetailFor] = useState<ActiveExercise | null>(null);
  /** Coach comment per exercise index, shown under the current set. */
  const [coachTips, setCoachTips] = useState<Record<number, string>>({});
  /** Target the app computed for the next set of an exercise. */
  const [targetTips, setTargetTips] = useState<Record<number, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Index of the exercise the picker replaces (null = picker adds). */
  const [replaceIdx, setReplaceIdx] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [editSet, setEditSet] = useState<{ exIdx: number; setIdx: number } | null>(null);

  const loadedRef = useRef(false);
  /** Always the latest session, so handlers can compute without a deferred updater. */
  const sessionRef = useRef<ActiveSession | null>(null);
  sessionRef.current = session;
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
   * Rest over: sound + vibration come from the expiry hook; here the island
   * switches to the overdue count-up and pulses. No overlay, nothing to dismiss.
   */
  const onRestExpired = useCallback(
    (live: boolean) => {
      clearRest(live);
      if (live) {
        hapticTick();
        setRestDonePulse(true);
      }
    },
    [clearRest],
  );

  useRestExpiry(restEndsAt, onRestExpired);
  useEffect(() => {
    if (restEndsAt) setRestDonePulse(false);
  }, [restEndsAt]);
  useEffect(() => {
    if (!restDonePulse) return;
    const id = setTimeout(() => setRestDonePulse(false), 6000);
    return () => clearTimeout(id);
  }, [restDonePulse]);

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

  /** First-ever session: one dismissible coach mark under the current set. */
  useEffect(() => {
    if (!hasSession || typeof window === "undefined") return;
    if (!workoutsQuery.isSuccess) return;
    if (window.localStorage.getItem(COACH_MARK_KEY) === "done") return;
    if (firstSession) setCoachMark(true);
  }, [hasSession, workoutsQuery.isSuccess, firstSession]);

  const dismissCoachMark = useCallback(() => {
    setCoachMark(false);
    if (typeof window !== "undefined") window.localStorage.setItem(COACH_MARK_KEY, "done");
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

  useEffect(() => {
    if (!volumeBurst) return;
    const id = setTimeout(() => setVolumeBurst(null), 900);
    return () => clearTimeout(id);
  }, [volumeBurst]);

  useEffect(() => {
    if (!prBurst) return;
    const id = setTimeout(() => setPrBurst(null), 2200);
    return () => clearTimeout(id);
  }, [prBurst]);

  const [scrubHint] = useState(() => shouldShowScrubHint());
  useEffect(() => {
    if (scrubHint) markScrubHintShown();
  }, [scrubHint]);

  /** A new exercise on screen starts at the top, so the current set is in view. */
  const viewIdx = session ? viewIndex(session) : 0;
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [viewIdx]);

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

  const completeDeps = { restFor, supersetChain };

  /** Run everything a ticked set triggers: rest, feedback, RPE, auto-advance. */
  function runCompleteEffects(
    next: ActiveSession,
    exIdx: number,
    setIdx: number,
    effects: NonNullable<ReturnType<typeof completeSet>["effects"]>,
  ) {
    const ex = next.exercicios[exIdx];
    hapticTick();
    setJustSet(`${exIdx}:${setIdx}`);
    setTargetTips((prev) => {
      const nextTips = { ...prev };
      if (effects.targetLine) nextTips[exIdx] = effects.targetLine;
      else delete nextTips[exIdx];
      return nextTips;
    });
    if (effects.volumeKg > 0) setVolumeBurst({ key: Date.now(), kg: effects.volumeKg });
    if (effects.personalRecord && ex) {
      hapticSuccess();
      setPrBurst({ key: Date.now(), nome: ex.nome });
    }
    if (effects.exerciseDone) setJustExercise(exIdx);
    // The rest starts before the RPE sheet opens, so the countdown is visible at once.
    if (effects.restSeconds > 0) startRest(effects.restSeconds);
    if (effects.superset) {
      const chained = next.exercicios[exIdx + 1];
      setSupersetHint({ until: Date.now() + 45000, nome: chained?.nome ?? "" });
    }
    if (effects.logged && askRpeEnabled() && !ex?.sets[setIdx]?.rpe) {
      setRpePrompt({ exIdx, setIdx });
    }
    if (effects.logged && ex) {
      void checkPerformanceDrop(ex, exIdx, effects.logged, next.id);
    }
  }

  function toggleSet(exIdx: number, setIdx: number) {
    unlockAudio();
    const current = sessionRef.current;
    const set = current?.exercicios[exIdx]?.sets[setIdx];
    if (!current || !set) return;
    if (set.concluida) {
      const next = uncompleteSet(current, exIdx, setIdx);
      sessionRef.current = next;
      setSession(next);
      saveActiveSession(next);
      return;
    }
    const { session: next, effects } = completeSet(current, exIdx, setIdx, completeDeps);
    if (!effects) return;
    sessionRef.current = next;
    setSession(next);
    saveActiveSession(next);
    runCompleteEffects(next, exIdx, setIdx, effects);
  }

  /** RPE arrives after the tick: the next-set target is recomputed with it. */
  function refreshTargetWithRpe(exIdx: number, setIdx: number, rpe: string) {
    let line: string | null = null;
    update((s) => {
      const ex = s.exercicios[exIdx];
      const set = ex?.sets[setIdx];
      if (!ex || !set || !set.concluida || !isSerieValida(set)) return s;
      line = applyNextTarget(ex, setIdx, {
        pesoKg: Number(set.pesoKg) || 0,
        reps: Number(set.reps) || 0,
        rpe: Number(rpe) || null,
      });
      return s;
    });
    // Recompute synchronously as well so the tip never lags a render behind.
    const cur = sessionRef.current?.exercicios[exIdx];
    const curSet = cur?.sets[setIdx];
    if (cur && curSet && curSet.concluida && isSerieValida(curSet)) {
      const probe = structuredClone(cur);
      line = applyNextTarget(probe, setIdx, {
        pesoKg: Number(curSet.pesoKg) || 0,
        reps: Number(curSet.reps) || 0,
        rpe: Number(rpe) || null,
      });
    }
    setTargetTips((prev) => {
      const nextTips = { ...prev };
      if (line) nextTips[exIdx] = line;
      return nextTips;
    });
  }

  function setField(exIdx: number, setIdx: number, field: SetField, value: string) {
    patchSet(exIdx, setIdx, { [field]: value });
    if (field === "rpe") refreshTargetWithRpe(exIdx, setIdx, value);
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
    patchSet(exIdx, setIdx, { coachNote: value });
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
    const current = sessionRef.current;
    if (!current) return;
    const { session: next, effects } = repeatLast(current, exIdx, completeDeps);
    if (!effects) return;
    const setIdx = next.exercicios[exIdx]!.sets.findIndex(
      (x, i) => x.concluida && !current.exercicios[exIdx]!.sets[i]!.concluida,
    );
    sessionRef.current = next;
    setSession(next);
    saveActiveSession(next);
    runCompleteEffects(next, exIdx, Math.max(0, setIdx), effects);
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
  }

  function jumpTo(idx: number) {
    update((s) => ({ ...s, atual: idx }));
  }

  /** Open the in-session picker in replace mode: suggestions first, then the search. */
  function replaceExercise(exIdx: number) {
    setReplaceIdx(exIdx);
    setPickerOpen(true);
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
    toast.success(t("{name} added", { name: built.nome }));
  }

  function skipExercise(exIdx: number) {
    update((s) => {
      s.exercicios[exIdx]!.pulado = !s.exercicios[exIdx]!.pulado;
      if (s.exercicios[exIdx]!.pulado && exIdx < s.exercicios.length - 1) s.atual = exIdx + 1;
      return s;
    });
  }

  function onMenuAction(exIdx: number, action: ExerciseMenuAction) {
    const ex = session?.exercicios[exIdx];
    if (!ex) return;
    switch (action) {
      case "watch":
        setDetailFor(ex);
        return;
      case "history":
        setHistoryFor(ex);
        return;
      case "replace":
        replaceExercise(exIdx);
        return;
      case "warmup":
        addWarmup(exIdx);
        return;
      case "addSet":
        addSet(exIdx);
        return;
      case "skip":
        skipExercise(exIdx);
        return;
      case "remove":
        removeExercise(exIdx);
        return;
      case "startRest":
        hapticTick();
        startRest(restFor(ex));
        return;
    }
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
        const [log, targets, dayFood] = await Promise.all([
          getWorkoutLog(),
          getTargets(),
          getDayNutrition(isoDate(new Date())),
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
          consumed: dayFood.eaten,
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

  /* ---------- derived view state ---------- */

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
        detalhe: `${formatKg(Number(set.pesoKg) || 0)} × ${Number(set.reps) || 0}`,
      })),
  );

  const exercise = session.exercicios[viewIdx] ?? null;
  const currentRest = exercise ? restFor(exercise) : 90;
  const blockLabel: Record<string, string> = session.routineId
    ? blockLabels(
        session.routineId,
        session.exercicios.map((e) => e.exerciseId),
      )
    : {};

  const exerciseDone =
    !!exercise && exercise.sets.length > 0 && exercise.sets.every((s) => s.concluida);
  const currentSetIdx = exercise ? exercise.sets.findIndex((s) => !s.concluida) : -1;
  const nextIdx = nextPendingIndex(session, viewIdx);
  const allDone = setsTotal > 0 && nextIdx === null && (exerciseDone || !!exercise?.pulado);
  const exercisesDone = session.exercicios.filter(
    (e) => e.sets.length > 0 && e.sets.every((s) => s.concluida),
  ).length;
  const exercisesTotal = session.exercicios.filter((e) => !e.pulado).length;

  const segments: SegmentStatus[] = session.exercicios.map((ex, idx) => {
    if (ex.pulado) return "skipped";
    if (idx === viewIdx) return "current";
    if (ex.sets.length > 0 && ex.sets.every((s) => s.concluida)) return "done";
    return "pending";
  });

  const showRest = Boolean(rest) || restOverdue > 0;
  const showSuperset = !showRest && !!supersetHint && supersetHint.until > Date.now();
  const hasFooter = showRest || showSuperset;

  const editing =
    editSet && session.exercicios[editSet.exIdx]?.sets[editSet.setIdx]
      ? {
          exercise: session.exercicios[editSet.exIdx]!,
          set: session.exercicios[editSet.exIdx]!.sets[editSet.setIdx]!,
          label: serieLabel(session.exercicios[editSet.exIdx]!.sets, editSet.setIdx),
        }
      : null;

  const plateTargetKg = exercise
    ? Number(
        exercise.sets.find((s) => !s.concluida)?.pesoKg ||
          exercise.sets.find((s) => !s.concluida)?.sugPeso ||
          exercise.sets[0]?.pesoKg ||
          0,
      ) || 0
    : 0;

  return (
    <div className={cn("min-h-screen bg-background", hasFooter ? "pb-48" : "pb-10")}>
      <SessionHeader
        routineName={sessionLabel(session)}
        elapsed={elapsed}
        paused={paused}
        volumeKg={volumeAtual}
        volumeBurst={volumeBurst}
        segments={segments}
        exerciseIdx={viewIdx}
        exerciseName={exercise?.nome ?? t("Add an exercise to start")}
        blockLabel={exercise ? blockLabel[exercise.exerciseId] : undefined}
        onCollapse={() => navigate({ to: "/treino" })}
        onOpenSession={() => setSessionOpen(true)}
        onOpenMenu={() => exercise && setMenuOpen(true)}
        onJump={jumpTo}
        coach={
          exercise ? (
            <SessionCoachSheet
              compact
              exerciseId={exercise.exerciseId}
              exerciseName={exercise.nome}
              sessionExerciseIds={session.exercicios.map((e) => e.exerciseId)}
              workoutId={session.id}
              onSwap={(picked) => void swapExerciseTo(viewIdx, picked.id)}
              onMoreOptions={() => replaceExercise(viewIdx)}
            />
          ) : null
        }
      />

      <main className="mx-auto max-w-md space-y-3 px-3 py-3">
        {paused ? (
          <p className="text-center text-[11px] font-semibold text-muted-foreground">
            {t("Clock paused — logging still works.")}
          </p>
        ) : null}

        {!exercise ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm font-semibold">{t("Blank workout")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Add the first exercise and start logging.")}
            </p>
            <Button className="mt-4 h-12 w-full font-semibold" onClick={() => setPickerOpen(true)}>
              <Plus className="mr-1 size-5" /> {t("Add exercise")}
            </Button>
          </div>
        ) : exercise.pulado ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">{t("Exercise skipped")}</p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                className="tap-target flex-1"
                onClick={() => skipExercise(viewIdx)}
              >
                {t("Resume exercise")}
              </Button>
              {nextIdx !== null ? (
                <Button className="tap-target flex-1" onClick={() => jumpTo(nextIdx)}>
                  {t("Next")} <ArrowRight className="ml-1 size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-0.5">
              {exercise.sets.map((set, setIdx) => {
                const label = serieLabel(exercise.sets, setIdx);
                if (set.concluida) {
                  return (
                    <DoneSetRow
                      key={set.id}
                      set={set}
                      label={label}
                      flash={justSet === `${viewIdx}:${setIdx}`}
                      onClick={() => setEditSet({ exIdx: viewIdx, setIdx })}
                    />
                  );
                }
                if (setIdx === currentSetIdx) {
                  const anyDone = exercise.sets.some((s) => s.concluida);
                  return (
                    <Fragment key={set.id}>
                      <li className={cn(setIdx > 0 && "pt-2")}>
                        <CurrentSetCard
                          exercise={exercise}
                          set={set}
                          label={label}
                          target={targetTips[viewIdx] ?? exercise.prescricao?.line}
                          warmup={
                            anyDone || targetTips[viewIdx]
                              ? undefined
                              : exercise.prescricao?.warmup?.line
                          }
                          reason={
                            exercise.sugestao?.aumentou ? exercise.sugestao.motivo : undefined
                          }
                          onField={(field, value) => setField(viewIdx, setIdx, field, value)}
                          onCheck={() => toggleSet(viewIdx, setIdx)}
                          onOpenSet={() => setEditSet({ exIdx: viewIdx, setIdx })}
                          justDone={justSet === `${viewIdx}:${setIdx}`}
                          hint={
                            scrubHint && !anyDone
                              ? t("Tip: hold a number and slide up or down to change it.")
                              : undefined
                          }
                        />
                      </li>
                      {coachMark ? (
                        <li>
                          <CoachMark
                            text={t("Adjust weight and reps, then tap Complete set.")}
                            onDismiss={dismissCoachMark}
                            label={t("Got it")}
                          />
                        </li>
                      ) : null}
                      {coachTips[viewIdx] ? (
                        <li className="px-1 pt-1 text-[11px] leading-snug text-muted-foreground">
                          <span className="font-semibold text-foreground/80">{t("Coach")}: </span>
                          {coachTips[viewIdx]}
                        </li>
                      ) : null}
                    </Fragment>
                  );
                }
                return (
                  <PendingSetRow
                    key={set.id}
                    set={set}
                    label={label}
                    repsRange={`${exercise.repsMin}-${exercise.repsMax}`}
                    onClick={() => setEditSet({ exIdx: viewIdx, setIdx })}
                  />
                );
              })}
            </ul>

            {exerciseDone ? (
              allDone ? (
                <section
                  className={cn(
                    "rounded-2xl border border-success/40 bg-success/10 p-4",
                    justExercise === viewIdx && "exercise-done-pulse",
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-success">
                    <Trophy className="size-4" /> {t("All sets done")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("{sets} sets · {volume} kg", {
                      sets: setsDone,
                      volume: formatKg(Math.round(volumeAtual), { unit: false }),
                    })}
                  </p>
                  <Button
                    className="mt-3 h-14 w-full text-base font-semibold"
                    disabled={finishing}
                    onClick={requestFinish}
                  >
                    <Flag className="mr-2 size-5" /> {t("Finish workout")}
                  </Button>
                </section>
              ) : (
                <button
                  type="button"
                  onClick={() => nextIdx !== null && jumpTo(nextIdx)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-2xl border border-success/40 bg-success/10 px-3 py-3 text-left",
                    justExercise === viewIdx && "exercise-done-pulse",
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-success">
                      <Check className="size-3.5" strokeWidth={3} />
                      {t("Exercise done · {done} of {total}", {
                        done: exercisesDone,
                        total: exercisesTotal,
                      })}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
                      {t("Next: {name}", {
                        name: nextIdx !== null ? (session.exercicios[nextIdx]?.nome ?? "") : "",
                      })}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-background">
                    {t("Next")}
                  </span>
                </button>
              )
            ) : null}

            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant="ghost"
                className="h-10 px-2 text-xs font-semibold text-muted-foreground"
                onClick={() => addSet(viewIdx)}
              >
                <Plus className="mr-1 size-3.5" /> {t("Add set")}
              </Button>
              {exercise.sets.some((s) => s.concluida) && exercise.sets.some((s) => !s.concluida) ? (
                <Button
                  variant="ghost"
                  className="h-10 px-2 text-xs font-semibold text-primary"
                  onClick={() => repeatLastSet(viewIdx)}
                >
                  <RotateCcw className="mr-1 size-3.5" /> {t("Repeat last set")}
                </Button>
              ) : null}
            </div>
            {!exerciseDone && nextIdx !== null ? (
              <button
                type="button"
                onClick={() => jumpTo(nextIdx)}
                className="tap-target flex w-full items-center justify-between gap-2 rounded-xl border border-border px-3 text-left text-xs font-semibold text-muted-foreground"
              >
                <span className="truncate">
                  {t("Next: {name}", { name: session.exercicios[nextIdx]?.nome ?? "" })}
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </button>
            ) : null}
          </>
        )}
      </main>

      <SessionExercisePickerSheet
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open) setReplaceIdx(null);
        }}
        replacing={replaceIdx !== null ? (session.exercicios[replaceIdx] ?? null) : null}
        sessionExerciseIds={session.exercicios.map((e) => e.exerciseId)}
        onPick={(picked) => {
          if (replaceIdx !== null) {
            const idx = replaceIdx;
            setPickerOpen(false);
            setReplaceIdx(null);
            bumpExerciseUsage(picked.id);
            void swapExerciseTo(idx, picked.id);
            return;
          }
          void addExerciseFromPicker(picked.id);
        }}
      />

      <ExerciseMenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        exercise={exercise}
        restSeconds={currentRest}
        plateTargetKg={plateTargetKg}
        onRest={(segundos) => setExerciseRest(viewIdx, segundos)}
        onNote={(value) =>
          update((s) => {
            s.exercicios[viewIdx]!.notas = value;
            return s;
          })
        }
        onAction={(action) => onMenuAction(viewIdx, action)}
      />

      <SessionSheet
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        session={session}
        currentIdx={viewIdx}
        blockLabel={blockLabel}
        onJump={jumpTo}
        onMove={moveExercise}
        onAddExercise={() => setPickerOpen(true)}
        onNote={(value) => update((s) => ({ ...s, notas: value }))}
        onTogglePause={() => update((s) => togglePause(s))}
        onFinish={requestFinish}
      />

      <SetEditSheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditSet(null);
        }}
        exercise={editing?.exercise ?? null}
        set={editing?.set ?? null}
        label={editing?.label ?? ""}
        typeName={typeName}
        onField={(field, value) => editSet && setField(editSet.exIdx, editSet.setIdx, field, value)}
        onTipo={(tipo) => editSet && setTipo(editSet.exIdx, editSet.setIdx, tipo)}
        onNote={(value) => editSet && setSetNote(editSet.exIdx, editSet.setIdx, value)}
        onUncheck={() => editSet && toggleSet(editSet.exIdx, editSet.setIdx)}
        onRemove={() => editSet && removeSet(editSet.exIdx, editSet.setIdx)}
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
          restLeft={restLeft}
          restTotal={rest?.total ?? 0}
          onSave={(value) => {
            setField(rpePrompt.exIdx, rpePrompt.setIdx, "rpe", value);
            setRpePrompt(null);
          }}
          onSkip={() => setRpePrompt(null)}
        />
      ) : null}

      {/* Bottom bar has one owner: the rest countdown, or the superset hand-off. Idle: nothing. */}
      {hasFooter ? (
        <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
          {showRest ? (
            <RestIsland
              className={cn(restDonePulse && "rest-done-pulse")}
              total={rest?.total ?? 0}
              left={restLeft}
              overdue={restOverdue}
              label={t("{volume} so far", { volume: formatKg(Math.round(volumeAtual)) })}
              onAdd={() => patchRest((r) => ({ total: r.total + 15, endsAt: r.endsAt + 15000 }))}
              onSubtract={() =>
                patchRest((r) => ({ total: r.total - 15, endsAt: r.endsAt - 15000 }))
              }
              onSkip={() => (rest ? patchRest(() => null) : clearOverdue())}
              onPreset={(segundos) => {
                hapticTick();
                startRest(segundos);
              }}
            />
          ) : (
            <div className="mx-auto flex max-w-md items-center justify-between gap-2 rounded-3xl border border-train/30 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
              <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-train">
                <Zap className="size-4 shrink-0" />
                <span className="truncate">
                  {t("Superset · no rest, go to {name}", { name: supersetHint?.nome ?? "" })}
                </span>
              </span>
              {nextIdx !== null ? (
                <Button
                  size="sm"
                  className="h-9 shrink-0 rounded-full px-3 text-xs font-semibold"
                  onClick={() => {
                    setSupersetHint(null);
                    jumpTo(nextIdx);
                  }}
                >
                  {t("Go")}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

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

      <ExerciseDetailSheet
        exerciseId={detailFor?.exerciseId ?? ""}
        nome={detailFor?.nome ?? ""}
        open={detailFor !== null}
        onOpenChange={(open) => {
          if (!open) setDetailFor(null);
        }}
      />

      {prBurst ? <PrCelebration key={prBurst.key} nome={prBurst.nome} /> : null}
    </div>
  );
}

/** Personal record: confetti burst + banner, gone in two seconds, never blocks a tap. */
function PrCelebration({ nome }: { nome: string }) {
  const t = useT();
  const pieces = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="pr-banner relative flex items-center gap-2 rounded-full border border-success/50 bg-success px-4 py-2 text-sm font-bold text-background shadow-xl">
        <Trophy className="size-4" />
        {t("New record · {name}", { name: nome })}
        {pieces.map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="confetti absolute left-1/2 top-1/2 size-1.5 rounded-sm"
            style={{
              // Twelve directions, three rings, mixed in a fixed pseudo-random spread.
              ["--dx" as string]: `${Math.round(Math.cos((i / pieces.length) * Math.PI * 2) * (60 + (i % 3) * 30))}px`,
              ["--dy" as string]: `${Math.round(Math.sin((i / pieces.length) * Math.PI * 2) * (40 + (i % 3) * 25))}px`,
              backgroundColor:
                i % 3 === 0 ? "var(--train)" : i % 3 === 1 ? "var(--background)" : "var(--warn)",
              animationDelay: `${(i % 4) * 30}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Non-blocking tooltip used only on the user's first session. */
function CoachMark({
  text,
  onDismiss,
  label,
}: {
  text: string;
  onDismiss: () => void;
  label: string;
}) {
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
        {label}
      </button>
    </div>
  );
}
