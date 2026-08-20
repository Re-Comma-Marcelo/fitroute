import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ChevronDown,
  MoreVertical,
  Plus,
  SkipForward,
  Timer,
  Trash2,
  TrendingUp,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDuration, formatRest } from "@/lib/format";
import {
  clearActiveSession,
  loadActiveSession,
  makeSets,
  saveActiveSession,
  serieLabel,
  sessionSetsDone,
  sessionVolume,
  takePendingExercise,
  type ActiveExercise,
  type ActiveSession,
  type ActiveSet,
} from "@/lib/session-state";
import { isSerieValida } from "@/lib/progression";
import { buildActiveExercise } from "@/lib/start-session";
import { getPersonalRecord, saveWorkout } from "@/lib/data/workouts";
import type { TipoSerie, WorkoutSet } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/sessao")({
  head: () => ({
    meta: [
      { title: "Sessão de treino — Forja" },
      {
        name: "description",
        content:
          "Registre séries, cargas, reps e PSE durante o treino com a carga anterior sempre visível.",
      },
      { property: "og:title", content: "Sessão de treino — Forja" },
      {
        property: "og:description",
        content: "Cronômetro, carga anterior fixa, sugestão de progressão e timer de descanso.",
      },
    ],
  }),
  component: SessionPage,
});

const tipoNome: Record<TipoSerie, string> = {
  aquecimento: "Aquecimento",
  normal: "Normal",
  falha: "Falha",
  drop: "Drop set",
};

const PSE_OPCOES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const DESCANSO_OPCOES = [30, 45, 60, 75, 90, 105, 120, 135, 150, 180, 210, 240, 300];

