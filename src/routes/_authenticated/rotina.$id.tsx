import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
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
      { title: "Routine editor — Forja" },
      {
        name: "description",
        content: "Build your routine: order exercises, set target sets, rep range and rest.",
      },
      { property: "og:title", content: "Routine editor — Forja" },
      { property: "og:description", content: "Target sets, rep range, rest and notes per exercise." },
    ],
  }),
  component: RoutineEditor,
});

const DRAFT_KEY = "forja.draftRoutine.v1";

function RoutineEditor() {
  const t = useT();
  const { id } = useParams({ from: "/_authenticated/rotina/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    getExercises().then((all) =>
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
        base = (await getRoutine(id)) ?? { id: "", nome: "", descricao: "", exercicios: [] };
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
  }, [id]);

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

  function openLibrary() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(routine));
    navigate({ to: "/biblioteca", search: { para: "rotina", rotinaId: id } });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await saveRoutine({ ...routine!, nome: routine!.nome.trim() || t("New routine") });
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      navigate({ to: "/treino" });
    } catch {
      toast.error(t("Could not save the routine. Check your connection and try again."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (saving) return;
    setSaving(true);
    try {
      if (routine!.id) {
        await deleteRoutine(routine!.id);
        await queryClient.invalidateQueries({ queryKey: ["routines"] });
      }
      navigate({ to: "/treino" });
    } catch {
      toast.error(t("Could not delete the routine. Check your connection and try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <PageHeader
        title={id === "nova" ? t("New routine") : t("Edit routine")}
        left={
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            aria-label={t("Back")}
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
              aria-label={t("Delete routine")}
              onClick={handleDelete}
            >
              <Trash2 className="size-5" />
            </Button>
          ) : null
        }
      />

      <div className="mx-auto max-w-md space-y-4 px-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="nome">{t("Routine name")}</Label>
          <Input
            id="nome"
            value={routine.nome}
            onChange={(e) => patch({ nome: e.target.value })}
            placeholder={t("e.g. Upper A")}
            className="tap-target h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descricao">{t("Description")}</Label>
          <Textarea
            id="descricao"
            value={routine.descricao}
            onChange={(e) => patch({ descricao: e.target.value })}
            placeholder={t("Focus, days of the week, notes")}
            className="min-h-16 text-base"
          />
        </div>

        <h2 className="pt-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("Exercises ({count})", { count: routine.exercicios.length })}
        </h2>

        {routine.exercicios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("No exercises yet. Add the first one from the library.")}
            </p>
            <Button className="mt-4 h-12 w-full font-bold" onClick={openLibrary}>
              <Plus className="mr-1 size-5" /> {t("Add exercise")}
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
                    {nomes[rex.exerciseId] ?? t("Exercise")}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target"
                    aria-label={t("Move up")}
                    onClick={() => move(idx, idx - 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target"
                    aria-label={t("Move down")}
                    onClick={() => move(idx, idx + 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target text-destructive"
                    aria-label={t("Remove exercise")}
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
                    label={t("Sets")}
                    value={rex.seriesAlvo}
                    onChange={(v) => patchExercise(idx, { seriesAlvo: v })}
                  />
                  <NumField
                    label={t("Min reps")}
                    value={rex.repsMin}
                    onChange={(v) => patchExercise(idx, { repsMin: v })}
                  />
                  <NumField
                    label={t("Max reps")}
                    value={rex.repsMax}
                    onChange={(v) => patchExercise(idx, { repsMax: v })}
                  />
                  <NumField
                    label={t("Rest (s)")}
                    value={rex.descansoSeg}
                    onChange={(v) => patchExercise(idx, { descansoSeg: v })}
                  />
                </div>
                <Input
                  value={rex.notas}
                  onChange={(e) => patchExercise(idx, { notas: e.target.value })}
                  placeholder={t("Exercise notes")}
                  className="mt-2 h-11 text-sm"
                />
              </li>
            ))}
          </ul>
        )}

        {routine.exercicios.length > 0 ? (
          <Button variant="secondary" className="h-12 w-full font-semibold" onClick={openLibrary}>
            <Plus className="mr-1 size-5" /> {t("Add exercise")}
          </Button>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Button className="h-14 w-full text-base font-bold" onClick={handleSave}>
            {t("Save routine")}
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
  const t = useT();
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {t(label)}
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
