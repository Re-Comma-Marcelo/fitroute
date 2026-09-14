import { useState } from "react";
import { Check, ChevronDown, TrendingUp } from "lucide-react";
import { SetFields, type SetField } from "@/components/session/SetFields";
import { formatKg } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { isSerieTempo, isSerieValida } from "@/lib/progression";
import type { ActiveExercise, ActiveSet } from "@/lib/session-state";
import { cn } from "@/lib/utils";

/**
 * The one thing on screen: the set you are about to do. Big weight and reps,
 * the last time as reference, the target the app decided, and a full-width
 * check. Everything else about the exercise lives behind the ⋯ menu.
 */
export function CurrentSetCard({
  exercise,
  set,
  label,
  target,
  warmup,
  reason,
  onField,
  onCheck,
  onOpenSet,
  justDone,
  hint,
}: {
  exercise: ActiveExercise;
  set: ActiveSet;
  label: string;
  /** Coach target line for this set ("62.5 kg × 8-12"). */
  target?: string | undefined;
  /** Warm-up plan, shown only before the first working set. */
  warmup?: string | undefined;
  /** Why the target is what it is (progression reason, performance note). */
  reason?: string | undefined;
  onField: (field: SetField, value: string) => void;
  onCheck: () => void;
  /** Opens the set editor (type, note, remove). */
  onOpenSet: () => void;
  justDone: boolean;
  /** One-time scrub hint, shown under the fields. */
  hint?: string | undefined;
}) {
  const t = useT();
  const [whyOpen, setWhyOpen] = useState(false);
  const warmupSet = !isSerieValida(set);
  const tempo = isSerieTempo(set);

  const previous =
    set.antPeso !== null && set.antReps !== null
      ? `${formatKg(set.antPeso)} × ${set.antReps}${set.antRpe ? ` @${set.antRpe}` : ""}`
      : null;

  const beat = beatLine(t, set);

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-3",
        warmupSet ? "border-border" : "border-primary/50",
      )}
      aria-label={t("Current set")}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSet}
          aria-label={t("Set options")}
          className="tap-target -ml-1 flex min-w-0 items-center gap-1 rounded-lg px-1 text-left"
        >
          <span className="truncate text-sm font-semibold">
            {warmupSet
              ? t("Warm-up")
              : tempo
                ? t("Timed set {label}", { label })
                : t("Set {label} of {total}", {
                    label,
                    total: exercise.sets.filter(isSerieValida).length,
                  })}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
        {previous ? (
          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
            {t("last: {value}", { value: previous })}
          </span>
        ) : null}
      </div>

      {target || beat || reason ? (
        <div className="mt-1">
          {target || beat ? (
            <button
              type="button"
              onClick={() => reason && setWhyOpen((v) => !v)}
              aria-expanded={reason ? whyOpen : undefined}
              className="flex w-full items-start gap-1 text-left"
            >
              {exercise.sugestao?.aumentou ? (
                <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-train" strokeWidth={3} />
              ) : null}
              <span className="min-w-0 text-xs font-semibold leading-snug text-train">
                {target ?? beat}
                {target && beat ? (
                  <span className="block font-medium text-muted-foreground">{beat}</span>
                ) : null}
              </span>
            </button>
          ) : null}
          {warmup ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{warmup}</p>
          ) : null}
          {reason && (whyOpen || !target) ? (
            <p className="mt-1 text-[11px] leading-snug text-foreground/80">{reason}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3">
        <SetFields set={set} exercise={exercise} onField={onField} big />
      </div>

      {hint ? (
        <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}

      <button
        type="button"
        onClick={onCheck}
        aria-label={t("Complete set")}
        className={cn(
          "tap-target mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground",
          justDone && "set-pop",
        )}
      >
        <Check className="size-6" strokeWidth={3} />
        {t("Complete set")}
      </button>
    </section>
  );
}

/**
 * Turn the previous set into a target: same load means one more rep beats it,
 * heavier load already beats it.
 */
function beatLine(
  t: (source: string, vars?: Record<string, string | number>) => string,
  set: ActiveSet,
): string | null {
  if (!isSerieValida(set) || isSerieTempo(set)) return null;
  if (set.antPeso === null || set.antReps === null || set.antPeso <= 0) return null;
  const planned = Number(set.pesoKg) || set.sugPeso || 0;
  if (planned <= 0) return null;
  if (planned > set.antPeso) {
    return t("{delta} above last time", {
      delta: `+${formatKg(Math.round((planned - set.antPeso) * 100) / 100)}`,
    });
  }
  if (planned === set.antPeso) {
    return t("{reps} reps beats last time", { reps: set.antReps + 1 });
  }
  return null;
}
