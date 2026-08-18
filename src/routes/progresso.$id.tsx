import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
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
import { getExercises } from "@/lib/data/exercises";
import { getExerciseHistory, getWorkout, getWorkoutSets, getWorkouts } from "@/lib/data/workouts";
import { formatDate, formatDateLong, formatDurationShort, formatKg } from "@/lib/format";

export const Route = createFileRoute("/progresso/$id")({
  head: () => ({
    meta: [
      { title: "Sessão registrada — Forja" },
      {
        name: "description",
        content: "Todas as séries registradas na sessão e a evolução de carga de cada exercício.",
      },
      { property: "og:title", content: "Sessão registrada — Forja" },
      { property: "og:description", content: "Séries, cargas e gráfico de evolução por exercício." },
    ],
  }),
  component: WorkoutDetail,
});

function WorkoutDetail() {
  const { id } = useParams({ from: "/progresso/$id" });
  const navigate = useNavigate();

  const workoutQuery = useQuery({ queryKey: ["workout", id], queryFn: () => getWorkout(id) });
  const setsQuery = useQuery({ queryKey: ["workoutSets", id], queryFn: () => getWorkoutSets(id) });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const allWorkoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });

  const sets = setsQuery.data ?? [];
  const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];

  const histories = useQueries({
    queries: exerciseIds.map((exId) => ({
      queryKey: ["exerciseHistory", exId],
      queryFn: () => getExerciseHistory(exId),
    })),
  });

  const nomeDe = (exId: string) =>
    exercisesQuery.data?.find((e) => e.id === exId)?.nome ?? "Exercício";

  const dataDe = (workoutId: string) =>
    allWorkoutsQuery.data?.find((w) => w.id === workoutId)?.iniciadoEm ?? "";

  const workout = workoutQuery.data;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader
        title="Sessão"
        left={
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            aria-label="Voltar"
            onClick={() => navigate({ to: "/progresso" })}
          >
            <ArrowLeft className="size-6" />
          </Button>
        }
      />

      <div className="mx-auto max-w-md space-y-4 px-4 py-4">
        {workout ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground first-letter:uppercase">{formatDateLong(workout.iniciadoEm)}</p>
            <p className="mt-2 text-base font-bold">
              {formatDurationShort(workout.duracaoSeg)} · {formatKg(workout.volumeTotalKg)} ·{" "}
              {sets.length} séries
            </p>
            {workout.notas ? <p className="mt-2 text-sm">{workout.notas}</p> : null}
          </div>
        ) : null}

        {exerciseIds.map((exId, i) => {
          const exSets = sets.filter((s) => s.exerciseId === exId);
          const history = histories[i]?.data ?? [];
          const porTreino = new Map<string, number>();
          history.forEach((s) => {
            if (s.tipoSerie === "aquecimento") return;
            porTreino.set(s.workoutId, Math.max(porTreino.get(s.workoutId) ?? 0, s.pesoKg));
          });
          const chartData = [...porTreino.entries()].map(([workoutId, pesoKg]) => ({
            data: dataDe(workoutId) ? formatDate(dataDe(workoutId)) : "",
            pesoKg,
          }));

          return (
            <section key={exId} className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-base font-bold">{nomeDe(exId)}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {exSets.map((s) => (
                  <li key={s.id} className="flex justify-between tabular-nums">
                    <span className="text-muted-foreground">
                      {s.tipoSerie === "aquecimento" ? "Aquec." : `Série ${s.serieNum}`}
                    </span>
                    <span className="font-semibold">
                      {s.pesoKg} kg × {s.reps}
                      {s.rpe ? ` · RPE ${s.rpe}` : ""}
                    </span>
                  </li>
                ))}
              </ul>

              {chartData.length > 1 ? (
                <div className="mt-4 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="data" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} width={40} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          color: "var(--popover-foreground)",
                        }}
                        formatter={(value) => [`${value} kg`, "Carga"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="pesoKg"
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "var(--primary)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Registre mais uma sessão para ver o gráfico de evolução.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
