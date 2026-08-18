import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getWorkouts } from "@/lib/data/workouts";
import { getRoutines } from "@/lib/data/routines";
import { formatDateLong, formatDurationShort, formatKg } from "@/lib/format";

export const Route = createFileRoute("/progresso")({
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

      <h2 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Histórico
      </h2>

      <ul className="space-y-3">
        {workouts.map((w) => (
          <li key={w.id}>
            <Link
              to="/progresso/$id"
              params={{ id: w.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex-1">
                <p className="text-base font-bold leading-tight">
                  {routines.find((r) => r.id === w.routineId)?.nome ?? "Treino em branco"}
                </p>
                <p className="mt-0.5 text-xs capitalize text-muted-foreground">
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
    <div className="rounded-xl border border-border bg-card p-3">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
