import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  MoreVertical,
  Plus,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDuration } from "@/lib/format";
import {
  clearActiveSession,
  loadActiveSession,
  makeSets,
  saveActiveSession,
  sessionSetsDone,
  sessionVolume,
  takePendingExercise,
  type ActiveSession,
  type ActiveSet,
} from "@/lib/session-state";
import { buildActiveExercise } from "@/lib/start-session";
import { getPersonalRecord } from "@/lib/data/workouts";
import { saveWorkout } from "@/lib/data/workouts";
import type { TipoSerie, WorkoutSet } from "@/lib/types";

export const Route = createFileRoute("/sessao")({
  head: () => ({
    meta: [
      { title: "Sessão de treino — Forja" },
      {
        name: "description",
        content:
          "Registre séries, cargas, reps e descanso durante o treino com sugestões da sessão anterior.",
      },
      { property: "og:title", content: "Sessão de treino — Forja" },
      {
        property: "og:description",
        content: "Cronômetro, séries pré-preenchidas e timer de descanso automático.",
      },
    ],
  }),
  component: SessionPage,
});

const tipoLabel: Record<TipoSerie, string> = {
  aquecimento: "A",
  normal: "",
  falha: "F",
  drop: "D",
};

const tipoNome: Record<TipoSerie, string> = {
  aquecimento: "Aquecimento",
  normal: "Normal",
  falha: "Falha",
  drop: "Drop set",
};

