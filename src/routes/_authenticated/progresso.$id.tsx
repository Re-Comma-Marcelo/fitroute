import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { getExercises } from "@/lib/data/exercises";
import {
  deleteWorkout,
  getExerciseHistory,
  getWorkout,
  getWorkoutSets,
  getWorkouts,
  saveWorkout,
} from "@/lib/data/workouts";
import {
  formatDate,
  formatDateLong,
  formatDurationShort,
  formatKg,
  weightUnitLabel,
} from "@/lib/format";
import { fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { setE1rm } from "@/lib/e1rm";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { useT } from "@/lib/i18n";
import type { WorkoutSet } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/progresso/$id")({
  head: () => ({
    meta: pageMeta({
      title: "Logged session",
      description: "All sets logged in the session and load progression for each exercise.",
      ogDescription: "Sets, loads and progression chart per exercise.",
    }),
  }),
  component: WorkoutDetail,
});

function WorkoutDetail() {
  const t = useT();
  const { id } = useParams({ from: "/_authenticated/progresso/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { unit } = useWeightUnit();

  const workoutQuery = useQuery({ queryKey: ["workout", id], queryFn: () => getWorkout(id) });
  const setsQuery = useQuery({ queryKey: ["workoutSets", id], queryFn: () => getWorkoutSets(id) });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const allWorkoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });

  const sets = setsQuery.data ?? [];
  const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftSets, setDraftSets] = useState<WorkoutSet[]>([]);
  const [draftNotes, setDraftNotes] = useState("");

  // Fresh copy every time edit mode opens, so cancel really cancels.
  useEffect(() => {
    if (!editing) return;
    setDraftSets(sets.map((s) => ({ ...s })));
    setDraftNotes(workoutQuery.data?.notas ?? "");
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const histories = useQueries({
    queries: exerciseIds.map((exId) => ({
      queryKey: ["exerciseHistory", exId],
      queryFn: () => getExerciseHistory(exId),
    })),
  });

  const exerciseName = (exId: string) =>
    exercisesQuery.data?.find((e) => e.id === exId)?.nome ?? t("Exercise");

  const dataDe = (workoutId: string) =>
    allWorkoutsQuery.data?.find((w) => w.id === workoutId)?.iniciadoEm ?? "";

  const workout = workoutQuery.data;

  function patchDraft(setId: string, field: "pesoKg" | "reps", raw: string) {
    const parsed = Number(raw.replace(",", "."));
    setDraftSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              [field]:
                field === "pesoKg"
                  ? Number.isNaN(parsed)
                    ? s.pesoKg
                    : Math.round(fromDisplayWeight(parsed, unit) * 1000) / 1000
                  : Number.isNaN(parsed)
                    ? s.reps
                    : Math.max(0, Math.round(parsed)),
            }
          : s,
      ),
    );
  }

  async function saveEdits() {
    if (!workout) return;
    setSaving(true);
    try {
      const volume = draftSets
        .filter((s) => s.tipoSerie !== "aquecimento")
        .reduce((total, s) => total + s.pesoKg * s.reps, 0);
      await saveWorkout(
        { ...workout, notas: draftNotes, volumeTotalKg: Math.round(volume) },
        draftSets,
      );
      await queryClient.invalidateQueries();
      setEditing(false);
      toast.success(t("Session updated."));
    } catch {
      toast.error(t("Could not update the session. Try again in a moment."));
    } finally {
      setSaving(false);
    }
  }

  async function removeWorkout() {
    try {
      await deleteWorkout(id);
      await queryClient.invalidateQueries();
      toast.success(t("Session deleted."));
      navigate({ to: "/progresso", replace: true });
    } catch {
      toast.error(t("Could not delete the session. Try again in a moment."));
    }
  }

  const shownSets = editing ? draftSets : sets;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader
        title={t("Session")}
        left={
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            aria-label={t("Back")}
            onClick={() => navigate({ to: "/progresso" })}
          >
            <ArrowLeft className="size-6" />
          </Button>
        }
        right={
          editing ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="tap-target"
                aria-label={t("Cancel")}
                onClick={() => setEditing(false)}
              >
                <X className="size-5" />
              </Button>
              <Button
                size="icon"
                className="tap-target"
                disabled={saving}
                aria-label={t("Save")}
                onClick={() => void saveEdits()}
              >
                <Check className="size-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="tap-target"
                aria-label={t("Edit session")}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target text-destructive"
                    aria-label={t("Delete session")}
                  >
                    <Trash2 className="size-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("Delete this session?")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("The sets logged here are removed from your history for good.")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="tap-target">{t("Cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="tap-target bg-destructive text-destructive-foreground"
                      onClick={() => void removeWorkout()}
                    >
                      {t("Delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )
        }
      />

      <div className="mx-auto max-w-md space-y-4 px-4 py-4">
        {workout ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {formatDateLong(workout.iniciadoEm)}
            </p>
            <p className="mt-2 text-base font-semibold">
              {formatDurationShort(workout.duracaoSeg)} · {formatKg(workout.volumeTotalKg)} ·{" "}
              {t("{count} sets", { count: sets.length })}
            </p>
            {editing ? (
              <Textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder={t("How did this session feel?")}
                className="mt-3"
              />
            ) : workout.notas ? (
              <p className="mt-2 text-sm">{workout.notas}</p>
            ) : null}
          </div>
        ) : null}

        {exerciseIds.map((exId, i) => {
          const exSets = shownSets.filter((s) => s.exerciseId === exId);
          const history = histories[i]?.data ?? [];
          const porTreino = new Map<string, number>();
          history.forEach((s) => {
            if (s.tipoSerie === "aquecimento") return;
            porTreino.set(s.workoutId, Math.max(porTreino.get(s.workoutId) ?? 0, s.pesoKg));
          });
          const chartData = [...porTreino.entries()].map(([workoutId, pesoKg]) => ({
            data: dataDe(workoutId) ? formatDate(dataDe(workoutId)) : "",
            pesoKg: Math.round(toDisplayWeight(pesoKg, unit) * 10) / 10,
          }));

          return (
            <section key={exId} className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-base font-semibold">{exerciseName(exId)}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {exSets.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 tabular-nums">
                    <span className="text-muted-foreground">
                      {s.tipoSerie === "aquecimento"
                        ? t("Warm-up")
                        : t("Set {num}", { num: s.serieNum })}
                    </span>
                    {editing ? (
                      <span className="flex items-center gap-1">
                        <Input
                          value={String(Math.round(toDisplayWeight(s.pesoKg, unit) * 100) / 100)}
                          onChange={(e) => patchDraft(s.id, "pesoKg", e.target.value)}
                          inputMode="decimal"
                          aria-label={t("Weight in {unit}", { unit: weightUnitLabel() })}
                          className="numeric-field h-11 w-20 text-center"
                        />
                        <span className="text-xs text-muted-foreground">×</span>
                        <Input
                          value={String(s.reps)}
                          onChange={(e) => patchDraft(s.id, "reps", e.target.value)}
                          inputMode="numeric"
                          aria-label={t("Reps")}
                          className="numeric-field h-11 w-16 text-center"
                        />
                      </span>
                    ) : (
                      <span className="font-semibold">
                        {formatKg(s.pesoKg)} × {s.reps}
                        {s.rpe ? ` · RPE ${s.rpe}` : ""}
                        {setE1rm(s) > 0 ? (
                          <span className="ml-2 font-normal text-muted-foreground">
                            {t("e1RM {value}", { value: formatKg(setE1rm(s)) })}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {chartData.length > 1 ? (
                <div className="mt-4 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="data" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        width={46}
                        tickMargin={4}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          color: "var(--popover-foreground)",
                        }}
                        formatter={(value) => [`${value} ${weightUnitLabel()}`, t("Load")]}
                      />
                      <Line
                        type="monotone"
                        dataKey="pesoKg"
                        stroke="var(--train)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "var(--train)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("Log one more session to see the progression chart.")}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
