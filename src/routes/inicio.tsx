import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronRight, Flame, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoutines } from "@/lib/data/routines";
import { getWorkouts, getWorkoutSets } from "@/lib/data/workouts";
import { getProfile } from "@/lib/data/profile";
import { formatDurationShort, relativeDays } from "@/lib/format";
import { routineCover } from "@/lib/exercise-image";
import { loadActiveSession, type ActiveSession } from "@/lib/session-state";
import { startBlankSession } from "@/lib/start-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Forja" },
      {
        name: "description",
        content:
          "Resumo da sua semana de treinos: objetivo semanal, volume em kg, tempo e sessões recentes.",
      },
      { property: "og:title", content: "Início — Forja" },
      {
        property: "og:description",
        content: "Objetivo semanal, volume, tempo de treino e histórico recente.",
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

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const dataLonga = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "long",
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card/70 px-3 py-3 text-center">
      <p className="label-caps">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function SectionTitle({
  title,
  linkLabel,
  to,
}: {
  title: string;
  linkLabel: string;
  to: "/treino" | "/progresso";
}) {
  return (
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
      <h3 className="truncate font-display text-xl font-semibold uppercase tracking-tight">
        {title}
      </h3>
      <Link to={to} className="text-xs font-medium text-primary">
        {linkLabel}
      </Link>
    </div>
  );
}

function InicioPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => setActive(loadActiveSession()), []);

  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: () => getWorkouts() });
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: () => getRoutines() });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });

  const workouts = workoutsQuery.data ?? [];
  const rotinas = routinesQuery.data ?? [];
  const meta = Math.max(1, profileQuery.data?.metaTreinosSemana ?? 4);

  const inicio = inicioDaSemana();
  const daSemana = workouts.filter((w) => new Date(w.iniciadoEm).getTime() >= inicio);
  const volumeSemana = daSemana.reduce((acc, w) => acc + w.volumeTotalKg, 0);
  const tempoSemana = daSemana.reduce((acc, w) => acc + w.duracaoSeg, 0);

  const idsSemana = daSemana.map((w) => w.id);
  const seriesQuery = useQuery({
    queryKey: ["week-sets", idsSemana],
    enabled: idsSemana.length > 0,
    queryFn: async () => {
      const listas = await Promise.all(idsSemana.map((id) => getWorkoutSets(id)));
      return listas.flat().filter((s) => s.concluida && s.tipoSerie !== "aquecimento").length;
    },
  });
  const seriesSemana = idsSemana.length === 0 ? 0 : (seriesQuery.data ?? 0);

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
    <AppShell title="Início" hideHeader>
      <header className="mb-5">
        <p className="text-sm font-medium text-muted-foreground">
          {saudacao()}
          {profileQuery.data?.nome ? `, ${profileQuery.data.nome.split(" ")[0]}` : ""}
        </p>
        <p className="mt-0.5 text-xs first-letter:uppercase text-muted-foreground/70">
          {dataLonga.format(new Date())}
        </p>
      </header>

      {/* Herói: objetivo semanal + ação principal */}
      <section className="relative mb-4 overflow-hidden rounded-3xl border border-border/60 shadow-elegant">
        <img
          src={routineCover("semana")}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover opacity-20"
        />
        <div className="veil absolute inset-0" />
        <div className="relative px-5 pb-5 pt-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <h2 className="font-display text-3xl font-semibold uppercase leading-none tracking-tight">
              Esta semana
            </h2>
            <p className="font-display text-2xl font-semibold tabular-nums leading-none">
              {daSemana.length}
              <span className="text-base text-muted-foreground">/{meta}</span>
            </p>
          </div>

          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: meta }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i < daSemana.length ? "bg-primary" : "bg-foreground/12",
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {daSemana.length >= meta
              ? "Meta da semana concluída."
              : `Faltam ${meta - daSemana.length} ${meta - daSemana.length === 1 ? "treino" : "treinos"} para a meta.`}
          </p>

          <Button
            onClick={continuarOuIniciar}
            disabled={starting}
            className="tap-target mt-5 w-full gap-2 text-base font-semibold"
          >
            {active ? <Flame className="size-5" /> : <Play className="size-5" />}
            {active ? "Retomar treino" : "Iniciar treino"}
          </Button>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-3 gap-2">
        <Metric label="Volume" value={`${Math.round(volumeSemana)} kg`} />
        <Metric label="Tempo" value={formatDurationShort(tempoSemana)} />
        <Metric label="Séries" value={String(seriesSemana)} />
      </section>

      <section className="mb-8">
        <SectionTitle title="Suas rotinas" linkLabel="ver todas" to="/treino" />
        {routinesQuery.isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-[68px] rounded-2xl" />
            <Skeleton className="h-[68px] rounded-2xl" />
          </div>
        ) : rotinas.length === 0 ? (
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
                  className="tap-target relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/60 px-4 py-3.5"
                >
                  <img
                    src={routineCover(r.id)}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 size-full object-cover opacity-20"
                  />
                  <span className="veil absolute inset-0" />
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.exercicios.length} exercícios
                    </span>
                  </span>
                  <ChevronRight className="relative size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle title="Sessões recentes" linkLabel="histórico" to="/progresso" />
        {workoutsQuery.isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        ) : workouts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-5 py-6 text-center text-sm text-muted-foreground">
            Nenhum treino registrado ainda.
          </p>
        ) : (
          <ul className="grid gap-2">
            {workouts.slice(0, 4).map((w) => (
              <li key={w.id}>
                <Link
                  to="/resumo/$id"
                  params={{ id: w.id }}
                  className="tap-target flex items-center gap-3 rounded-2xl bg-card/60 px-3 py-3"
                >
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-border/60">
                    <img
                      src={routineCover(w.routineId ?? w.id)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="size-full object-cover opacity-80"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {rotinas.find((r) => r.id === w.routineId)?.nome ?? "Treino livre"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {relativeDays(w.iniciadoEm)} · {formatDurationShort(w.duracaoSeg)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
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
