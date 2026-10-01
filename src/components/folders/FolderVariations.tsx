import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Play, Repeat2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { relativeDays } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { swapReasonLabel } from "@/lib/swap-reasons";
import type { VariationSession } from "@/lib/data/folders";
import type { Exercise, Routine, SwapReason } from "@/lib/types";
import { cn } from "@/lib/utils";

export type { VariationSession };

/**
 * The folder's variations, below the standard routines and quieter than them:
 * saved variation routines, then recent sessions that strayed from the
 * standard. Each shows why (reason) and which muscle groups were swapped.
 */
export function FolderVariations({
  routines,
  sessions,
  allRoutines,
  exercises,
  disabled,
  defaultOpen = false,
  onStartRoutine,
  onRepeatSession,
  onPromoteRoutine,
  onPromoteSession,
}: {
  routines: Routine[];
  sessions: VariationSession[];
  allRoutines: Routine[];
  exercises: Exercise[];
  disabled: boolean;
  /** Start expanded (folder detail) instead of collapsed (Train tab). */
  defaultOpen?: boolean;
  onStartRoutine: (routineId: string) => void;
  onRepeatSession: (session: VariationSession) => void;
  onPromoteRoutine: (routineId: string) => void;
  onPromoteSession: (session: VariationSession) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState<string | null>(null);
  const count = routines.length + sessions.length;
  if (!count) return null;

  const group = (id: string) => exercises.find((e) => e.id === id)?.grupoPrimario ?? "";
  const name = (id: string) => exercises.find((e) => e.id === id)?.nome ?? t("Exercise");

  /** Swapped slots of a variation routine, read against the routine it came from. */
  function routineSwaps(r: Routine): Record<string, string> {
    const parent = allRoutines.find((p) => p.id === r.variacaoDe);
    if (!parent) return {};
    const map: Record<string, string> = {};
    const base = [...parent.exercicios].sort((a, b) => a.ordem - b.ordem);
    const mine = [...r.exercicios].sort((a, b) => a.ordem - b.ordem);
    base.forEach((ex, i) => {
      const other = mine[i];
      if (other && other.exerciseId !== ex.exerciseId) map[ex.exerciseId] = other.exerciseId;
    });
    return map;
  }

  function chips(reason: SwapReason | null | undefined, swaps: Record<string, string>) {
    const label = swapReasonLabel(reason);
    const groups = [...new Set(Object.keys(swaps).map(group).filter(Boolean))];
    if (!label && !groups.length) return null;
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        {label ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {t(label)}
          </span>
        ) : null}
        {groups.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-0.5 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <Repeat2 className="size-3" aria-hidden /> {g}
          </span>
        ))}
      </div>
    );
  }

  function swapList(swaps: Record<string, string>) {
    const entries = Object.entries(swaps);
    if (!entries.length) return null;
    return (
      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {entries.map(([from, to]) => (
          <li key={from} className="truncate">
            {t("{to} instead of {from}", { to: name(to), from: name(from) })}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap-target flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="label-caps text-muted-foreground">
          {t("Variations ({count})", { count })}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul className="mt-2 space-y-2">
          {routines.map((r) => {
            const swaps = routineSwaps(r);
            const isOpen = expanded === r.id;
            return (
              <li key={r.id} className="rounded-xl border border-dashed border-border px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  aria-expanded={isOpen}
                  className="w-full text-left"
                >
                  <p className="truncate text-sm font-semibold text-foreground/80">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("{count} exercises", { count: r.exercicios.length })}
                  </p>
                  {chips(r.motivo, swaps)}
                </button>
                {isOpen ? (
                  <>
                    {swapList(swaps)}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        className="h-10 text-xs font-semibold"
                        disabled={disabled}
                        onClick={() => onStartRoutine(r.id)}
                      >
                        <Play className="mr-1.5 size-3.5" /> {t("Start")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-10 text-xs font-semibold"
                        disabled={disabled}
                        onClick={() => onPromoteRoutine(r.id)}
                      >
                        <Star className="mr-1.5 size-3.5" /> {t("Make standard")}
                      </Button>
                    </div>
                  </>
                ) : null}
              </li>
            );
          })}

          {sessions.map((s) => {
            const key = s.workout.id;
            const isOpen = expanded === key;
            const hasSwaps = Object.keys(s.swaps).length > 0;
            return (
              <li key={key} className="rounded-xl border border-dashed border-border px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  className="w-full text-left"
                >
                  <p className="truncate text-sm font-semibold text-foreground/80">
                    {s.routine.nome}
                  </p>
                  <p className="text-xs text-muted-foreground first-letter:uppercase">
                    {relativeDays(s.workout.iniciadoEm)}
                  </p>
                  {chips(s.workout.motivo, s.swaps)}
                </button>
                {isOpen ? (
                  <>
                    {swapList(s.swaps)}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        className="h-10 text-xs font-semibold"
                        disabled={disabled}
                        onClick={() => onRepeatSession(s)}
                      >
                        <Play className="mr-1.5 size-3.5" /> {t("Repeat")}
                      </Button>
                      {hasSwaps ? (
                        <Button
                          variant="ghost"
                          className="h-10 text-xs font-semibold"
                          disabled={disabled}
                          onClick={() => onPromoteSession(s)}
                        >
                          <Star className="mr-1.5 size-3.5" /> {t("Make standard")}
                        </Button>
                      ) : (
                        <Button asChild variant="ghost" className="h-10 text-xs font-semibold">
                          <Link to="/progresso/$id" params={{ id: key }}>
                            {t("Details")}
                          </Link>
                        </Button>
                      )}
                    </div>
                    {hasSwaps ? (
                      <Button
                        asChild
                        variant="ghost"
                        className="mt-1 h-9 w-full text-xs text-muted-foreground"
                      >
                        <Link to="/progresso/$id" params={{ id: key }}>
                          {t("Details")}
                        </Link>
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
