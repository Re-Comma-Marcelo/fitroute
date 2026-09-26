import { Link } from "@tanstack/react-router";
import { ChevronRight, Repeat2 } from "lucide-react";

import { sessionSwapMap } from "@/lib/data/folders";
import { formatDateLong, formatDurationShort, formatKg } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { swapReasonLabel } from "@/lib/swap-reasons";
import type { Exercise, Routine, Workout, WorkoutSet } from "@/lib/types";

/**
 * One session in a history list. Standard sessions get the full card; a
 * variation is smaller and quieter, with its reason and the muscle groups
 * whose exercise was swapped.
 */
export function WorkoutHistoryItem({
  workout: w,
  routines,
  sets,
  exercises,
}: {
  workout: Workout;
  routines: Routine[];
  sets: WorkoutSet[];
  exercises: Exercise[];
}) {
  const t = useT();
  const nome = routines.find((r) => r.id === w.routineId)?.nome ?? t("Blank workout");
  const groupOf = (id: string) => exercises.find((e) => e.id === id)?.grupoPrimario;

  if (w.variacao && w.routineId) {
    const reason = swapReasonLabel(w.motivo);
    const swapped = [
      ...new Set(
        Object.keys(sessionSwapMap(sets, w.id))
          .map(groupOf)
          .filter((g): g is string => Boolean(g)),
      ),
    ];
    return (
      <li>
        <Link
          to="/progresso/$id"
          params={{ id: w.id }}
          className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2.5 transition-colors hover:border-primary/40"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground/80">{nome}</p>
            <p className="text-xs text-muted-foreground first-letter:uppercase">
              {formatDateLong(w.iniciadoEm)} · {formatDurationShort(w.duracaoSeg)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {reason ? t("Variation · {reason}", { reason: t(reason) }) : t("Variation")}
              </span>
              {swapped.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-0.5 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <Repeat2 className="size-3" aria-hidden /> {g}
                </span>
              ))}
            </div>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground/70" />
        </Link>
      </li>
    );
  }

  const groups = Array.from(
    new Set(
      sets
        .filter((s) => s.workoutId === w.id)
        .map((s) => groupOf(s.exerciseId))
        .filter((g): g is string => Boolean(g)),
    ),
  );

  return (
    <li>
      <Link
        to="/progresso/$id"
        params={{ id: w.id }}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
      >
        <div className="flex-1">
          <p className="font-display text-base font-semibold leading-tight">{nome}</p>
          <p className="mt-0.5 text-xs text-muted-foreground/80 first-letter:uppercase">
            {formatDateLong(w.iniciadoEm)}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {groups.map((g) => (
              <span
                key={g}
                className="rounded-full bg-train/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-train"
              >
                {g}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {formatDurationShort(w.duracaoSeg)} · {formatKg(w.volumeTotalKg)}
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>
    </li>
  );
}