const GRID = "grid grid-cols-[26px_58px_1fr_1fr_46px_44px] items-center gap-1.5";

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
  const fetchPersonalRecord = useServerFn(getPersonalRecord);
  const saveWorkoutFn = useServerFn(saveWorkout);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [ready, setReady] = useState(false);
  const [rest, setRest] = useState<{ total: number; endsAt: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const loadedRef = useRef(false);

  useTick(true);

  // Timer de descanso zera sozinho, sem modal e sem toque extra.
  useEffect(() => {
    if (!rest) return;
    const id = setTimeout(() => setRest(null), Math.max(0, rest.endsAt - Date.now()) + 500);
    return () => clearTimeout(id);
  }, [rest]);

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

  function iniciarDescanso(segundos: number) {
    if (segundos <= 0) return;
    setRest({ total: segundos, endsAt: Date.now() + segundos * 1000 });
  }

  function toggleSet(exIdx: number, setIdx: number) {
    let descanso = 0;
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      const set = ex.sets[setIdx]!;
      if (set.concluida) {
        set.concluida = false;
        return s;
      }
      // Registro em 2 toques: valores sugeridos são aceitos sem digitar nada.
      if (!set.pesoKg) set.pesoKg = String(set.sugPeso ?? set.antPeso ?? "");
      if (!set.reps) set.reps = String(set.sugReps ?? ex.repsMax);
      set.concluida = true;
      descanso = ex.descansoSeg;
      const todasFeitas = ex.sets.every((x) => x.concluida);
      if (todasFeitas && exIdx === s.atual && exIdx < s.exercicios.length - 1) {
        s.atual = exIdx + 1;
      }
      return s;
    });
    if (descanso > 0) iniciarDescanso(descanso);
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

  function setDescanso(exIdx: number, segundos: number) {
    update((s) => {
      s.exercicios[exIdx]!.descansoSeg = segundos;
      return s;
    });
  }

  function addSet(exIdx: number) {
    update((s) => {
      const ex = s.exercicios[exIdx]!;
      const last = ex.sets[ex.sets.length - 1];
      const base = makeSets(1, [])[0]!;
      ex.sets.push({
        ...base,
        serieNum: ex.sets.length + 1,
        tipoSerie: "normal",
        sugPeso: last ? Number(last.pesoKg) || last.sugPeso : null,
        sugReps: last ? Number(last.reps) || last.sugReps : null,
        pesoKg: last ? last.pesoKg : "",
        reps: last ? last.reps : "",
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
        // Aquecimento é registrado, mas não entra no volume.
        if (isSerieValida(s)) {
          volume += peso * reps;
          melhor = Math.max(melhor, peso);
        }
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
    navigate({ to: "/resumo/$id", params: { id: session.id } });
  }

  const seriesFeitas = sessionSetsDone(session);
  const volumeAtual = sessionVolume(session);
  const descansoAtual = session.exercicios[Math.max(0, session.atual)]?.descansoSeg ?? 90;

  return (
    <div className="min-h-screen bg-background pb-44">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex max-w-md items-center gap-1 px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            aria-label="Colapsar sessão"
            onClick={() => navigate({ to: "/treino" })}
          >
            <ChevronDown className="size-6" />
          </Button>
          <h1 className="flex-1 truncate text-base font-bold">{session.routineNome}</h1>
          <Button
            variant="ghost"
            size="icon"
            className="tap-target text-info"
            aria-label="Abrir timer de descanso"
            onClick={() => iniciarDescanso(descansoAtual)}
          >
            <Timer className="size-6" />
          </Button>
          <Button
            className="tap-target h-11 bg-info px-4 font-bold text-info-foreground hover:bg-info/90"
            disabled={finishing}
            onClick={finalizar}
          >
            Concluir
          </Button>
        </div>
        <dl className="mx-auto grid max-w-md grid-cols-3 border-t border-border">
          <HeaderStat label="Duração" value={formatDuration(elapsed)} mono />
          <HeaderStat label="Volume" value={`${Math.round(volumeAtual).toLocaleString("pt-BR")} kg`} />
          <HeaderStat label="Séries" value={String(seriesFeitas)} />
        </dl>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-3 py-3">
        {session.exercicios.map((ex, exIdx) => {
          const aberto = exIdx === session.atual;
          const feitas = ex.sets.filter((s) => s.concluida && isSerieValida(s)).length;
          const validas = ex.sets.filter(isSerieValida).length;
          return (
            <section
              key={ex.exerciseId + exIdx}
              className={`rounded-xl border bg-card ${
                aberto ? "border-primary/50" : "border-border"
              } ${ex.pulado ? "opacity-50" : ""}`}
            >
              <div className="flex items-start gap-1 p-3">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 text-left"
                    onClick={() => update((s) => ({ ...s, atual: aberto ? -1 : exIdx }))}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold leading-tight">{ex.nome}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {feitas}/{validas} séries · alvo {ex.repsMin}-{ex.repsMax} reps
                      </p>
                    </div>
                    <ChevronDown
                      className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${
                        aberto ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <RestPicker
                      value={ex.descansoSeg}
                      onChange={(segundos) => setDescanso(exIdx, segundos)}
                    />
                    {ex.sugestao?.aumentou ? <ProgressBadge motivo={ex.sugestao.motivo} /> : null}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="tap-target"
                      aria-label="Opções do exercício"
                    >
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
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => removeExercise(exIdx)}
                    >
                      <Trash2 className="mr-2 size-4" /> Remover exercício
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {aberto ? (
                <div className="px-3 pb-3">
                  <div
                    className={`${GRID} mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground`}
                  >
                    <span>Sér</span>
                    <span className="text-center">Anterior</span>
                    <span className="text-center">kg</span>
                    <span className="text-center">reps</span>
                    <span className="text-center">PSE</span>
                    <span />
                  </div>
                  <ul className="space-y-2">
                    {ex.sets.map((set, setIdx) => (
                      <SetRow
                        key={set.id}
                        set={set}
                        label={serieLabel(ex.sets, setIdx)}
                        exercise={ex}
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
          onClick={() =>
            navigate({ to: "/biblioteca", search: { para: "sessao", rotinaId: undefined } })
          }
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
                <span className="text-info">Descanso {formatDuration(restLeft)}</span>
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
                  className="h-full rounded-full bg-info transition-[width] duration-1000 ease-linear"
                  style={{ width: `${Math.min(100, (restLeft / rest.total) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
          <Button className="h-14 w-full text-base font-bold" disabled={finishing} onClick={finalizar}>
            Finalizar treino
          </Button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

function HeaderStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`text-lg font-bold tabular-nums ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function ProgressBadge({ motivo }: { motivo: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-full bg-primary/15 px-2.5 text-xs font-bold text-primary"
        >
          <TrendingUp className="size-3.5" strokeWidth={3} />
          Peso aumentado
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 text-sm">
        {motivo}
      </PopoverContent>
    </Popover>
  );
}

function RestPicker({ value, onChange }: { value: number; onChange: (segundos: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-full bg-info/15 px-2.5 text-xs font-bold text-info"
        >
          <Timer className="size-3.5" strokeWidth={2.6} />
          Descanso: {formatRest(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Descanso deste exercício
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {DESCANSO_OPCOES.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => {
                onChange(op);
                setOpen(false);
              }}
              className={`tap-target rounded-lg border px-1 text-sm font-bold ${
                op === value ? "border-info bg-info text-info-foreground" : "border-border bg-card"
              }`}
            >
              {formatRest(op)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PsePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={value ? `PSE ${value}` : "Definir PSE (opcional)"}
          className={`tap-target h-11 w-full rounded-lg border text-xs font-bold tabular-nums ${
            value ? "border-info/60 bg-info/15 text-info" : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {value || "PSE"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          PSE (opcional)
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {PSE_OPCOES.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => {
                onChange(String(op));
                setOpen(false);
              }}
              className={`tap-target rounded-lg border text-sm font-bold ${
                value === String(op)
                  ? "border-info bg-info text-info-foreground"
                  : "border-border bg-card"
              }`}
            >
              {op}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-2 h-10 w-full text-xs font-bold text-muted-foreground"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
        >
          Limpar
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function SetRow({
  set,
  label,
  exercise,
  onField,
  onCheck,
  onTipo,
  onRemove,
}: {
  set: ActiveSet;
  label: string;
  exercise: ActiveExercise;
  onField: (field: "pesoKg" | "reps" | "rpe", value: string) => void;
  onCheck: () => void;
  onTipo: (tipo: TipoSerie) => void;
  onRemove: () => void;
}) {
  const aquecimento = !isSerieValida(set);
  return (
    <li className={`${GRID} rounded-lg py-1 ${set.concluida ? "bg-primary/10" : ""}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`tap-target flex h-9 w-full items-center justify-center rounded-md bg-muted text-sm font-bold ${
              aquecimento ? "text-warn" : ""
            }`}
            aria-label={`Série ${label} — tipo ${tipoNome[set.tipoSerie]}`}
          >
            {label}
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

      <div className="text-center text-[11px] font-semibold leading-tight text-muted-foreground">
        {set.antPeso !== null && set.antReps !== null ? (
          <>
            <span className="block tabular-nums">
              {set.antPeso}kg x {set.antReps}
            </span>
            <span className="block tabular-nums">
              {set.antRpe ? `@ ${set.antRpe} rpe` : "—"}
            </span>
          </>
        ) : (
          <span>—</span>
        )}
      </div>

      <Input
        value={set.pesoKg}
        onChange={(e) => onField("pesoKg", e.target.value)}
        inputMode="decimal"
        placeholder="kg"
        aria-label="Peso em kg"
        className="numeric-field tap-target h-11 px-1 text-base"
      />
      <Input
        value={set.reps}
        onChange={(e) => onField("reps", e.target.value)}
        inputMode="numeric"
        placeholder={`${exercise.repsMin}-${exercise.repsMax}`}
        aria-label="Repetições"
        className="numeric-field tap-target h-11 px-1 text-base"
      />
      <PsePicker value={set.rpe} onChange={(v) => onField("rpe", v)} />
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
