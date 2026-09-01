import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { ArrowLeft, ChevronLeft, ChevronRight, Info, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/AppShell";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { QueryError } from "@/components/QueryError";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  createExercise,
  getEquipments,
  getExercises,
  getMuscleGroups,
} from "@/lib/data/exercises";
import { setPendingExercise } from "@/lib/session-state";
import { exerciseImage } from "@/lib/exercise-image";
import type { Exercise } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  validateSearch: (search: Record<string, unknown>) => ({
    para: search["para"] as "sessao" | "rotina" | undefined,
    rotinaId: search["rotinaId"] as string | undefined,
    exercicioId: search["exercicioId"] as string | undefined,
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

/** An exercise lives in its primary folder and in every secondary group it trains. */
function belongsTo(exercise: Exercise, group: string): boolean {
  return exercise.grupoPrimario === group || exercise.gruposSecundarios.includes(group);
}

function LibraryPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { para, rotinaId, exercicioId } = useSearch({ from: "/_authenticated/biblioteca" });
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState<string | null>(null);
  const [equip, setEquip] = useState<string | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);

  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const gruposQuery = useQuery({ queryKey: ["muscleGroups"], queryFn: getMuscleGroups });
  const equipQuery = useQuery({ queryKey: ["equipments"], queryFn: getEquipments });

  /** Coming from global search: open the exercise the user actually searched for. */
  useEffect(() => {
    if (!exercicioId || para) return;
    const found = (exercisesQuery.data ?? []).find((e) => e.id === exercicioId);
    if (found) setDetail(found);
  }, [exercicioId, para, exercisesQuery.data]);

  const all = exercisesQuery.data ?? [];
  const termo = q.trim().toLowerCase();
  const showFolders = !termo && grupo === null && !equip;

  const folders = useMemo(() => {
    const groups = gruposQuery.data ?? [];
    return groups.map((group) => ({
      group,
      count: all.filter((e) => belongsTo(e, group)).length,
    }));
  }, [gruposQuery.data, all]);

  const lista = useMemo(
    () =>
      all.filter(
        (e) =>
          (!termo || e.nome.toLowerCase().includes(termo)) &&
          (!grupo || belongsTo(e, grupo)) &&
          (!equip || e.equipamento === equip),
      ),
    [all, termo, grupo, equip],
  );

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

  async function saveNew(input: {
    nome: string;
    grupoPrimario: string;
    gruposSecundarios: string[];
    equipamento: string;
    instrucoes: string;
  }) {
    try {
      const created = await createExercise({ ...input, midiaUrl: "" });
      await queryClient.invalidateQueries({ queryKey: ["exercises"] });
      await queryClient.invalidateQueries({ queryKey: ["muscleGroups"] });
      setCreating(false);
      toast.success(t("{name} added to {group}.", { name: created.nome, group: input.grupoPrimario }));
    } catch {
      toast.error(t("Could not save the exercise. Try again."));
    }
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
        right={
          <Button
            variant="secondary"
            size="icon"
            className="tap-target size-11"
            aria-label={t("New exercise")}
            onClick={() => setCreating(true)}
          >
            <Plus className="size-6" />
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

        {exercisesQuery.isError ? (
          <QueryError
            className="mt-4"
            message={t("Could not load the exercise library.")}
            onRetry={() => void exercisesQuery.refetch()}
          />
        ) : showFolders ? (
          <>
            <p className="label-caps mt-5">{t("Muscle groups")}</p>
            <ul className="mt-2 grid grid-cols-2 gap-3">
              {folders.map((folder) => (
                <li key={folder.group}>
                  <button
                    type="button"
                    onClick={() => setGrupo(folder.group)}
                    className="relative block h-28 w-full overflow-hidden rounded-2xl border border-border text-left"
                  >
                    <img
                      src={exerciseImage(folder.group)}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    <span className="veil absolute inset-0" />
                    <span className="absolute inset-x-3 bottom-2">
                      <span className="block truncate font-display text-base font-semibold">
                        {folder.group}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t("{count} exercises", { count: folder.count })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {gruposQuery.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("Loading…")}</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {grupo ? (
                <button
                  type="button"
                  onClick={() => setGrupo(null)}
                  className="tap-target inline-flex items-center gap-1 rounded-full border border-primary/60 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary"
                >
                  <ChevronLeft className="size-4" /> {grupo}
                </button>
              ) : null}
              {termo ? (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="tap-target rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground"
                >
                  {t("Clear search")}
                </button>
              ) : null}
            </div>

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
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
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
                  <button
                    type="button"
                    className="mt-2 font-semibold text-primary"
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
          </>
        )}
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

      <NewExerciseSheet
        open={creating}
        groups={gruposQuery.data ?? []}
        equipments={equipQuery.data ?? []}
        defaultGroup={grupo}
        onOpenChange={setCreating}
        onSave={saveNew}
      />
    </div>
  );
}

/** Create a custom exercise and file it into a muscle-group folder. */
function NewExerciseSheet({
  open,
  groups,
  equipments,
  defaultGroup,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  groups: string[];
  equipments: string[];
  defaultGroup: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    nome: string;
    grupoPrimario: string;
    gruposSecundarios: string[];
    equipamento: string;
    instrucoes: string;
  }) => Promise<void>;
}) {
  const t = useT();
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<string>(defaultGroup ?? "");
  const [secundarios, setSecundarios] = useState<string[]>([]);
  const [equipamento, setEquipamento] = useState<string>("");
  const [instrucoes, setInstrucoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome("");
    setGrupo(defaultGroup ?? groups[0] ?? "");
    setSecundarios([]);
    setEquipamento(equipments[0] ?? "");
    setInstrucoes("");
  }, [open, defaultGroup, groups, equipments]);

  const valid = nome.trim().length > 1 && grupo !== "" && equipamento !== "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{t("New exercise")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-8">
          <div>
            <p className="label-caps mb-1.5">{t("Exercise name")}</p>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={t("e.g. Landmine press")}
              className="h-12 text-base"
            />
          </div>

          <div>
            <p className="label-caps mb-1.5">{t("Muscle group (folder)")}</p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <FilterChip key={g} active={grupo === g} onClick={() => setGrupo(g)}>
                  {g}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="label-caps mb-1.5">{t("Also trains (optional)")}</p>
            <div className="flex flex-wrap gap-2">
              {groups
                .filter((g) => g !== grupo)
                .map((g) => (
                  <FilterChip
                    key={g}
                    active={secundarios.includes(g)}
                    onClick={() =>
                      setSecundarios((prev) =>
                        prev.includes(g) ? prev.filter((v) => v !== g) : [...prev, g],
                      )
                    }
                  >
                    {g}
                  </FilterChip>
                ))}
            </div>
          </div>

          <div>
            <p className="label-caps mb-1.5">{t("Equipment")}</p>
            <div className="flex flex-wrap gap-2">
              {equipments.map((eq) => (
                <FilterChip
                  key={eq}
                  active={equipamento === eq}
                  onClick={() => setEquipamento(eq)}
                >
                  {eq}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="label-caps mb-1.5">{t("Execution")}</p>
            <Textarea
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              rows={3}
              placeholder={t("How you perform it — cues, range, tempo.")}
            />
          </div>

          <Button
            className="h-14 w-full text-base font-semibold"
            disabled={!valid || saving}
            onClick={async () => {
              setSaving(true);
              await onSave({
                nome: nome.trim(),
                grupoPrimario: grupo,
                gruposSecundarios: secundarios,
                equipamento,
                instrucoes: instrucoes.trim(),
              });
              setSaving(false);
            }}
          >
            {saving ? t("Saving…") : t("Save exercise")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
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
