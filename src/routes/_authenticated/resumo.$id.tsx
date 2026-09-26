import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Flag, Flame, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/CountUp";
import { getWorkout, getWorkouts, getWorkoutLog, getWorkoutSets } from "@/lib/data/workouts";
import { pendingWorkouts } from "@/lib/offline-queue";
import { getExercises } from "@/lib/data/exercises";
import { compareWithPreviousRun } from "@/lib/session-compare";
import { SessionDiffCard } from "@/components/SessionDiffCard";
import { weekStreak } from "@/lib/home-metrics";
import { formatDurationShort, formatKg } from "@/lib/format";
import { hapticSuccess } from "@/lib/haptics";
import { shareSummary } from "@/lib/share-summary";
import { formatDateLong } from "@/lib/format";
import { getRoutines } from "@/lib/data/routines";
import heroLogin from "@/assets/hero-login.jpg";
import { getCheckpoints, saveCheckpoint } from "@/lib/data/route";
import { getCrossTraining, logCoachingEvent } from "@/lib/data/coaching";
import { getBodyWeightLog } from "@/lib/data/body-weight";
import { evaluateCheckpoints } from "@/lib/route/status";
import type { Checkpoint } from "@/lib/route/types";

export const Route = createFileRoute("/_authenticated/resumo/$id")({
  head: () => ({
    meta: pageMeta({
      title: "Workout summary",
      description: "Duration, total volume, logged sets and personal records hit in this session.",
      ogDescription: "Duration, volume, sets and PRs from your session.",
    }),
  }),
  component: SummaryPage,
});

type PrEntry = { nome: string; pesoKg: number; anteriorKg?: number };

