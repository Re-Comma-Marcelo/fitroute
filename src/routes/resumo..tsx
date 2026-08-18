import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWorkout, getWorkoutSets } from "@/lib/data/workouts";
import { formatDurationShort, formatKg } from "@/lib/format";

export const Route = createFileRoute("/resumo/$id")({
  head: () => ({
    meta: [
      { title: "Resumo do treino — Forja" },
      {
        name: "description",
        content: "Duração, volume total, séries registradas e recordes batidos na sessão.",
      },
      { property: "og:title", content: "Resumo do treino — Forja" },
      { property: "og:description", content: "Duração, volume, séries e PRs da sua sessão." },
    ],
  }),
  component: SummaryPage,
});

function SummaryPage() {
  const { id } = useParams({ from: "/resumo/$id" });
  const [prs, setPrs] = useState<{ nome: string; pesoKg: number }[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`forja.resumo.${id}`);
      if (raw) setPrs((JSON.parse(raw).prs ?? []) as { nome: string; pesoKg: number }[]);
    } catch {
      setPrs([]);
    }
  }, [id]);

  const workoutQuery = useQuery({ queryKey: ["workout", id], queryFn: () => getWorkout(id) });
  const setsQuery = useQuery({ queryKey: ["workoutSets", id], queryFn: () => getWorkoutSets(id) });

  const workout = workoutQuery.data;
  const sets = setsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Treino concluído</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bom trabalho. Aqui está o resumo.</p>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <Stat label="Duração" value={workout ? formatDurationShort(workout.duracaoSeg) : "—"} />
          <Stat label="Volume total" value={workout ? formatKg(workout.volumeTotalKg) : "—"} />
          <Stat label="Séries" value={String(sets.length)} />
          <Stat label="Exercícios" value={String(new Set(sets.map((s) => s.exerciseId)).size)} />
        </dl>

        <section className="mt-6 rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Trophy className="size-4 text-primary" /> PRs batidos
          </h2>
          {prs.length ? (
            <ul className="mt-3 space-y-2">
              {prs.map((pr) => (
                <li key={pr.nome} className="flex justify-between text-sm font-semibold">
                  <span>{pr.nome}</span>
                  <span className="text-primary">{formatKg(pr.pesoKg)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum recorde hoje — consistência também conta.
            </p>
          )}
        </section>

        {workout?.notas ? (
          <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">{workout.notas}</p>
        ) : null}

        <div className="mt-8 space-y-3">
          <Button asChild className="h-14 w-full text-base font-bold">
            <Link to="/progresso/$id" params={{ id }}>
              Ver detalhes da sessão
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-12 w-full font-semibold">
            <Link to="/treino">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
