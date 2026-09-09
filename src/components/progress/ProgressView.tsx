import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Flame, Plus } from "lucide-react";
import { KeyLiftsSection, type KeyLiftRow } from "@/components/KeyLiftsSection";
import { PlateauCoachCard } from "@/components/PlateauCoachCard";
import { ProgressTrendChart } from "@/components/ProgressTrendChart";
import { TrackedLiftPickerSheet } from "@/components/TrackedLiftPickerSheet";
import { ManualWorkoutSheet } from "@/components/ManualWorkoutSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/QueryError";
import { BodyWeightCard } from "@/components/BodyWeightCard";
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
import { MuscleVolumeCard } from "@/components/MuscleVolumeCard";
import { CoachNotesCard } from "@/components/CoachNotesCard";
import { PersonalRecordsCard } from "@/components/PersonalRecordsCard";
import { ExerciseCompareCard } from "@/components/ExerciseCompareCard";
import { WeekSummaryCard } from "@/components/WeekSummaryCard";
import { weekSummary } from "@/lib/week-summary";
import { EMPTY_TARGETS, getWeeklyTargets, type WeeklyTargets } from "@/lib/weekly-targets";
import { muscleVolumeComparison } from "@/lib/muscle-volume";

import { getWorkouts, getWorkoutLog } from "@/lib/data/workouts";
import { getRoutines } from "@/lib/data/routines";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { getTrackedLifts, setTrackedLift } from "@/lib/data/tracked-lifts";
import { detectPlateau } from "@/lib/coach/plateau";
import { useT } from "@/lib/i18n";
import {
 adherence,
 liftTrend,
 monthComparison,
 weeklySeries,
 type StatDelta,
} from "@/lib/progress-analytics";
import { formatDateLong, formatDurationShort, formatKg } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Link } from "@tanstack/react-router";

