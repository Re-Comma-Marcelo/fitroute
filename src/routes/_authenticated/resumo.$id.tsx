import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWorkout, getWorkoutSets } from "@/lib/data/workouts";
import { formatDurationShort, formatKg } from "@/lib/format";
import heroLogin from "@/assets/hero-login.jpg";

export const Route = createFileRoute("/_authenticated/resumo/$id")({
  head: () => ({
    meta: [
      { title: "Workout summary — Forja" },
      {
        name: "description",
        content: "Duration, total volume, logged sets and personal records hit in this session.",
      },
      { property: "og:title", content: "Workout summary — Forja" },
      { property: "og:description", content: "Duration, volume, sets and PRs from your session." },
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
    <div className="relative min-h-screen bg-background px-4 py-10">
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
        <p className="label-caps">Session finished</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Workout done</h1>
        <p className="mt-1 text-sm text-muted-foreground">Good work. Here is the summary.</p>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <Stat label="Duration" value={workout ? formatDurationShort(workout.duracaoSeg) : "—"} />
          <Stat label="Total volume" value={workout ? formatKg(workout.volumeTotalKg) : "—"} />
          <Stat label="Sets" value={String(sets.length)} />
          <Stat label="Exercises" value={String(new Set(sets.map((s) => s.exerciseId)).size)} />
        </dl>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="label-caps flex items-center gap-2">
            <Trophy className="size-4 text-primary" /> PRs hit
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
              No records today — consistency also counts.
            </p>
          )}
        </section>

        {workout?.notas ? (
          <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">{workout.notas}</p>
        ) : null}

        <div className="mt-8 space-y-3">
          <Button asChild className="shadow-elegant h-14 w-full text-base font-semibold">
            <Link to="/progresso/$id" params={{ id }}>
              View session details
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-12 w-full text-sm font-medium text-muted-foreground">
            <Link to="/treino">Back to start</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <dt className="label-caps">{label}</dt>
      <dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
