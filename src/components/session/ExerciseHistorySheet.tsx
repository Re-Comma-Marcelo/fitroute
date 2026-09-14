import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QueryError } from "@/components/QueryError";
import { getExerciseHistory, getWorkouts } from "@/lib/data/workouts";
import { formatDateLong } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { ActiveExercise } from "@/lib/session-state";
import type { WorkoutSet } from "@/lib/types";
import { toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";

/** Last loads for one exercise, opened from the exercise menu during a session. */
export function ExerciseHistorySheet({
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
                    .map((set) => {
                      const line = `${toDisplayWeight(set.pesoKg, unit)} ${unit} × ${set.reps}`;
                      return (
                        <li key={set.id} className="text-sm tabular-nums">
                          <span className="text-muted-foreground">{set.serieNum}.</span> {line}
                          {set.rpe ? (
                            <span className="text-muted-foreground">
                              {" "}
                              {t("@ {rpe} rpe", { rpe: set.rpe })}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
