import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
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
    meta: pageMeta({
      title: "Exercise library",
      description:
        "Over 40 resistance exercises with muscle group, equipment and execution instructions.",
      ogDescription: "Search exercises by name, muscle group and equipment.",
    }),
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const t = useT();
  const navigate = useNavigate();
  const { para, rotinaId } = useSearch({ from: "/_authenticated/biblioteca" });
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState<string | null>(null);
  const [equip, setEquip] = useState<string | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);

  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const gruposQuery = useQuery({ queryKey: ["muscleGroups"], queryFn: getMuscleGroups });
  const equipQuery = useQuery({ queryKey: ["equipments"], queryFn: getEquipments });

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

  function goBack() {
    if (para === "sessao") navigate({ to: "/sessao" });
    else if (para === "rotina" && rotinaId)
      navigate({ to: "/rotina/$id", params: { id: rotinaId } });
    else navigate({ to: "/treino" });
  }

  function choose(exercise: Exercise) {
    if (!para) {
      setDetail(exercise);
      return;
    }
    setPendingExercise(exercise.id);
    goBack();
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <PageHeader
        title={para ? t("Choose exercise") : t("Library")}
        left={
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            aria-label={t("Back")}
            onClick={goBack}
          >
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
            placeholder={t("Search exercise")}
            aria-label={t("Search exercise")}
            className="tap-target h-12 pl-11 text-base"
          />
        </div>

        <FilterRow
          label={t("Muscle")}
          options={gruposQuery.data ?? []}
          value={grupo}
          onChange={setGrupo}
        />
        <FilterRow
          label={t("Equipment")}
          options={equipQuery.data ?? []}
          value={equip}
          onChange={setEquip}
        />

        <p className="label-caps mt-5">{t("{count} exercises", { count: lista.length })}</p>

        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {lista.map((e) => (
            <li key={e.id} className="flex items-center">
              <button
                type="button"
                onClick={() => choose(e)}
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
                aria-label={t("Details for {name}", { name: e.nome })}
                onClick={() => setDetail(e)}
              >
                <Info className="size-5 text-muted-foreground" />
              </Button>
            </li>
          ))}
          {!lista.length && !exercisesQuery.isLoading ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              <p className="font-display text-sm font-semibold text-foreground">
                {t("No exercises found.")}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-snug">
                {t("The library is where you browse every exercise by muscle group and equipment.")}
              </p>{" "}
              <button
                type="button"
                className="font-semibold text-primary"
                onClick={() => {
                  setQ("");
                  setGrupo(null);
                  setEquip(null);
                }}
              >
                {t("Clear filters")}
              </button>
            </li>
          ) : null}
        </ul>
      </div>

      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">{detail?.nome}</SheetTitle>
          </SheetHeader>
          {detail ? (
            <div className="space-y-4 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  {detail.grupoPrimario}
                </span>
                {detail.gruposSecundarios.map((g) => (
                  <span key={g} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                    {g}
                  </span>
                ))}
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  {detail.equipamento}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Execution")}
                </h3>
                <p className="mt-1 text-base leading-relaxed">{detail.instrucoes}</p>
              </div>
              {para ? (
                <Button
                  className="h-14 w-full text-base font-semibold"
                  onClick={() => {
                    setPendingExercise(detail.id);
                    goBack();
                  }}
                >
                  {t("Add {name}", { name: detail.nome })}
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
  const t = useT();
  return (
    <div className="mt-4">
      <p className="label-caps mb-1.5">{label}</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip active={value === null} onClick={() => onChange(null)}>
          {t("All")}
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
