import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ChevronRight, Flame, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getRoutines } from "@/lib/data/routines";
import { getWorkouts } from "@/lib/data/workouts";
import { getProfile } from "@/lib/data/profile";
import { formatDurationShort, relativeDays } from "@/lib/format";
import { loadActiveSession, type ActiveSession } from "@/lib/session-state";
import { startBlankSession } from "@/lib/start-session";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Forja" },
      {
        name: "description",
        content:
          "Resumo da sua semana de treinos: sessões, volume total em kg e histórico recente.",
      },
      { property: "og:title", content: "Início — Forja" },
      {
        property: "og:description",
        content: "Resumo semanal de sessões, volume e treinos recentes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InicioPage,
});

function inicioDaSemana(): number {
  const hoje = new Date();
  const dia = (hoje.getDay() + 6) % 7; // segunda = 0
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - dia);
  return segunda.getTime();
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function InicioPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => setActive(loadActiveSession()), []);

  const fetchWorkouts = useServerFn(getWorkouts);
  const fetchRoutines = useServerFn(getRoutines);
  const fetchProfile = useServerFn(getProfile);

  const workoutsQuery = useQuery({
    queryKey: ["workouts"],
    queryFn: () => fetchWorkouts(undefined),
  });
  const routinesQuery = useQuery({
    queryKey: ["routines"],
    queryFn: () => fetchRoutines(undefined),
  });
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(undefined),
  });

  const workouts = workoutsQuery.data ?? [];
  const rotinas = routinesQuery.data ?? [];
  const meta = profileQuery.data?.metaTreinosSemana ?? 4;

  const inicio = inicioDaSemana();
  const daSemana = workouts.filter((w) => new Date(w.iniciadoEm).getTime() >= inicio);
  const volumeSemana = daSemana.reduce((acc, w) => acc + w.volumeTotalKg, 0);
  const tempoSemana = daSemana.reduce((acc, w) => acc + w.duracaoSeg, 0);

  async function continuarOuIniciar() {
    if (active) {
      navigate({ to: "/sessao" });
      return;
    }
    setStarting(true);
    try {
      await startBlankSession();
      navigate({ to: "/sessao" });
    } finally {
      setStarting(false);
    }
  }

  return (
    <AppShell title="Início">
      <section className="mb-6">
        <h2 className="font-display text-4xl font-semibold uppercase tracking-tight">
          Esta semana
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {daSemana.length} {daSemana.length === 1 ? "sessão" : "sessões"} ·{" "}
          {formatDurationShort(tempoSemana)} de treino
        </p>

        <Button
          onClick={continuarOuIniciar}
          disabled={starting}
          className="tap-target mt-4 w-full gap-2 text-base font-semibold"
        >
          {active ? <Flame className="size-5" /> : <Play className="size-5" />}
          {active ? "Retomar treino" : "Iniciar treino"}
        </Button>
      </section>

      <section className="mb-8 grid gap-3">
        <StatCard label="Sessões" value={`${daSemana.length}/${meta}`} />
        <StatCard label="Volume" value={`${Math.round(volumeSemana)} kg`} />
        <StatCard label="Tempo total" value={formatDurationShort(tempoSemana)} />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-2xl font-semibold uppercase tracking-tight">
            Rotinas
          </h3>
          <Link to="/treino" className="text-xs font-medium text-primary">
            ver todas
          </Link>
        </div>
        {rotinas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-5 py-6 text-center text-sm text-muted-foreground">
            Nenhuma rotina criada ainda.
          </p>
        ) : (
          <ul className="grid gap-2">
            {rotinas.slice(0, 3).map((r) => (
              <li key={r.id}>
                <Link
                  to="/rotina/$id"
                  params={{ id: r.id }}
                  className="tap-target flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 px-4 py-3"
                >
                  <span>
                    <span className="block text-sm font-semibold">{r.nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.exercicios.length} exercícios
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-2xl font-semibold uppercase tracking-tight">
          Sessões recentes
        </h3>
        {workouts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-5 py-6 text-center text-sm text-muted-foreground">
            Nenhum treino registrado ainda.
          </p>
        ) : (
          <ul className="grid gap-2">
            {workouts.slice(0, 5).map((w) => (
              <li key={w.id}>
                <Link
                  to="/resumo/$id"
                  params={{ id: w.id }}
                  className="tap-target flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 px-4 py-3"
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {rotinas.find((r) => r.id === w.routineId)?.nome ?? "Treino livre"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {relativeDays(w.iniciadoEm)} · {formatDurationShort(w.duracaoSeg)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {Math.round(w.volumeTotalKg)} kg
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}