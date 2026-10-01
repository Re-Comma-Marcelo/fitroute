import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { getExercises } from "@/lib/data/exercises";
import { useT } from "@/lib/i18n";
import type { ActiveExercise } from "@/lib/session-state";
import { SWAP_REASONS } from "@/lib/swap-reasons";
import type { SwapReason } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What happens to today's swaps once the workout is saved. */
export type SwapKeep = "today" | "variation" | "standard";

/**
 * Finish-dialog step shown only when exercises were swapped: lists each swap
 * with the muscle group it covered, asks why (optional), and whether the swap
 * was a one-off, a variation worth keeping, or the new standard.
 */
export function SwapFinishPanel({
  swaps,
  canKeep,
  reason,
  onReason,
  keep,
  onKeep,
}: {
  swaps: { from: string; ex: ActiveExercise }[];
  /** False for blank sessions: there is no routine to update or vary. */
  canKeep: boolean;
  reason: SwapReason | null;
  onReason: (reason: SwapReason | null) => void;
  keep: SwapKeep;
  onKeep: (keep: SwapKeep) => void;
}) {
  const t = useT();
  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: () => getExercises() });
  const byId = new Map((exercisesQ.data ?? []).map((e) => [e.id, e]));

  const options: { id: SwapKeep; label: string; hint: string }[] = [
    { id: "today", label: t("Just today"), hint: t("Saved as a variation in this folder.") },
    {
      id: "variation",
      label: t("Keep as a variation"),
      hint: t("Adds a variation of the routine you can repeat later."),
    },
    {
      id: "standard",
      label: t("Update the standard"),
      hint: t("The routine uses these exercises from now on."),
    },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-sm font-semibold">
        {swaps.length === 1
          ? t("You swapped 1 exercise today")
          : t("You swapped {count} exercises today", { count: swaps.length })}
      </p>
      <ul className="space-y-1.5 text-xs">
        {swaps.map(({ from, ex }) => {
          const original = byId.get(from);
          return (
            <li key={`${from}:${ex.exerciseId}`} className="flex items-center gap-1.5">
              <span className="min-w-0 truncate text-muted-foreground">
                {original?.nome ?? t("Exercise")}
              </span>
              <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate font-semibold text-foreground">{ex.nome}</span>
              {original?.grupoPrimario ? (
                <span className="ml-auto shrink-0 rounded-full bg-train/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-train">
                  {original.grupoPrimario}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div>
        <p className="label-caps mb-1.5">{t("Why? (optional)")}</p>
        <div className="flex flex-wrap gap-1.5">
          {SWAP_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={reason === r.id}
              onClick={() => onReason(reason === r.id ? null : r.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                reason === r.id
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {t(r.label)}
            </button>
          ))}
        </div>
      </div>

      {canKeep ? (
        <div role="radiogroup" aria-label={t("Keep these swaps")} className="space-y-1.5">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={keep === o.id}
              onClick={() => onKeep(o.id)}
              className={cn(
                "w-full rounded-xl border px-3 py-2 text-left transition-colors",
                keep === o.id ? "border-primary/60 bg-primary/10" : "border-border bg-card",
              )}
            >
              <span
                className={cn(
                  "block text-sm font-semibold",
                  keep === o.id ? "text-primary" : "text-foreground",
                )}
              >
                {o.label}
              </span>
              <span className="block text-xs text-muted-foreground">{o.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
