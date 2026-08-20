import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getWorkouts } from "@/lib/data/workouts";
import { getRoutines } from "@/lib/data/routines";
import { formatDateLong, formatDurationShort, formatKg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/progresso/")({
  head: () => ({
    meta: [
      { title: "Progresso — Forja" },
      {
        name: "description",
        content: "Histórico de sessões com duração, volume total e evolução de carga por exercício.",
      },
      { property: "og:title", content: "Progresso — Forja" },
      { property: "og:description", content: "Histórico de treinos e gráficos de evolução de carga." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const workouts = workoutsQuery.data ?? [];
  const routines = routinesQuery.data ?? [];

  const volumeTotal = workouts.reduce((sum, w) => sum + w.volumeTotalKg, 0);

  return (
    <AppShell title="Progresso">
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Sessões" value={String(workouts.length)} />
        <Stat label="Volume" value={`${Math.round(volumeTotal / 1000)}t`} />
        <Stat
          label="Média"
          value={
            workouts.length
              ? formatDurationShort(
                  workouts.reduce((s, w) => s + w.duracaoSeg, 0) / workouts.length,
                )
              : "—"
          }
        />
      </dl>

      <h2 className="label-caps mt-8 mb-3">Histórico</h2>

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
                  {routines.find((r) => r.id === w.routineId)?.nome ?? "Treino em branco"}
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
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <dt className="label-caps">{label}</dt>
      <dd className="font-display mt-1 whitespace-nowrap text-lg font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}