function useTick(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

function SessionPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [ready, setReady] = useState(false);
  const [rest, setRest] = useState<{ total: number; endsAt: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const loadedRef = useRef(false);

  useTick(true);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const loaded = loadActiveSession();
    setSession(loaded);
    setReady(true);
    if (!loaded) return;
    // Exercício escolhido na biblioteca durante a sessão
    const pending = takePendingExercise();
    if (pending) {
      buildActiveExercise(pending).then((built) => {
        if (!built) return;
        setSession((prev) => {
          if (!prev) return prev;
          const next = { ...prev, exercicios: [...prev.exercicios, built] };
          next.atual = next.exercicios.length - 1;
          saveActiveSession(next);
          return next;
        });
      });
    }
  }, []);

  const update = useCallback((mutate: (s: ActiveSession) => ActiveSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = mutate(structuredClone(prev));
      saveActiveSession(next);
      return next;
    });
  }, []);

  if (!ready) return <div className="min-h-screen bg-background" />;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-lg font-semibold">Nenhum treino em andamento</p>
        <Button className="h-12 w-full max-w-xs" onClick={() => navigate({ to: "/treino" })}>
          Voltar para o treino
        </Button>
      </div>
    );
  }

  const elapsed = Math.floor((Date.now() - new Date(session.iniciadoEm).getTime()) / 1000);
  const restLeft = rest ? Math.max(0, Math.round((rest.endsAt - Date.now()) / 1000)) : 0;
  if (rest && restLeft === 0) setTimeout(() => setRest(null), 400);

  function toggleSet(exIdx: number, setIdx: number) {
    let descanso = 0;
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      const set = ex.sets[setIdx]!;
      if (set.concluida) {
        set.concluida = false;
        return s;
      }
      // Sugerir sempre: aceita valores anteriores num toque.
      if (!set.pesoKg) set.pesoKg = String(set.sugPeso ?? "");
      if (!set.reps) set.reps = String(set.sugReps ?? ex.repsMax);
      set.concluida = true;
      descanso = ex.descansoSeg;
      const todasFeitas = ex.sets.every((x) => x.concluida);
      if (todasFeitas && exIdx === s.atual && exIdx < s.exercicios.length - 1) {
        s.atual = exIdx + 1;
      }
      return s;
    });
    if (descanso > 0) setRest({ total: descanso, endsAt: Date.now() + descanso * 1000 });
  }

  function setField(exIdx: number, setIdx: number, field: "pesoKg" | "reps" | "rpe", value: string) {
    update((s) => {
      s.exercicios[exIdx]!.sets[setIdx]![field] = value;
      return s;
    });
  }

  function setTipo(exIdx: number, setIdx: number, tipo: TipoSerie) {
    update((s) => {
      s.exercicios[exIdx]!.sets[setIdx]!.tipoSerie = tipo;
      return s;
    });
  }

  function addSet(exIdx: number) {
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        ...makeSets(1, [])[0]!,
        serieNum: ex.sets.length + 1,
        tipoSerie: "normal",
        sugPeso: last ? Number(last.pesoKg) || last.sugPeso : null,
        sugReps: last ? Number(last.reps) || last.sugReps : null,
      });
      return s;
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      ex.sets.splice(setIdx, 1);
      ex.sets.forEach((x, i) => (x.serieNum = i + 1));
      return s;
    });
  }

  function removeExercise(exIdx: number) {
    update((s) => {
      s.exercicios.splice(exIdx, 1);
      s.atual = Math.min(s.atual, Math.max(0, s.exercicios.length - 1));
      return s;
    });
  }

  function skipExercise(exIdx: number) {
    update((s) => {
      s.exercicios[exIdx]!.pulado = !s.exercicios[exIdx]!.pulado;
      if (s.exercicios[exIdx]!.pulado && exIdx < s.exercicios.length - 1) s.atual = exIdx + 1;
      return s;
    });
  }

  async function finalizar() {
    if (!session) return;
    setFinishing(true);
    const duracaoSeg = elapsed;
    const sets: WorkoutSet[] = [];
    let volume = 0;
    const prs: { nome: string; pesoKg: number }[] = [];

    for (let i = 0; i < session.exercicios.length; i++) {
      const ex = session.exercicios[i]!;
      const pr = await getPersonalRecord(ex.exerciseId);
      let melhor = 0;
      ex.sets.forEach((s) => {
        if (!s.concluida) return;
        const peso = Number(s.pesoKg) || 0;
        const reps = Number(s.reps) || 0;
        volume += peso * reps;
        melhor = Math.max(melhor, peso);
        sets.push({
          id: `${session.id}_${i}_${s.serieNum}`,
          workoutId: session.id,
          exerciseId: ex.exerciseId,
          ordemExercicio: i,
          serieNum: s.serieNum,
          tipoSerie: s.tipoSerie,
          pesoKg: peso,
          reps,
          concluida: true,
          ...(s.rpe ? { rpe: Number(s.rpe) } : {}),
        });
      });
      if (melhor > pr && melhor > 0) prs.push({ nome: ex.nome, pesoKg: melhor });
    }

    await saveWorkout(
      {
        id: session.id,
        ...(session.routineId ? { routineId: session.routineId } : {}),
        iniciadoEm: session.iniciadoEm,
        finalizadoEm: new Date().toISOString(),
        duracaoSeg,
        volumeTotalKg: Math.round(volume),
        notas: session.notas,
        origem: session.routineId ? "rotina" : "branco",
      },
      sets,
    );

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `forja.resumo.${session.id}`,
        JSON.stringify({ prs, series: sets.length }),
      );
    }
    clearActiveSession();
    navigate({ to: "/resumo/$id", params: { id: session.id } as never });
  }

  const seriesFeitas = sessionSetsDone(session);
  const volumeAtual = sessionVolume(session);

  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex max-w-md items-center gap-3 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            aria-label="Voltar"
            onClick={() => navigate({ to: "/treino" })}
          >
            <X className="size-6" />
          </Button>
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground">{session.routineNome}</p>
            <p className="font-mono text-3xl font-bold leading-none tabular-nums">
              {formatDuration(elapsed)}
            </p>
          </div>
          <div className="text-right text-xs font-medium text-muted-foreground">
            <p>{seriesFeitas} séries</p>
            <p>{Math.round(volumeAtual).toLocaleString("pt-BR")} kg</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-3 py-3">
        {session.exercicios.map((ex, exIdx) => {
          const aberto = exIdx === session.atual;
          const feitas = ex.sets.filter((s) => s.concluida).length;
          return (
            <section
              key={ex.exerciseId + exIdx}
              className={`rounded-xl border bg-card ${
                aberto ? "border-primary/50" : "border-border"
              } ${ex.pulado ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-1 p-3">
                <button
                  type="button"
                  className="tap-target flex flex-1 items-center gap-2 text-left"
                  onClick={() => update((s) => ({ ...s, atual: aberto ? -1 : exIdx }))}
                >
                  <div className="flex-1">
                    <p className="text-base font-bold leading-tight">{ex.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {feitas}/{ex.sets.length} séries · {ex.repsMin}-{ex.repsMax} reps · descanso{" "}
                      {ex.descansoSeg}s
                    </p>
                  </div>
                  <ChevronDown
                    className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                      aberto ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="tap-target" aria-label="Opções do exercício">
                      <MoreVertical className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => skipExercise(exIdx)}>
                      <SkipForward className="mr-2 size-4" />
                      {ex.pulado ? "Retomar exercício" : "Pular exercício"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addSet(exIdx)}>
                      <Plus className="mr-2 size-4" /> Adicionar série
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => removeExercise(exIdx)}>
                      <Trash2 className="mr-2 size-4" /> Remover exercício
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {aberto ? (
                <div className="px-3 pb-3">
                  <div className="mb-1 grid grid-cols-[36px_1fr_1fr_56px_44px] items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <span>Sér</span>
                    <span className="text-center">kg</span>
                    <span className="text-center">reps</span>
                    <span className="text-center">RPE</span>
                    <span />
                  </div>
                  <ul className="space-y-2">
                    {ex.sets.map((set, setIdx) => (
                      <SetRow
                        key={set.id}
                        set={set}
                        onTipo={(tipo) => setTipo(exIdx, setIdx, tipo)}
                        onRemove={() => removeSet(exIdx, setIdx)}
                        onField={(field, value) => setField(exIdx, setIdx, field, value)}
                        onCheck={() => toggleSet(exIdx, setIdx)}
                      />
                    ))}
                  </ul>
                  <Button
                    variant="ghost"
                    className="mt-2 h-11 w-full justify-start text-sm font-semibold text-muted-foreground"
                    onClick={() => addSet(exIdx)}
                  >
                    <Plus className="mr-1 size-4" /> Adicionar série
                  </Button>
                  <Textarea
                    value={ex.notas}
                    onChange={(e) =>
                      update((s) => {
                        s.exercicios[exIdx]!.notas = e.target.value;
                        return s;
                      })
                    }
                    placeholder="Nota do exercício (ex: pegada mais fechada)"
                    className="mt-2 min-h-11 text-sm"
                  />
                </div>
              ) : null}
            </section>
          );
        })}

        <Button
          variant="secondary"
          className="h-12 w-full font-semibold"
          onClick={() => navigate({ to: "/biblioteca", search: { para: "sessao", rotinaId: undefined } })}
        >
          <Plus className="mr-1 size-5" /> Adicionar exercício
        </Button>

        <Textarea
          value={session.notas}
          onChange={(e) => update((s) => ({ ...s, notas: e.target.value }))}
          placeholder="Nota geral da sessão"
          className="min-h-16 text-sm"
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-md px-3 py-3">
          {rest ? (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-sm font-bold">
                <span className="text-primary">Descanso {formatDuration(restLeft)}</span>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    className="tap-target h-9 px-3 text-xs font-bold"
                    onClick={() => setRest((r) => (r ? { ...r, endsAt: r.endsAt - 15000 } : r))}
                  >
                    -15s
                  </Button>
                  <Button
                    variant="secondary"
                    className="tap-target h-9 px-3 text-xs font-bold"
                    onClick={() =>
                      setRest((r) => (r ? { total: r.total + 15, endsAt: r.endsAt + 15000 } : r))
                    }
                  >
                    +15s
                  </Button>
                  <Button
                    variant="ghost"
                    className="tap-target h-9 px-3 text-xs font-bold"
                    onClick={() => setRest(null)}
                  >
                    Pular
                  </Button>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                  style={{ width: `${Math.min(100, (restLeft / rest.total) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
          <Button
            className="h-14 w-full text-base font-bold"
            disabled={finishing}
            onClick={finalizar}
          >
            Finalizar treino
          </Button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

function SetRow({
  set,
  onField,
  onCheck,
  onTipo,
  onRemove,
}: {
  set: ActiveSet;
  onField: (field: "pesoKg" | "reps" | "rpe", value: string) => void;
  onCheck: () => void;
  onTipo: (tipo: TipoSerie) => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={`grid grid-cols-[36px_1fr_1fr_56px_44px] items-center gap-2 rounded-lg px-1 py-1 ${
        set.concluida ? "bg-primary/10" : ""
      }`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="tap-target flex size-9 items-center justify-center rounded-md bg-muted text-sm font-bold"
            aria-label={`Série ${set.serieNum} — tipo ${tipoNome[set.tipoSerie]}`}
          >
            {tipoLabel[set.tipoSerie] || set.serieNum}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {(["aquecimento", "normal", "falha", "drop"] as TipoSerie[]).map((tipo) => (
            <DropdownMenuItem key={tipo} onClick={() => onTipo(tipo)}>
              {tipoNome[tipo]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem className="text-destructive" onClick={onRemove}>
            <Trash2 className="mr-2 size-4" /> Remover série
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Input
        value={set.pesoKg}
        onChange={(e) => onField("pesoKg", e.target.value)}
        inputMode="decimal"
        placeholder={set.sugPeso !== null ? String(set.sugPeso) : "—"}
        aria-label="Peso em kg"
        className="numeric-field tap-target h-11 text-base"
      />
      <Input
        value={set.reps}
        onChange={(e) => onField("reps", e.target.value)}
        inputMode="numeric"
        placeholder={set.sugReps !== null ? String(set.sugReps) : "—"}
        aria-label="Repetições"
        className="numeric-field tap-target h-11 text-base"
      />
      <Input
        value={set.rpe}
        onChange={(e) => onField("rpe", e.target.value)}
        inputMode="numeric"
        placeholder="RPE"
        aria-label="RPE opcional"
        className="numeric-field tap-target h-11 px-1 text-sm"
      />
      <button
        type="button"
        onClick={onCheck}
        aria-label={set.concluida ? "Desmarcar série" : "Concluir série"}
        aria-pressed={set.concluida}
        className={`tap-target flex size-11 items-center justify-center rounded-lg border transition-colors ${
          set.concluida
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-muted text-muted-foreground"
        }`}
      >
        <Check className="size-6" strokeWidth={3} />
      </button>
    </li>
  );
}
