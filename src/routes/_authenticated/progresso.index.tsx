import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { KeyLiftsSection, type KeyLiftRow } from "@/components/KeyLiftsSection";
import { PlateauCoachCard } from "@/components/PlateauCoachCard";
import { ProgressTrendChart } from "@/components/ProgressTrendChart";
import { TrackedLiftPickerSheet } from "@/components/TrackedLiftPickerSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkouts, getWorkoutLog } from "@/lib/data/workouts";
import { getRoutines } from "@/lib/data/routines";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { getTrackedLifts, setTrackedLift } from "@/lib/data/tracked-lifts";
import { detectPlateau } from "@/lib/coach/plateau";
import {
  adherence,
  liftTrend,
  monthComparison,
  weeklySeries,
  type StatDelta,
} from "@/lib/progress-analytics";
import { formatDateLong, formatDurationShort, formatKg } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/progresso/")({
  head: () => ({
    meta: [
      { title: "Progress — Forja" },
      {
        name: "description",
        content:
          "See your training trajectory: weekly volume trend, key lift progression and coach plateau alerts.",
      },
      { property: "og:title", content: "Progress — Forja" },
      {
        property: "og:description",
        content: "Weekly volume trend, tracked lift progression and session history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const logQuery = useQuery({ queryKey: ["workout-log"], queryFn: getWorkoutLog });
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const trackedQuery = useQuery({ queryKey: ["tracked-lifts"], queryFn: getTrackedLifts });

  const workouts = workoutsQuery.data ?? [];
  const sets = logQuery.data?.sets ?? [];
  const routines = routinesQuery.data ?? [];
  const exercises = exercisesQuery.data ?? [];
  const trackedIds = trackedQuery.data ?? [];
  const weeklyTarget = profileQuery.data?.metaTreinosSemana ?? 4;

  const comparison = useMemo(() => monthComparison(workouts), [workouts]);
  const consistency = useMemo(
    () => adherence(workouts, weeklyTarget),
    [workouts, weeklyTarget],
  );
  const series = useMemo(() => weeklySeries(workouts, 8), [workouts]);
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
    <AppShell title={t("Progress")}>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : (
        <>
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

          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
            <Flame
              className={cn(
                "size-4 shrink-0",
                consistency.streakWeeks > 0 ? "text-primary" : "text-muted-foreground",
              )}
            />
            <p className="text-xs leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">
                t("{done} of {planned}", { done: consistency.done, planned: consistency.planned })
              </span>{" "}
              t("planned sessions this month")
              {consistency.streakWeeks > 0 ? (
                <>
                  {" · "}
                  <span className="font-semibold text-primary tabular-nums">
                    t("{streakWeeks}-week streak", { streakWeeks: consistency.streakWeeks })
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <ProgressTrendChart data={series} />

          {plateau ? <PlateauCoachCard flag={plateau} /> : null}

          <KeyLiftsSection
            rows={liftRows}
            onAdd={() => setPickerOpen(true)}
            onRemove={(id) => void toggleLift(id, false)}
          />
        </>
      )}

      <h2 className="label-caps mt-8 mb-3">{t("History")}</h2>

      <ul className="space-y-2">
        {workouts.map((w) => (
          <li key={w.id}>
            <Link
              to="/progresso/$id"
              params={{ id: w.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex-1">
                <p className="font-display text-base font-semibold leading-tight">
                  {routines.find((r) => r.id === w.routineId)?.nome ?? t("Blank workout")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/80 first-letter:uppercase">
                  {formatDateLong(w.iniciadoEm)}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {formatDurationShort(w.duracaoSeg)} · {formatKg(w.volumeTotalKg)}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <TrackedLiftPickerSheet
        open={pickerOpen}
        trackedIds={trackedIds}
        onOpenChange={setPickerOpen}
        onToggle={(id, tracked) => void toggleLift(id, tracked)}
      />
    </AppShell>
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
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <dt className="label-caps">{label}</dt>
      <dd className="font-display mt-1 whitespace-nowrap text-lg font-semibold tabular-nums">
        {value}
      </dd>
      {delta ? (
        <dd
          className={cn(
            "mt-0.5 text-[11px] font-semibold tabular-nums",
            delta.diff > 0 && "text-emerald-400",
            delta.diff < 0 && "text-destructive",
            delta.diff === 0 && "text-muted-foreground",
          )}
        >
          {deltaLabel(t, delta, unit, percentOnly)}
        </dd>
      ) : null}
    </div>
  );
}

function deltaLabel(t: ReturnType<typeof useT>, delta: StatDelta, unit: string, percentOnly: boolean): string {
  if (delta.diff === 0) return t("same as last month");
  const sign = delta.diff > 0 ? "+" : "−";
  if (percentOnly && delta.pct !== null) {
    return t("{sign}{pct}% vs last month", { sign, pct: Math.abs(Math.round(delta.pct)) });
  }
  const abs = Math.abs(Math.round(delta.diff * 10) / 10);
  return t("{sign}{diff}{unit} vs last month", { sign, diff: abs, unit });
}