export function ProgressView() {
 const t = useT();
 const queryClient = useQueryClient();
 const [pickerOpen, setPickerOpen] = useState(false);
 const [manualOpen, setManualOpen] = useState(false);
 const [weeks, setWeeks] = useState<4 | 8 | 12>(8);
 const [routineFilter, setRoutineFilter] = useState<string | null>(null);
 // Local-only weekly targets: read after hydration to keep SSR markup stable.
 const [targets, setTargets] = useState<WeeklyTargets>(EMPTY_TARGETS);
 useEffect(() => setTargets(getWeeklyTargets()), []);

 const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
 const logQuery = useQuery({ queryKey: ["workout-log"], queryFn: getWorkoutLog });
 const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
 const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
 const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
 const trackedQuery = useQuery({ queryKey: ["tracked-lifts"], queryFn: getTrackedLifts });

 const allWorkouts = workoutsQuery.data ?? [];
 const sets = logQuery.data?.sets ?? [];
 const routines = routinesQuery.data ?? [];
 const exercises = exercisesQuery.data ?? [];
 const trackedIds = trackedQuery.data ?? [];
 const weeklyTarget = profileQuery.data?.metaTreinosSemana ?? 4;

 /** Filters scope every metric below: one routine and a rolling week window. */
 const workouts = useMemo(() => {
 const since = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;
 return allWorkouts.filter(
 (w) =>
 (!routineFilter || w.routineId === routineFilter) &&
 new Date(w.iniciadoEm).getTime() >= since,
 );
 }, [allWorkouts, routineFilter, weeks]);

 const comparison = useMemo(() => monthComparison(workouts), [workouts]);
 const summary = useMemo(
 () => weekSummary(allWorkouts, sets, exercises),
 [allWorkouts, sets, exercises],
 );

 const muscleRows = useMemo(
 () => muscleVolumeComparison(workouts, sets, exercises),
 [workouts, sets, exercises],
 );
 const consistency = useMemo(() => adherence(workouts, weeklyTarget), [workouts, weeklyTarget]);
 const series = useMemo(
 () => weeklySeries(workouts, weeks, new Date(), sets),
 [workouts, weeks, sets],
 );
 const plateau = useMemo(
 () =>
 trackedIds.length && workouts.length && sets.length
 ? detectPlateau(trackedIds, exercises, workouts, sets)
 : null,
 [trackedIds, exercises, workouts, sets],
 );
 const liftRows = useMemo<KeyLiftRow[]>(
 () =>
 trackedIds
 .map((id) => {
 const exercise = exercises.find((e) => e.id === id);
 if (!exercise) return null;
 return { exercise, trend: liftTrend(id, workouts, sets) };
 })
 .filter((r): r is KeyLiftRow => r !== null),
 [trackedIds, exercises, workouts, sets],
 );

 const loading = workoutsQuery.isLoading || logQuery.isLoading;

 async function toggleLift(exerciseId: string, tracked: boolean) {
 await setTrackedLift(exerciseId, tracked);
 await queryClient.invalidateQueries({ queryKey: ["tracked-lifts"] });
 }

 return (
 <>
 {workoutsQuery.isError || logQuery.isError ? (
 <QueryError
 message={t("Could not load your progress.")}
 onRetry={() => {
 void workoutsQuery.refetch();
 void logQuery.refetch();
 }}
 />
 ) : null}

 <div className="mb-4 space-y-2">
 <div className="flex gap-2">
 {([4, 8, 12] as const).map((option) => (
 <Chip key={option} active={weeks === option} onClick={() => setWeeks(option)}>
 {t("{weeks}w", { weeks: option })}
 </Chip>
 ))}
 </div>
 {routines.length > 1 ? (
 <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
 <Chip active={routineFilter === null} onClick={() => setRoutineFilter(null)}>
 {t("All routines")}
 </Chip>
 {routines.map((r) => (
 <Chip
 key={r.id}
 active={routineFilter === r.id}
 onClick={() => setRoutineFilter(r.id)}
 >
 {r.nome}
 </Chip>
 ))}
 </div>
 ) : null}
 </div>

 {loading ? (
 <div className="space-y-3">
 <Skeleton className="h-20 w-full rounded-lg" />
 <Skeleton className="h-12 w-full rounded-lg" />
 <Skeleton className="h-44 w-full rounded-lg" />
 </div>
 ) : (
 <>
 {/* Trajectory headline: the one-line answer to "am I moving forward?" */}
 <p className="mb-2 text-sm font-semibold">
 {comparison.previous === null
 ? t("This month so far — keep logging to compare with last month.")
 : (comparison.volumeDelta?.pct ?? 0) >= 5
 ? t("You vs last month: volume up {pct}%", {
 pct: Math.abs(Math.round(comparison.volumeDelta?.pct ?? 0)),
 })
 : (comparison.volumeDelta?.pct ?? 0) <= -5
 ? t("You vs last month: volume down {pct}%", {
 pct: Math.abs(Math.round(comparison.volumeDelta?.pct ?? 0)),
 })
 : t("You vs last month: holding steady")}
 </p>
 <dl className="grid grid-cols-3 gap-2">
 <Stat
 label={t("Sessions")}
 value={String(comparison.current.sessions)}
 delta={comparison.sessionsDelta}
 unit=""
 />
 <Stat
 label={t("Volume")}
 value={`${Math.round(comparison.current.volume / 1000)}t`}
 delta={comparison.volumeDelta}
 percentOnly
 />
 <Stat
 label={t("Avg duration")}
 value={
 comparison.current.sessions
 ? formatDurationShort(comparison.current.avgDurationSeg)
 : "—"
 }
 delta={comparison.durationDelta}
 percentOnly
 />
 </dl>

 <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-4 py-3">
 <Flame
 className={cn(
 "size-4 shrink-0",
 consistency.streakWeeks > 0 ? "text-steel" : "text-muted-foreground",
 )}
 />
 <p className="text-xs leading-snug text-muted-foreground">
 <span className="font-semibold text-foreground tabular-nums">
 {t("{done} of {planned}", {
 done: consistency.done,
 planned: consistency.planned,
 })}
 </span>{" "}
 {t("planned sessions this month")}
 {consistency.streakWeeks > 0 ? (
 <>
 {" · "}
 <span className="font-semibold text-steel tabular-nums">
 {t("{streakWeeks}-week streak", {
 streakWeeks: consistency.streakWeeks,
 })}
 </span>
 </>
 ) : null}
 </p>
 </div>

 <WeekSummaryCard summary={summary} targets={targets} />

 <ProgressTrendChart data={series} />

 <MuscleVolumeCard rows={muscleRows} />

 {plateau ? <PlateauCoachCard flag={plateau} /> : null}

 <KeyLiftsSection
 rows={liftRows}
 onAdd={() => setPickerOpen(true)}
 onRemove={(id) => void toggleLift(id, false)}
 />

 <PersonalRecordsCard workouts={workouts} sets={sets} exercises={exercises} />

 <ExerciseCompareCard workouts={workouts} sets={sets} exercises={exercises} />
 </>
 )}

 <div className="mt-6 space-y-3">
 <BodyWeightCard />
 <CoachNotesCard />
 {allWorkouts.length ? <WorkoutCalendar workouts={workouts} /> : null}
 </div>

 <h2 className="label-caps mt-8 mb-3">{t("History")}</h2>

 {!workouts.length && !loading ? (
 <div className="rounded-lg border border-dashed border-border p-5 text-center">
 <p className="font-display text-sm font-semibold">{t("No workout logged yet")}</p>
 <p className="mt-1 text-xs leading-snug text-muted-foreground">
 {t(
 "This screen tracks how your volume, streak and key lifts move over time. Log one session to start the trend.",
 )}
 </p>
 <Button asChild className="tap-target mt-3">
 <Link to="/treino">{t("Start a workout")}</Link>
 </Button>
 </div>
 ) : null}

 <ul className="space-y-2">
 {workouts.map((w) => (
 <li key={w.id}>
 <Link
 to="/progresso/$id"
 params={{ id: w.id }}
 className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
 >
 <div className="flex-1">
 <p className="font-display text-base font-semibold leading-tight">
 {routines.find((r) => r.id === w.routineId)?.nome ?? t("Blank workout")}
 </p>
 <p className="mt-0.5 text-xs text-muted-foreground/80 first-letter:uppercase">
 {formatDateLong(w.iniciadoEm)}
 </p>
 <div className="mt-1.5 flex flex-wrap gap-1">
 {Array.from(
 new Set(
 sets
 .filter((s) => s.workoutId === w.id)
 .map((s) => exercises.find((e) => e.id === s.exerciseId)?.grupoPrimario)
 .filter((g): g is string => Boolean(g)),
 ),
 ).map((g) => (
 <span
 key={g}
 className="rounded-sm bg-steel/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel"
 >
 {g}
 </span>
 ))}
 </div>
 <p className="mt-1 text-xs font-semibold text-muted-foreground">
 {formatDurationShort(w.duracaoSeg)} · {formatKg(w.volumeTotalKg)}
 </p>
 </div>
 <ChevronRight className="size-5 text-muted-foreground" />
 </Link>
 </li>
 ))}
 </ul>

 <Button
 variant="outline"
 className="tap-target mt-3 w-full"
 onClick={() => setManualOpen(true)}
 >
 <Plus className="size-4" /> {t("Log a past workout")}
 </Button>

 <TrackedLiftPickerSheet
 open={pickerOpen}
 trackedIds={trackedIds}
 onOpenChange={setPickerOpen}
 onToggle={(id, tracked) => void toggleLift(id, tracked)}
 />

 <ManualWorkoutSheet
 open={manualOpen}
 onOpenChange={setManualOpen}
 routines={routines}
 exercises={exercises}
 />
 </>
 );
}

