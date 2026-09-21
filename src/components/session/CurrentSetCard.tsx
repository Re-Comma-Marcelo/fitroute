import { Check, ChevronDown, TrendingUp } from "lucide-react";
import { SetFields, type SetField } from "@/components/session/SetFields";
import { formatKg } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { isSerieTempo, isSerieValida } from "@/lib/progression";
import type { ActiveExercise, ActiveSet } from "@/lib/session-state";
import { cn } from "@/lib/utils";

/**
 * The one thing on screen: the set you are about to do. Big weight and reps,
 * the last time as reference, the coach's note, and a full-width check.
 * Everything else about the exercise lives behind the ⋯ menu.
 */
export function CurrentSetCard({
  exercise,
  set,
  label,
  coachTip,
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
  /** The coach's note for this set — the one thing worth reading before you lift. */
  coachTip?: string | undefined;
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
  const warmupSet = !isSerieValida(set);
  const tempo = isSerieTempo(set);

  const previous =
    set.antPeso !== null && set.antReps !== null
      ? `${formatKg(set.antPeso)} × ${set.antReps}${set.antRpe ? ` @${set.antRpe}` : ""}`
      : null;

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

      {coachTip || warmup || reason ? (
        <div className="mt-1">
          {coachTip ? (
            <p className="flex items-start gap-1 text-xs font-semibold leading-snug text-train">
              {exercise.sugestao?.aumentou ? (
                <TrendingUp className="mt-0.5 size-3.5 shrink-0" strokeWidth={3} />
              ) : null}
              <span className="min-w-0">{coachTip}</span>
            </p>
          ) : null}
          {warmup ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{warmup}</p>
          ) : null}
          {reason ? (
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
