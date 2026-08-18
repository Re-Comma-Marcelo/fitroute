import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronRight, Dumbbell, Play, Plus, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { getRoutines } from "@/lib/data/routines";
import { getWorkouts } from "@/lib/data/workouts";
import { formatDurationShort, relativeDays } from "@/lib/format";
import { getRoutineSuggestions } from "@/lib/routine-progression";
import { loadActiveSession, type ActiveSession } from "@/lib/session-state";
import { startBlankSession, startRoutineSession } from "@/lib/start-session";
import type { ProgressionSuggestion } from "@/lib/progression";

export const Route = createFileRoute("/treino")({
  head: () => ({
    meta: [
      { title: "Treino — Forja" },
      {
        name: "description",
        content: "Suas rotinas salvas, meta semanal de treinos e início rápido de sessão.",
      },
      { property: "og:title", content: "Treino — Forja" },
      { property: "og:description", content: "Rotinas salvas, meta semanal e início rápido de treino." },
    ],
  }),
  component: HomePage,
});

function inicioDaSemana(): number {
  const hoje = new Date();
  const dia = (hoje.getDay() + 6) % 7; // segunda = 0
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - dia);
  return segunda.getTime();
}

function HomePage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => setActive(loadActiveSession()), []);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const rotinas = routinesQuery.data ?? [];
  const workouts = workoutsQuery.data ?? [];
  const exercises = exercisesQuery.data ?? [];

  const suggestionsQuery = useQuery({
    queryKey: ["routine-suggestions", rotinas.map((r) => r.id).join("|")],
    enabled: rotinas.length > 0,
    queryFn: async () => {
      const out: Record<string, ProgressionSuggestion> = {};
      for (const r of rotinas) Object.assign(out, await getRoutineSuggestions(r));
      return out;
    },
  });
  const sugestoes = suggestionsQuery.data ?? {};

  const meta = profileQuery.data?.metaTreinosSemana ?? 4;
  const inicio = inicioDaSemana();
  const feitosSemana = workouts.filter((w) => new Date(w.iniciadoEm).getTime() >= inicio).length;

  function ultimoDaRotina(routineId: string) {
    return workouts.find((w) => w.routineId === routineId);
  }

  async function iniciarRotina(routineId: string) {
    if (active) {
      navigate({ to: "/sessao" });
      return;
    }
    setLoading(routineId);
    await startRoutineSession(routineId);
    navigate({ to: "/sessao" });
  }

  async function iniciarBranco() {
    setLoading("branco");
    await startBlankSession();
    navigate({ to: "/sessao" });
  }

  return (
    <AppShell
      title="Treino"
      action={
        <Button asChild variant="secondary" size="icon" className="tap-target size-11">
          <Link to="/rotina/$id" params={{ id: "nova" }} aria-label="Criar nova rotina">
            <Plus className="size-6" />
          </Link>
        </Button>
      }
    >
      <section className="mb-5 rounded-xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold">Objetivo dos treinos semanais</h2>
          <p className="text-sm font-bold tabular-nums">
            {feitosSemana}/{meta}
          </p>
        </div>
        <div className="mt-3 flex gap-1.5" role="img" aria-label={`${feitosSemana} de ${meta} treinos na semana`}>
          {Array.from({ length: meta }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-full ${i < feitosSemana ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </section>

      <div className="space-y-3">
        <Button
          className="h-16 w-full text-lg font-bold"
          disabled={(!rotinas[0] && !active) || loading !== null}
          onClick={() => (active ? navigate({ to: "/sessao" }) : rotinas[0] && iniciarRotina(rotinas[0].id))}
        >
          <Play className="mr-1 size-6" />
          {active ? "Retomar treino" : `Iniciar treino${rotinas[0] ? ` — ${rotinas[0].nome}` : ""}`}
        </Button>
        {!active ? (
          <Button
            variant="secondary"
            className="h-12 w-full font-semibold"
            disabled={loading !== null}
            onClick={iniciarBranco}
          >
            Treino em branco
          </Button>
        ) : null}
      </div>

      <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Minhas rotinas
      </h2>

      {routinesQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {rotinas.map((r) => {
            const ultimo = ultimoDaRotina(r.id);
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                <Link
                  to="/rotina/$id"
                  params={{ id: r.id }}
                  className="block"
                  aria-label={`Editar rotina ${r.nome}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold leading-tight">{r.nome}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{r.descricao}</p>
                    </div>
                    <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    {r.exercicios.length} exercícios
                    {ultimo
                      ? ` · último ${relativeDays(ultimo.iniciadoEm)} · ${formatDurationShort(ultimo.duracaoSeg)}`
                      : " · nunca treinado"}
                  </p>
                </Link>

                <ul className="mt-3 space-y-2.5">
                  {r.exercicios.map((re) => {
                    const ex = exercises.find((e) => e.id === re.exerciseId);
                    const sug = sugestoes[re.exerciseId];
                    return (
                      <li key={re.id} className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Dumbbell className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">
                              {ex?.nome ?? "Exercício"}
                            </p>
                            {sug ? <SugestaoBadge motivo={sug.motivo} compact /> : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {re.seriesAlvo} séries · {re.repsMin}-{re.repsMax} repetições
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Button
                  className="mt-3 h-12 w-full font-bold"
                  disabled={loading !== null}
                  onClick={() => iniciarRotina(r.id)}
                >
                  {active ? "Retomar treino" : `Iniciar ${r.nome}`}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Button asChild variant="outline" className="mt-4 h-12 w-full font-semibold">
        <Link to="/rotina/$id" params={{ id: "nova" }}>
          <Plus className="mr-1 size-5" /> Nova rotina
        </Link>
      </Button>
    </AppShell>
  );
}

function SugestaoBadge({ motivo, compact }: { motivo: string; compact?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Peso aumentado — ver motivo"
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 text-[11px] font-bold text-primary"
        >
          <TrendingUp className="size-3.5" strokeWidth={3} />
          {compact ? "Peso aumentado" : "Peso aumentado"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 text-sm">
        {motivo}
      </PopoverContent>
    </Popover>
  );
}