function Chip({
 active,
 onClick,
 children,
}: {
 active: boolean;
 onClick: () => void;
 children: React.ReactNode;
}) {
 return (
 <button
 type="button"
 onClick={onClick}
 className={cn(
 "tap-target shrink-0 rounded-sm border px-4 py-2 text-xs font-semibold transition-colors",
 active
 ? "border-primary/60 bg-primary/15 text-primary"
 : "border-border bg-card text-muted-foreground",
 )}
 >
 {children}
 </button>
 );
}

function Stat({
 label,
 value,
 delta,
 unit = "",
 percentOnly = false,
}: {
 label: string;
 value: string;
 delta?: StatDelta | null;
 unit?: string;
 percentOnly?: boolean;
}) {
 const t = useT();
 return (
 <div className="rounded-lg border border-border bg-card p-3">
 <dt className="label-caps">{label}</dt>
 <dd className="font-display mt-1 whitespace-nowrap text-lg font-semibold tabular-nums">
 {value}
 </dd>
 {delta ? (
 <dd
 className={cn(
 "mt-0.5 text-[11px] font-semibold tabular-nums",
 delta.diff > 0 && "text-emerald-400",
 delta.diff < 0 && "text-oxide",
 delta.diff === 0 && "text-muted-foreground",
 )}
 >
 {deltaLabel(t, delta, unit, percentOnly)}
 </dd>
 ) : null}
 </div>
 );
}

function deltaLabel(
 t: ReturnType<typeof useT>,
 delta: StatDelta,
 unit: string,
 percentOnly: boolean,
): string {
 if (delta.diff === 0) return t("same as last month");
 const sign = delta.diff > 0 ? "+" : "−";
 if (percentOnly && delta.pct !== null) {
 return t("{sign}{pct}% vs last month", {
 sign,
 pct: Math.abs(Math.round(delta.pct)),
 });
 }
 const abs = Math.abs(Math.round(delta.diff * 10) / 10);
 return t("{sign}{diff}{unit} vs last month", { sign, diff: abs, unit });
}
