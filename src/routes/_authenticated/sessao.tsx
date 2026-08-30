import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  MoreVertical,
  Minus,
  Plus,
  RotateCcw,
  SkipForward,
  Timer,
  Trash2,
  TrendingUp,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { hapticRestDone, hapticTick } from "@/lib/haptics";
import { formatDuration, formatKg, formatRest, weightUnitLabel } from "@/lib/format";
import { PlateCalculatorSheet } from "@/components/PlateCalculatorSheet";
import { usesPlates } from "@/lib/plates";
import { blockLabels, hasNextInBlock } from "@/lib/supersets";
import { displayStep, fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { enqueueWorkout, isOffline } from "@/lib/offline-queue";
import { cancelRestNotification, scheduleRestNotification } from "@/lib/rest-notification";
import { toast } from "sonner";
import {
  clearActiveSession,
  currentExerciseIndex,
  filledUncheckedSets,
  loadActiveSession,
  makeSets,
  restSecondsLeft,
  saveActiveSession,
  serieLabel,
  sessionSetsDone,
  sessionVolume,
  takePendingExercise,
  type ActiveExercise,
  type ActiveSession,
  type ActiveSet,
  type RestState,
  sessionLabel,
} from "@/lib/session-state";
import { incrementoPara, isSerieValida } from "@/lib/progression";
import { buildActiveExercise } from "@/lib/start-session";
import { getPersonalRecord, getWorkouts, saveWorkout } from "@/lib/data/workouts";
import { ProgressRing } from "@/components/ProgressRing";
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

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const REST_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 135, 150, 180, 210, 240, 300];

/**
 * Row 1: set type | previous | RPE | check. Row 2: -/kg/+ and -/reps/+ steppers.
 * Every tap target is 44px and the tracks fit 320-430px with no horizontal scroll.
 */
const ROW_TOP = "grid grid-cols-[44px_minmax(0,1fr)_44px_44px] items-center gap-1.5";
const ROW_STEP =
  "grid grid-cols-[44px_minmax(3rem,1fr)_44px_44px_minmax(3rem,1fr)_44px] items-center gap-0.5";

