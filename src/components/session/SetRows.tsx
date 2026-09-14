import { Check, MessageSquare, Trophy } from "lucide-react";
import { formatKg } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { isSerieTempo, isSerieValida } from "@/lib/progression";
import type { ActiveSet } from "@/lib/session-state";
import { cn } from "@/lib/utils";

/** A finished set, one quiet line: what you lifted, how hard it felt. Tap to edit. */
export function DoneSetRow({
  set,
  label,
  onClick,
  flash,
}: {
  set: ActiveSet;
  label: string;
  onClick: () => void;
  /** Row just ticked: brief green flash. */
  flash?: boolean;
}) {
  const t = useT();
  const warm = !isSerieValida(set);
  const tempo = isSerieTempo(set);
  const peso = Number(set.pesoKg) || 0;
  const reps = Number(set.reps) || 0;
  const line = `${formatKg(peso)} × ${reps}`;
  const rpeLine = set.rpe ? ` @${set.rpe}` : null;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={t("Edit set {label}", { label })}
        className={cn(
          "tap-target flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left",
          flash && "set-flash",
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success/15 text-success">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <span className={cn("w-8 shrink-0 text-xs font-semibold", warm && "text-muted-foreground")}>
          {warm ? t("W") : tempo ? `${label}s` : label}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm tabular-nums">
          {tempo ? (
            <>
              {reps} {t("sec")}
            </>
          ) : (
            <>
              {line}
              {rpeLine ? <span className="text-muted-foreground">{rpeLine}</span> : null}
            </>
          )}
        </span>
        {set.pr ? (
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success"
            aria-label={t("Personal record")}
          >
            <Trophy className="size-3" /> PR
          </span>
        ) : null}
        {set.coachNote?.trim() ? (
          <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : null}
      </button>
    </li>
  );
}

/** A set still to come: grey, no fields. Tap to change its type or drop it. */
export function PendingSetRow({
  set,
  label,
  repsRange,
  onClick,
}: {
  set: ActiveSet;
  label: string;
  repsRange: string;
  onClick: () => void;
}) {
  const t = useT();
  const warm = !isSerieValida(set);
  const tempo = isSerieTempo(set);
  const peso = Number(set.pesoKg) || set.sugPeso || 0;
  const reps = set.reps || (set.sugReps ? String(set.sugReps) : repsRange);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={t("Edit set {label}", { label })}
        className="tap-target flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left text-muted-foreground/60"
      >
        <span className="size-6 shrink-0 rounded-full border border-dashed border-border" />
        <span className="w-8 shrink-0 text-xs font-semibold">
          {warm ? t("W") : tempo ? `${label}s` : label}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm tabular-nums">
          {tempo ? t("timed") : peso > 0 ? `${formatKg(peso)} × ${reps}` : `— × ${reps}`}
        </span>
      </button>
    </li>
  );
}
