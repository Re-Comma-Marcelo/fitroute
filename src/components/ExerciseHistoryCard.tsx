import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { getWorkoutLog } from "@/lib/data/workouts";
import { setE1rm } from "@/lib/e1rm";
import { isSerieDeCarga } from "@/lib/progression";
import { formatKg, relativeDays } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkoutSet } from "@/lib/types";

interface SessionRow {
  date: string;
  sets: number;
  bestWeight: number;
  bestReps: number;
  bestE1rm: number;
}

/**
 * History of one exercise: PR, best estimated 1RM and the last sessions.
 * Read-only — it answers "am I getting stronger on this movement?".
 */
export function ExerciseHistoryCard({ exerciseId }: { exerciseId: string }) {
  const t = useT();
  const logQ = useQuery({ queryKey: ["workoutLog"], queryFn: getWorkoutLog });

  const rows = useMemo<SessionRow[]>(() => {
    const workouts = logQ.data?.workouts ?? [];
    const sets = (logQ.data?.sets ?? []).filter(
      (s) => s.exerciseId === exerciseId && s.concluida && isSerieDeCarga(s),
    );
    const byWorkout = new Map<string, WorkoutSet[]>();
    for (const s of sets) {
      const arr = byWorkout.get(s.workoutId) ?? [];
      arr.push(s);
      byWorkout.set(s.workoutId, arr);
    }
    return [...byWorkout.entries()]
      .map(([workoutId, list]) => {
        const workout = workouts.find((w) => w.id === workoutId);
        const best = list.reduce((top, s) => (setE1rm(s) > setE1rm(top) ? s : top), list[0]!);
        return {
          date: workout?.iniciadoEm ?? "",
          sets: list.length,
          bestWeight: best.pesoKg,
          bestReps: best.reps,
          bestE1rm: setE1rm(best),
        };
      })
      .filter((r) => r.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logQ.data, exerciseId]);

  if (logQ.isLoading) return <Skeleton className="h-24 w-full rounded-2xl" />;

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4 text-center">
        <p className="text-sm font-semibold">{t("No history for this exercise yet")}</p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          {t("Log it once and you will see your PR, estimated 1RM and session trend here.")}
        </p>
      </div>
    );
  }

  const prWeight = Math.max(...rows.map((r) => r.bestWeight));
  const bestE1rmValue = Math.max(...rows.map((r) => r.bestE1rm));
  const points = [...rows].reverse().map((r) => r.bestE1rm);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("Heaviest set")} value={formatKg(prWeight)} />
        <Stat label={t("Best e1RM")} value={formatKg(bestE1rmValue)} />
        <Stat label={t("Sessions")} value={String(rows.length)} />
      </div>

      {points.length > 1 ? <Sparkline points={points} /> : null}

      <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
        {rows.slice(0, 6).map((r) => (
          <li key={r.date} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <span className="text-xs text-muted-foreground first-letter:uppercase">
              {relativeDays(r.date)}
            </span>
            <span className="text-xs font-semibold tabular-nums">
              {t("{sets} sets · {weight} x {reps}", {
                sets: r.sets,
                weight: formatKg(r.bestWeight),
                reps: r.bestReps,
              })}
              <span className="ml-2 text-muted-foreground">
                {t("e1RM {value}", { value: formatKg(r.bestE1rm) })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="label-caps">{label}</p>
      <p className="mt-1 whitespace-nowrap font-display text-base font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 26 - ((p - min) / span) * 22;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-10 w-full rounded-2xl border border-border bg-card px-2 py-1"
    >
      <path d={path} fill="none" stroke="currentColor" className="text-primary" strokeWidth={2} />
    </svg>
  );
}
