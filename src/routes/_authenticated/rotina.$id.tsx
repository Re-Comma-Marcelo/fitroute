import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getExercises } from "@/lib/data/exercises";
import { deleteRoutine, getRoutine, newRoutineExercise, saveRoutine } from "@/lib/data/routines";
import { takePendingExercise } from "@/lib/session-state";
import type { Routine } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/rotina/$id")({
  head: () => ({
    meta: [
      { title: "Editor de rotina — Forja" },
      {
        name: "description",
        content: "Monte sua rotina: ordene exercícios, defina séries-alvo, faixa de reps e descanso.",
      },
      { property: "og:title", content: "Editor de rotina — Forja" },
      { property: "og:description", content: "Séries-alvo, faixa de reps, descanso e notas por exercício." },
    ],
  }),
  component: RoutineEditor,
});

const DRAFT_KEY = "forja.draftRoutine.v1";

function RoutineEditor() {
  const { id } = useParams({ from: "/_authenticated/rotina/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const loaded = useRef(false);

  const fetchExercises = useServerFn(getExercises);
  const fetchRoutine = useServerFn(getRoutine);
  const saveRoutineFn = useServerFn(saveRoutine);
  const deleteRoutineFn = useServerFn(deleteRoutine);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    fetchExercises(undefined).then((all) =>
      setNomes(Object.fromEntries(all.map((e) => [e.id, e.nome]))),
    );

    const draftRaw = typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_KEY) : null;
    const draft = draftRaw ? (JSON.parse(draftRaw) as Routine) : null;
    const pending = takePendingExercise();

    async function init() {
      let base: Routine;
      if (draft && (draft.id === id || (id === "nova" && draft.id === ""))) {
        base = draft;
      } else if (id === "nova") {
        base = { id: "", nome: "", descricao: "", exercicios: [] };
      } else {
        base = (await fetchRoutine({ data: { id } })) ?? { id: "", nome: "", descricao: "", exercicios: [] };
      }
      if (pending) {
        base = {
          ...base,
          exercicios: [...base.exercicios, newRoutineExercise(pending, base.exercicios.length)],
        };
      }
      setRoutine(base);
      window.localStorage.removeItem(DRAFT_KEY);
    }
    init();
  }, [id, fetchExercises, fetchRoutine]);

  if (!routine) return <div className="min-h-screen bg-background" />;

  function patch(next: Partial<Routine>) {
    setRoutine((prev) => (prev ? { ...prev, ...next } : prev));
  }

  function patchExercise(idx: number, next: Partial<Routine["exercicios"][number]>) {
    setRoutine((prev) => {
      if (!prev) return prev;
      const exercicios = prev.exercicios.map((e, i) => (i === idx ? { ...e, ...next } : e));
      return { ...prev, exercicios };
    });
  }

  function move(from: number, to: number) {
    setRoutine((prev) => {
      if (!prev || to < 0 || to >= prev.exercicios.length) return prev;
      const exercicios = [...prev.exercicios];
      const [item] = exercicios.splice(from, 1);
      exercicios.splice(to, 0, item!);
      return { ...prev, exercicios: exercicios.map((e, i) => ({ ...e, ordem: i })) };
    });
  }

  function abrirBiblioteca() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(routine));
    navigate({ to: "/biblioteca", search: { para: "rotina", rotinaId: id } });
  }

  async function salvar() {
    await saveRoutineFn({ data: { ...routine!, nome: routine!.nome.trim() || "Nova rotina" } });
    await queryClient.invalidateQueries({ queryKey: ["routines"] });
    navigate({ to: "/treino" });
  }

  async function excluir() {
    if (routine!.id) {
      await deleteRoutineFn({ data: { id: routine!.id } });
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
    }
    navigate({ to: "/treino" });
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <PageHeader
        title={id === "nova" ? "Nova rotina" : "Editar rotina"}
        left={
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            aria-label="Voltar"
            onClick={() => navigate({ to: "/treino" })}
          >
            <ArrowLeft className="size-6" />
          </Button>
        }
        right={
          routine.id ? (
            <Button
              variant="ghost"
              size="icon"
              className="tap-target text-destructive"
              aria-label="Excluir rotina"
              onClick={excluir}
            >
              <Trash2 className="size-5" />
            </Button>
          ) : null
        }
      />

      <div className="mx-auto max-w-md space-y-4 px-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome da rotina</Label>
          <Input
            id="nome"
            value={routine.nome}
            onChange={(e) => patch({ nome: e.target.value })}
            placeholder="Ex: Upper A"
            className="tap-target h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            value={routine.descricao}
            onChange={(e) => patch({ descricao: e.target.value })}
            placeholder="Foco, dias da semana, observações"
            className="min-h-16 text-base"
          />
        </div>

        <h2 className="pt-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Exercícios ({routine.exercicios.length})
        </h2>

        {routine.exercicios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum exercício ainda. Adicione o primeiro da biblioteca.
            </p>
            <Button className="mt-4 h-12 w-full font-bold" onClick={abrirBiblioteca}>
              <Plus className="mr-1 size-5" /> Adicionar exercício
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {routine.exercicios.map((rex, idx) => (
              <li
                key={rex.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== idx) move(dragIdx, idx);
                  setDragIdx(null);
                }}
                className={`rounded-xl border border-border bg-card p-3 ${
                  dragIdx === idx ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="tap-target flex cursor-grab items-center justify-center text-muted-foreground">
                    <GripVertical className="size-5" />
                  </span>
                  <p className="flex-1 text-base font-bold leading-tight">
                    {nomes[rex.exerciseId] ?? "Exercício"}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target"
                    aria-label="Mover para cima"
                    onClick={() => move(idx, idx - 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target"
                    aria-label="Mover para baixo"
                    onClick={() => move(idx, idx + 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target text-destructive"
                    aria-label="Remover exercício"
                    onClick={() =>
                      setRoutine((prev) =>
                        prev
                          ? {
                              ...prev,
                              exercicios: prev.exercicios
                                .filter((_, i) => i !== idx)
                                .map((e, i) => ({ ...e, ordem: i })),
                            }
                          : prev,
                      )
                    }
                  >
                    <Trash2 className="size-5" />
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <NumField
                    label="Séries"
                    value={rex.seriesAlvo}
                    onChange={(v) => patchExercise(idx, { seriesAlvo: v })}
                  />
                  <NumField
                    label="Rep mín"
                    value={rex.repsMin}
                    onChange={(v) => patchExercise(idx, { repsMin: v })}
                  />
                  <NumField
                    label="Rep máx"
                    value={rex.repsMax}
                    onChange={(v) => patchExercise(idx, { repsMax: v })}
                  />
                  <NumField
                    label="Desc (s)"
                    value={rex.descansoSeg}
                    onChange={(v) => patchExercise(idx, { descansoSeg: v })}
                  />
                </div>
                <Input
                  value={rex.notas}
                  onChange={(e) => patchExercise(idx, { notas: e.target.value })}
                  placeholder="Notas do exercício"
                  className="mt-2 h-11 text-sm"
                />
              </li>
            ))}
          </ul>
        )}

        {routine.exercicios.length > 0 ? (
          <Button variant="secondary" className="h-12 w-full font-semibold" onClick={abrirBiblioteca}>
            <Plus className="mr-1 size-5" /> Adicionar exercício
          </Button>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Button className="h-14 w-full text-base font-bold" onClick={salvar}>
            Salvar rotina
          </Button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Input
        value={String(value)}
        inputMode="numeric"
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        className="numeric-field tap-target h-11 px-1 text-base"
      />
    </label>
  );
}
