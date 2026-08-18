import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronRight, Play, Plus, Timer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getRoutines } from "@/lib/data/routines";
import { getWorkouts } from "@/lib/data/workouts";
import { formatDurationShort, relativeDays } from "@/lib/format";
import { loadActiveSession, type ActiveSession } from "@/lib/session-state";
import { startBlankSession, startRoutineSession } from "@/lib/start-session";

export const Route = createFileRoute("/treino")({
  head: () => ({
    meta: [
      { title: "Treino — Forja" },
      {
        name: "description",
        content: "Suas rotinas salvas, último treino realizado e início rápido de sessão.",
      },
      { property: "og:title", content: "Treino — Forja" },
      { property: "og:description", content: "Rotinas salvas e início rápido de sessão de treino." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => setActive(loadActiveSession()), []);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });

  const rotinas = routinesQuery.data ?? [];
  const workouts = workoutsQuery.data ?? [];

  function ultimoDaRotina(routineId: string) {
    return workouts.find((w) => w.routineId === routineId);
  }

  async function iniciarRotina(routineId: string) {
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
      {active ? (
        <Link
          to="/sessao"
          className="mb-5 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4"
        >
          <Timer className="size-6 text-primary" />
          <div className="flex-1">
            <p className="font-bold">Treino em andamento</p>
            <p className="text-sm text-muted-foreground">{active.routineNome} — toque para continuar</p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
      ) : null}

      <div className="space-y-3">
        <Button
          className="h-16 w-full text-lg font-bold"
          disabled={!rotinas[0] || loading !== null}
          onClick={() => rotinas[0] && iniciarRotina(rotinas[0].id)}
        >
          <Play className="mr-1 size-6" />
          Iniciar treino {rotinas[0] ? `— ${rotinas[0].nome}` : ""}
        </Button>
        <Button
          variant="secondary"
          className="h-12 w-full font-semibold"
          disabled={loading !== null}
          onClick={iniciarBranco}
        >
          Treino em branco
        </Button>
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
                <Button
                  className="mt-3 h-12 w-full font-bold"
                  disabled={loading !== null}
                  onClick={() => iniciarRotina(r.id)}
                >
                  Iniciar {r.nome}
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