function playRestBeep(audioCtxRef: React.MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = audioCtxRef.current ?? new Ctx();
    audioCtxRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // ignore
  }
}

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
  const [justExercise, setJustExercise] = useState<number | null>(null);
  const [coachMark, setCoachMark] = useState<0 | 1 | 2>(0);
  const cardRefs = useRef<Record<number, HTMLElement | null>>({});
  const loadedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rest = session?.rest ?? null;
  const restEndsAt = rest?.endsAt ?? null;

  useTick(true);

  /** iOS Safari starts the AudioContext suspended: unlock it on the first tap. */
  const unlockAudio = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current ?? new Ctx();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
    } catch {
      // ignore
    }
  }, []);

  /** Clear the persisted rest countdown (it is consumed once and never re-fires). */
  const clearRest = useCallback(() => {
    setSession((prev) => {
      if (!prev?.rest) return prev;
      const next = { ...prev, rest: null };
      saveActiveSession(next);
      return next;
    });
  }, []);

  // Prominent rest timer: sound + vibration + full-screen overlay when done.
  useEffect(() => {
    if (!restEndsAt) return;
    const msLeft = restEndsAt - Date.now();

    // Rest that ran out while the app was closed/backgrounded: drop it silently.
    if (msLeft <= 0) {
      clearRest();
      return;
    }

    setRestFinished(false);
    const id = setTimeout(() => {
      clearRest();
      setRestFinished(true);
      playRestBeep(audioCtxRef);
      hapticRestDone();
    }, msLeft);
    return () => clearTimeout(id);
  }, [restEndsAt, clearRest]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const loaded = loadActiveSession();
    setSession(loaded);
    setReady(true);
    if (!loaded) return;
    // Exercise chosen from library during session
    const pending = takePendingExercise();
    if (pending) {
      buildActiveExercise(pending)
        .then((built) => {
          if (!built) {
            toast.error(t("Could not add the exercise. Try again."));
            return;
          }
          setSession((prev) => {
            if (!prev) return prev;
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

  const elapsed = Math.floor((Date.now() - new Date(session.iniciadoEm).getTime()) / 1000);
  const restLeft = restSecondsLeft(session);

  function startRest(segundos: number) {
    if (segundos <= 0) return;
    update((s) => ({ ...s, rest: { total: segundos, endsAt: Date.now() + segundos * 1000 } }));
    // Backgrounded phones stop running timers; a notification still lands.
    scheduleRestNotification(segundos * 1000, t("Rest is over"), t("Time for your next set."));
  }

  function patchRest(mutate: (r: RestState) => RestState | null) {
    update((s) => {
      const next = s.rest ? mutate(s.rest) : null;
      if (!next) cancelRestNotification();
      else
        scheduleRestNotification(
          Math.max(0, next.endsAt - Date.now()),
          t("Rest is over"),
          t("Time for your next set."),
        );
      return { ...s, rest: next };
    });
  }

  function toggleSet(exIdx: number, setIdx: number) {
    unlockAudio();
    let descanso = 0;
    let proximo: number | null = null;
    let completou = false;
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
      // Inside a superset you move straight to the next exercise: no rest yet.
      descanso = supersetChain(s, exIdx) ? 0 : ex.descansoSeg;
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
    if (completou) setJustExercise(exIdx);
    if (descanso > 0) startRest(descanso);
    if (proximo !== null) setScrollTo(proximo);
  }

  function setField(
    exIdx: number,
    setIdx: number,
    field: "pesoKg" | "reps" | "rpe",
    value: string,
  ) {
    update((s) => {
      s.exercicios[exIdx]!.sets[setIdx]![field] = value;
      return s;
    });
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
      descanso = ex.descansoSeg;
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
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      ex.sets.splice(setIdx, 1);
      ex.sets.forEach((x, i) => (x.serieNum = i + 1));
      return s;
    });
  }

  function removeExercise(exIdx: number) {
    update((s) => {
      s.exercicios.splice(exIdx, 1);
      s.atual = Math.min(s.atual, Math.max(0, s.exercicios.length - 1));
      return s;
    });
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
          });
        });
        if (melhor > pr && melhor > 0) prs.push({ nome: ex.nome, pesoKg: melhor, anteriorKg: pr });
      }

      const workout = {
        id: target.id,
        ...(target.routineId ? { routineId: target.routineId } : {}),
        iniciadoEm: target.iniciadoEm,
        finalizadoEm: new Date().toISOString(),
        duracaoSeg,
        volumeTotalKg: Math.round(volume),
        notas: target.notas,
        origem: (target.routineId ? "rotina" : "branco") as "rotina" | "branco",
      };

      // Offline: queue it locally and let the app sync when the connection is back.
      if (isOffline()) {
        enqueueWorkout(workout, sets);
        toast.success(t("Saved on this device — it will sync when you are back online."));
      } else {
        await saveWorkout(workout, sets);
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `forja.resumo.${target.id}`,
          JSON.stringify({ prs, series: sets.length }),
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

  const setsDone = sessionSetsDone(session);
  const setsTotal = session.exercicios
    .filter((ex) => !ex.pulado)
    .reduce((total, ex) => total + ex.sets.filter(isSerieValida).length, 0);
  const volumeAtual = sessionVolume(session);
  const pendCount = filledUncheckedSets(session);
  const currentRest = session.exercicios[currentExerciseIndex(session)]?.descansoSeg ?? 90;

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
            className="tap-target text-info"
            aria-label={t("Open rest timer")}
            onClick={() => {
              // Never silently wipe a rest already counting down.
              if (restLeft > 0) {
                toast(t("Rest already running"), {
                  action: {
                    label: t("Restart"),
                    onClick: () => startRest(currentRest),
                  },
                });
                return;
              }
              startRest(currentRest);
            }}
          >
            <Timer className="size-6" />
          </Button>
          <Button
            className="tap-target h-11 bg-info px-4 font-semibold text-info-foreground hover:bg-info/90"
            disabled={finishing}
            onClick={requestFinish}
          >
            {t("Finish")}
          </Button>
        </div>
        <dl className="mx-auto grid max-w-md grid-cols-3 border-t border-border">
          <HeaderStat label={t("Duration")} value={formatDuration(elapsed)} mono />
          <HeaderStat label={t("Volume")} value={formatKg(Math.round(volumeAtual))} />
          <HeaderStat label={t("Sets")} value={String(setsDone)} />
        </dl>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-3 py-3">
        {session.exercicios.map((ex, exIdx) => {
          const aberto = exIdx === session.atual;
          const feitas = ex.sets.filter((s) => s.concluida && isSerieValida(s)).length;
          const validas = ex.sets.filter(isSerieValida).length;
          const exDone = validas > 0 && feitas >= validas;
          return (
            <section
              key={ex.exerciseId + exIdx}
              ref={(node) => {
                cardRefs.current[exIdx] = node;
              }}
              style={{ scrollMarginTop: "7rem" }}
              className={`rounded-xl border bg-card ${
                aberto ? "border-primary/50" : "border-border"
              } ${ex.pulado ? "opacity-50" : ""}`}
            >
              <div className="flex items-start gap-1 p-3">
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
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-semibold tabular-nums text-train">
                          {feitas}/{validas}
                        </span>
                        <span>
                          {t("{count}/{total} sets · target {min}-{max} reps", {
                            count: feitas,
                            total: validas,
                            min: ex.repsMin,
                            max: ex.repsMax,
                          })}
                        </span>
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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <RestPicker
                      value={ex.descansoSeg}
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
                  </div>
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
                  <div
                    className={`${ROW_TOP} mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`}
                  >
                    <span className="text-center">{t("Set")}</span>
                    <span>{t("Previous")}</span>
                    <span className="text-center">{t("RPE")}</span>
                    <span />
                  </div>
                  <ul className="space-y-2">
                    {ex.sets.map((set, setIdx) => (
                      <SetRow
                        key={set.id}
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
                    ))}
                  </ul>
                  {coachMark === 1 && exIdx === session.atual ? (
                    <CoachMark
                      text={t("Adjust weight and reps, then tap ✓ when the set is done")}
                      onDismiss={advanceCoachMark}
                      t={t}
                    />
                  ) : null}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      className="h-11 justify-center text-sm font-semibold text-muted-foreground"
                      onClick={() => addSet(exIdx)}
                    >
                      <Plus className="mr-1 size-4" /> {t("Add set")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 justify-center text-sm font-semibold text-info"
                      disabled={
                        !ex.sets.some((s) => s.concluida) || !ex.sets.some((s) => !s.concluida)
                      }
                      onClick={() => repeatLastSet(exIdx)}
                    >
                      <RotateCcw className="mr-1 size-4" /> {t("Repeat set")}
                    </Button>
                  </div>
                  <Textarea
                    value={ex.notas}
                    onChange={(e) =>
                      update((s) => {
                        s.exercicios[exIdx]!.notas = e.target.value;
                        return s;
                      })
                    }
                    placeholder={t("Exercise note (e.g., closer grip)")}
                    className="mt-2 min-h-11 text-sm"
                  />
                </div>
              ) : null}
            </section>
          );
        })}

        <Button
          variant="secondary"
          className="h-12 w-full font-semibold"
          onClick={() =>
            navigate({ to: "/biblioteca", search: { para: "sessao", rotinaId: undefined } })
          }
        >
          <Plus className="mr-1 size-5" /> {t("Add exercise")}
        </Button>

        <Textarea
          value={session.notas}
          onChange={(e) => update((s) => ({ ...s, notas: e.target.value }))}
          placeholder={t("Session note")}
          className="min-h-16 text-sm"
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-md px-3 py-3">
          {rest ? (
            <RestTimerBar
              rest={rest}
              restLeft={restLeft}
              onAdd={() => patchRest((r) => ({ total: r.total + 15, endsAt: r.endsAt + 15000 }))}
              onSubtract={() => patchRest((r) => ({ ...r, endsAt: r.endsAt - 15000 }))}
              onSkip={() => patchRest(() => null)}
              t={t}
            />
          ) : null}
          {coachMark === 2 ? (
            <CoachMark
              text={t("When everything is done, finish here to save your workout")}
              onDismiss={advanceCoachMark}
              t={t}
            />
          ) : null}
          <Button
            className="h-14 w-full text-base font-semibold"
            disabled={finishing}
            onClick={requestFinish}
          >
            {t("Finish workout")}
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

      {restFinished ? <RestFinishedOverlay onResume={() => setRestFinished(false)} /> : null}
    </div>
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
          className="tap-target inline-flex h-11 items-center gap-1 rounded-full bg-primary/15 px-3 text-xs font-semibold text-primary"
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
          className="tap-target inline-flex h-11 items-center gap-1 rounded-full bg-info/15 px-3 text-xs font-semibold text-info"
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

function PsePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={value ? `RPE ${value}` : t("Set RPE (optional)")}
          className={`tap-target h-11 w-full rounded-lg border text-xs font-semibold tabular-nums ${
            value
              ? "border-info/60 bg-info/15 text-info"
              : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {value || t("RPE")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("RPE (optional)")}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {RPE_OPTIONS.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => {
                onChange(String(op));
                setOpen(false);
              }}
              className={`tap-target rounded-lg border text-sm font-semibold ${
                value === String(op)
                  ? "border-info bg-info text-info-foreground"
                  : "border-border bg-card"
              }`}
            >
              {op}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-2 h-10 w-full text-xs font-semibold text-muted-foreground"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
        >
          {t("Clear")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function StepButton({
  onClick,
  label,
  dir,
}: {
  onClick: () => void;
  label: string;
  dir: "up" | "down";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap-target flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground active:bg-accent"
    >
      {dir === "up" ? (
        <Plus className="size-5" strokeWidth={2.8} />
      ) : (
        <Minus className="size-5" strokeWidth={2.8} />
      )}
    </button>
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
  const passoKg = incrementoPara(exercise.equipamento);
  const { unit } = useWeightUnit();
  /** Weight is always stored in kg; the field shows the user's unit. */
  const [draft, setDraft] = useState<string | null>(null);
  const shownWeight =
    draft ??
    (set.pesoKg === ""
      ? ""
      : String(Math.round(toDisplayWeight(Number(set.pesoKg) || 0, unit) * 100) / 100));

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

  return (
    <li
      className={cn(
        "space-y-1 rounded-lg p-1",
        set.concluida ? "bg-primary/10" : "bg-muted/20",
        justDone ? "set-flash" : "",
      )}
    >
      <div className={ROW_TOP}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`tap-target flex size-11 items-center justify-center rounded-md bg-muted text-sm font-semibold ${
                aquecimento ? "text-warn" : ""
              }`}
              aria-label={t("Set {label} — type {type}", { label, type: typeName[set.tipoSerie] })}
            >
              {label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(["aquecimento", "normal", "falha", "drop"] as TipoSerie[]).map((tipo) => (
              <DropdownMenuItem key={tipo} onClick={() => onTipo(tipo)}>
                {typeName[tipo]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem className="text-destructive" onClick={onRemove}>
              <Trash2 className="mr-2 size-4" /> {t("Remove set")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="min-w-0 text-[11px] font-semibold leading-tight text-muted-foreground">
          {set.antPeso !== null && set.antReps !== null ? (
            <>
              <span className="block truncate tabular-nums">
                {formatKg(set.antPeso)} x {set.antReps}
              </span>
              <span className="block truncate tabular-nums">
                {set.antRpe ? t("@ {rpe} rpe", { rpe: set.antRpe }) : "—"}
              </span>
            </>
          ) : (
            <span>—</span>
          )}
        </div>

        <PsePicker value={set.rpe} onChange={(v) => onField("rpe", v)} />

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

      <div className={ROW_STEP}>
        <StepButton dir="down" label={t("Decrease weight")} onClick={() => stepKg(-passoKg)} />
        <Input
          value={shownWeight}
          onChange={(e) => writeWeight(e.target.value)}
          onBlur={() => setDraft(null)}
          inputMode="decimal"
          placeholder={weightUnitLabel()}
          aria-label={t("Weight in {unit}", { unit: weightUnitLabel() })}
          className="numeric-field h-11 min-w-0 px-0.5 text-center text-base"
        />
        <StepButton dir="up" label={t("Increase weight")} onClick={() => stepKg(passoKg)} />
        <StepButton dir="down" label={t("Decrease reps")} onClick={() => stepReps(-1)} />
        <Input
          value={set.reps}
          onChange={(e) => onField("reps", e.target.value)}
          inputMode="numeric"
          placeholder={`${exercise.repsMin}-${exercise.repsMax}`}
          aria-label={t("Reps")}
          className="numeric-field h-11 min-w-0 px-0.5 text-center text-base"
        />
        <StepButton dir="up" label={t("Increase reps")} onClick={() => stepReps(1)} />
      </div>
    </li>
  );
}

function RestTimerBar({
  t,
  rest,
  restLeft,
  onAdd,
  onSubtract,
  onSkip,
}: {
  rest: { total: number; endsAt: number };
  restLeft: number;
  onAdd: () => void;
  onSubtract: () => void;
  onSkip: () => void;
  t: any;
}) {
  const pct = Math.min(100, (restLeft / rest.total) * 100);
  const isLow = restLeft <= 10;
  return (
    <div className="mb-3 rounded-2xl border border-info/30 bg-info/10 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-info/20 text-info">
            <Timer className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.02em] text-info/80">
              {t("Rest")}
            </p>
            <p
              role="timer"
              aria-live="off"
              className={cn("num-big leading-none", isLow ? "text-warn" : "text-info")}
            >
              {formatDuration(restLeft)}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            className="tap-target h-10 px-3 text-xs font-semibold"
            onClick={onSubtract}
          >
            -15s
          </Button>
          <Button
            variant="secondary"
            className="tap-target h-10 px-3 text-xs font-semibold"
            onClick={onAdd}
          >
            +15s
          </Button>
          <Button
            variant="ghost"
            className="tap-target h-10 px-3 text-xs font-semibold text-muted-foreground"
            onClick={onSkip}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-linear",
            isLow ? "bg-warn" : "bg-info",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
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