function SummaryPage() {
  const t = useT();
  const { id } = useParams({ from: "/_authenticated/resumo/$id" });
  const queryClient = useQueryClient();
  const [prs, setPrs] = useState<PrEntry[]>([]);
  const [coachMessage, setCoachMessage] = useState("");
  /** Checkpoints this workout just closed, so the route answers the session. */
  const [reached, setReached] = useState<Checkpoint[]>([]);
  const evaluated = useRef(false);

  useEffect(() => {
    const key = `forja.resumo.${id}`;
    try {
      const raw = window.localStorage.getItem(key);
      const payload = raw ? (JSON.parse(raw) as { prs?: PrEntry[]; coach?: string }) : {};
      const parsed = payload.prs ?? [];
      setPrs(parsed);
      setCoachMessage(payload.coach ?? "");
      // Celebrate the record once, when the summary first appears.
      if (parsed.length) hapticSuccess();
    } catch {
      setPrs([]);
    }

    // Consumed once: keep localStorage from accumulating one key per workout.
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }, [id]);

  const workoutQuery = useQuery({ queryKey: ["workout", id], queryFn: () => getWorkout(id) });
  const setsQuery = useQuery({ queryKey: ["workoutSets", id], queryFn: () => getWorkoutSets(id) });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const logQuery = useQuery({ queryKey: ["workout-log"], queryFn: getWorkoutLog });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const [sharing, setSharing] = useState(false);

  // Saved offline: the workout waits in the device queue until it syncs, so the
  // server log doesn't have it yet — read it from the queue instead.
  const [queued] = useState(() => pendingWorkouts().find((p) => p.workout.id === id) ?? null);
  const workout = workoutQuery.data ?? queued?.workout;
  const sets = setsQuery.data?.length ? setsQuery.data : (queued?.sets ?? []);
  const onlyOnDevice = !workoutQuery.data && queued !== null;

  // Re-read the route against the log that now includes this workout.
  useEffect(() => {
    if (evaluated.current || !logQuery.data) return;
    evaluated.current = true;
    const log = logQuery.data;
    let cancelled = false;
    void (async () => {
      try {
        const [checkpoints, cross, weights] = await Promise.all([
          getCheckpoints(),
          getCrossTraining(),
          getBodyWeightLog(),
        ]);
        const changes = evaluateCheckpoints({
          checkpoints,
          workouts: log.workouts,
          sets: log.sets,
          cross,
          bodyWeightKg: weights[0]?.pesoKg ?? null,
          hadDrop: false,
        });
        if (cancelled || !changes.length) return;
        const achieved: Checkpoint[] = [];
        for (const change of changes) {
          await saveCheckpoint(change.next);
          if (change.next.status === "achieved") {
            achieved.push(change.next);
            await logCoachingEvent({
              kind: "checkpoint_reached",
              message: t("Checkpoint reached: {title}.", { title: change.next.title }),
              cause: "pattern",
            });
          }
        }
        await queryClient.invalidateQueries({ queryKey: ["route-checkpoints"] });
        if (!cancelled && achieved.length) setReached(achieved);
      } catch {
        /* the summary is still useful without the route */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logQuery.data, queryClient, t]);
  const streak = weekStreak(workoutsQuery.data ?? []);
  const volume = workout?.volumeTotalKg ?? 0;

  const diff =
    workout && logQuery.data
      ? compareWithPreviousRun(workout, sets, workoutsQuery.data ?? [], logQuery.data.sets)
      : null;

  const routineName =
    (workout?.routineId
      ? (routinesQuery.data ?? []).find((r) => r.id === workout.routineId)?.nome
      : null) ?? t("Blank workout");

  /** Renders a card and hands it to the OS share sheet (or downloads it). */
  async function share() {
    if (!workout) return;
    setSharing(true);
    const outcome = await shareSummary(
      {
        routineName,
        dateLabel: formatDateLong(workout.iniciadoEm),
        volumeLabel: formatKg(volume),
        durationLabel: formatDurationShort(workout.duracaoSeg),
        sets: sets.length,
        exercises: new Set(sets.map((s) => s.exerciseId)).size,
        prs: prs.map((p) => ({ nome: p.nome, pesoKg: p.pesoKg })),
      },
      {
        volume: t("Volume"),
        duration: t("Duration"),
        sets: t("Sets"),
        exercises: t("Exercises"),
        prs: t("Personal records"),
        footer: t("Logged with Route"),
      },
    );
    setSharing(false);
    if (outcome === "downloaded") toast.success(t("Summary card saved to your device."));
    if (outcome === "failed") toast.error(t("Could not share this summary."));
  }

  return (
    <div className="route-enter relative min-h-screen bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
        <img
          src={heroLogin}
          alt=""
          loading="lazy"
          width={1024}
          height={1536}
          className="size-full object-cover opacity-40"
        />
        <div className="veil absolute inset-0" />
      </div>
      <div className="relative mx-auto max-w-md">
        <p className="label-caps">{t("Session finished")}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t("Workout done")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Good work. Here is the summary.")}</p>
        {onlyOnDevice ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-xs leading-snug text-muted-foreground">
            {t("Saved on this device — it will sync when you are back online.")}
          </p>
        ) : null}

        {/* Hero: the volume moved in this session. */}
        <section className="mt-8" aria-label={t("Total volume")}>
          <p className="label-caps">{t("Total volume")}</p>
          <CountUp
            value={volume}
            format={formatKg}
            className="num-hero mt-1 block text-train"
            aria-label={formatKg(volume)}
          />
        </section>

        {coachMessage ? (
          <section
            aria-label={t("Coach")}
            className="mt-6 rounded-3xl border border-primary/30 bg-primary/10 p-5"
          >
            <p className="label-caps text-primary">{t("Coach")}</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{coachMessage}</p>
          </section>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-xs leading-snug text-muted-foreground">
            {t(
              "The coach note and records for this workout are only shown right after you finish.",
            )}
          </p>
        )}

        {prs.length ? (
          <section aria-label={t("New personal records")} className="mt-6 space-y-3">
            {prs.map((pr, index) => {
              const delta =
                pr.anteriorKg && pr.anteriorKg > 0
                  ? Math.round((pr.pesoKg - pr.anteriorKg) * 10) / 10
                  : 0;
              return (
                <div
                  key={pr.nome}
                  className="pr-pop overflow-hidden rounded-3xl border border-success/40 bg-success-bg p-5"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex items-center gap-2 text-success">
                    <Trophy className="size-5" />
                    <p className="text-xs font-medium uppercase tracking-[0.02em]">
                      {t("New personal record")}
                    </p>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">{pr.nome}</p>
                  <CountUp
                    value={pr.pesoKg}
                    format={formatKg}
                    className="num-hero block text-success"
                    aria-label={formatKg(pr.pesoKg)}
                  />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {delta > 0
                      ? t("{delta} over your previous best of {previous}", {
                          delta: formatKg(delta),
                          previous: formatKg(pr.anteriorKg ?? 0),
                        })
                      : t("First time logged at this load")}
                  </p>
                </div>
              );
            })}
          </section>
        ) : null}

        {reached.length ? (
          <section aria-label={t("Checkpoint reached")} className="mt-6 space-y-3">
            {reached.map((cp) => (
              <div
                key={cp.id}
                className="pr-pop rounded-3xl border border-primary/40 bg-primary/10 p-5"
              >
                <div className="flex items-center gap-2 text-primary">
                  <Flag className="size-5" />
                  <p className="text-xs font-medium uppercase tracking-[0.02em]">
                    {t("Checkpoint reached")}
                  </p>
                </div>
                <p className="mt-2 text-lg font-semibold text-foreground">{cp.title}</p>
                <Link
                  to="/rota"
                  className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-2"
                >
                  {t("See my route")}
                </Link>
              </div>
            ))}
          </section>
        ) : null}

        {streak > 0 ? (
          <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-success">
            <Flame className="size-4" />
            {streak > 1
              ? t("{count} weeks training in a row", { count: streak })
              : t("First week training — keep it going")}
          </p>
        ) : null}

        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Stat
            label={t("Duration")}
            value={workout ? formatDurationShort(workout.duracaoSeg) : "—"}
          />
          <Stat label={t("Sets")} value={String(sets.length)} />
          <Stat
            label={t("Exercises")}
            value={String(new Set(sets.map((s) => s.exerciseId)).size)}
          />
        </dl>

        {diff ? (
          <div className="mt-6">
            <SessionDiffCard
              diff={diff}
              nameOf={(exId) =>
                (exercisesQuery.data ?? []).find((e) => e.id === exId)?.nome ?? t("Exercise")
              }
            />
          </div>
        ) : null}

        {workout?.notas ? (
          <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
            {workout.notas}
          </p>
        ) : null}

        <div className="mt-8 space-y-3">
          <Button
            variant="secondary"
            className="h-14 w-full text-base font-semibold"
            disabled={!workout || sharing}
            onClick={() => void share()}
          >
            <Share2 className="mr-2 size-5" /> {t("Share summary")}
          </Button>
          <Button asChild className="h-14 w-full text-base font-semibold">
            <Link to="/inicio">{t("Back to start")}</Link>
          </Button>
          <p className="text-center">
            <Link
              to="/progresso/$id"
              params={{ id }}
              className="text-sm font-semibold text-muted-foreground underline-offset-2"
            >
              {t("View session details")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <dt className="label-caps">{label}</dt>
      <dd className="num-big mt-1">{value}</dd>
    </div>
  );
}
