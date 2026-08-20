import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Info, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/AppShell";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getEquipments, getExercises, getMuscleGroups } from "@/lib/data/exercises";
import { setPendingExercise } from "@/lib/session-state";
import type { Exercise } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  validateSearch: (search: Record<string, unknown>) => ({
    para: search["para"] as "sessao" | "rotina" | undefined,
    rotinaId: search["rotinaId"] as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Biblioteca de exercícios — Forja" },
      {
        name: "description",
        content:
          "Mais de 40 exercícios de musculação com grupo muscular, equipamento e instruções de execução.",
      },
      { property: "og:title", content: "Biblioteca de exercícios — Forja" },
      {
        property: "og:description",
        content: "Busque exercícios por nome, grupo muscular e equipamento.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const navigate = useNavigate();
  const { para, rotinaId } = useSearch({ from: "/biblioteca" });
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState<string | null>(null);
  const [equip, setEquip] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Exercise | null>(null);

  const fetchExercises = useServerFn(getExercises);
  const fetchMuscleGroups = useServerFn(getMuscleGroups);
  const fetchEquipments = useServerFn(getEquipments);

  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: () => fetchExercises({ data: {} }) });
  const gruposQuery = useQuery({ queryKey: ["muscleGroups"], queryFn: () => fetchMuscleGroups({ data: {} }) });
  const equipQuery = useQuery({ queryKey: ["equipments"], queryFn: () => fetchEquipments({ data: {} }) });

  const lista = useMemo(() => {
    const all = exercisesQuery.data ?? [];
    const termo = q.trim().toLowerCase();
    return all.filter(
      (e) =>
        (!termo || e.nome.toLowerCase().includes(termo)) &&
        (!grupo || e.grupoPrimario === grupo) &&
        (!equip || e.equipamento === equip),
    );
  }, [exercisesQuery.data, q, grupo, equip]);

  function voltar() {
    if (para === "sessao") navigate({ to: "/sessao" });
    else if (para === "rotina" && rotinaId) navigate({ to: "/rotina/$id", params: { id: rotinaId } });
    else navigate({ to: "/treino" });
  }

  function escolher(exercise: Exercise) {
    if (!para) {
      setDetalhe(exercise);
      return;
    }
    setPendingExercise(exercise.id);
    voltar();
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <PageHeader
        title={para ? "Escolher exercício" : "Biblioteca"}
        left={
          <Button variant="ghost" size="icon" className="tap-target" aria-label="Voltar" onClick={voltar}>
            <ArrowLeft className="size-6" />
          </Button>
        }
      />

      <div className="mx-auto max-w-md px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar exercício"
            aria-label="Buscar exercício"
            className="tap-target h-12 pl-11 text-base"
          />
        </div>

        <FilterRow
          label="Grupo"
          options={gruposQuery.data ?? []}
          value={grupo}
          onChange={setGrupo}
        />
        <FilterRow
          label="Equipamento"
          options={equipQuery.data ?? []}
          value={equip}
          onChange={setEquip}
        />

        <p className="label-caps mt-5">{lista.length} exercícios</p>

        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {lista.map((e) => (
            <li key={e.id} className="flex items-center">
              <button
                type="button"
                onClick={() => escolher(e)}
                className="tap-target flex flex-1 items-center gap-3 px-3 py-3 text-left"
              >
                <ExerciseThumb grupo={e.grupoPrimario} nome={e.nome} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold leading-tight">
                    {e.nome}
                  </span>
                  <span className="block text-xs text-muted-foreground/80">
                    {e.grupoPrimario} · {e.equipamento}
                  </span>
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="tap-target mr-2"
                aria-label={`Detalhes de ${e.nome}`}
                onClick={() => setDetalhe(e)}
              >
                <Info className="size-5 text-muted-foreground" />
              </Button>
            </li>
          ))}
          {!lista.length && !exercisesQuery.isLoading ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum exercício encontrado.{" "}
              <button
                type="button"
                className="font-semibold text-primary"
                onClick={() => {
                  setQ("");
                  setGrupo(null);
                  setEquip(null);
                }}
              >
                Limpar filtros
              </button>
            </li>
          ) : null}
        </ul>
      </div>

      <Sheet open={detalhe !== null} onOpenChange={(open) => !open && setDetalhe(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">{detalhe?.nome}</SheetTitle>
          </SheetHeader>
          {detalhe ? (
            <div className="space-y-4 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                  {detalhe.grupoPrimario}
                </span>
                {detalhe.gruposSecundarios.map((g) => (
                  <span key={g} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                    {g}
                  </span>
                ))}
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  {detalhe.equipamento}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Execução
                </h3>
                <p className="mt-1 text-base leading-relaxed">{detalhe.instrucoes}</p>
              </div>
              {para ? (
                <Button
                  className="h-14 w-full text-base font-bold"
                  onClick={() => {
                    setPendingExercise(detalhe.id);
                    voltar();
                  }}
                >
                  Adicionar {detalhe.nome}
                </Button>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
      <div className="mt-4">
      <p className="label-caps mb-1.5">{label}</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip active={value === null} onClick={() => onChange(null)}>
          Todos
        </FilterChip>
        {options.map((option) => (
          <FilterChip key={option} active={value === option} onClick={() => onChange(option)}>
            {option}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap-target shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
