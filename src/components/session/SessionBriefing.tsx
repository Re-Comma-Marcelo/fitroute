import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUp, Flame, Loader2, MessageSquareQuote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { READINESS_LEVELS } from "@/lib/coach/readiness";
import { getRecentCoachNotes } from "@/lib/data/coach-notes";
import { exercisePreview, type ExercisePreview } from "@/lib/exercise-preview";
import { formatKg } from "@/lib/format";
import { hapticSuccess, hapticTick } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { VOLUNTARY_DELOAD_PCT } from "@/lib/progression";
import { estimateSessionMinutes } from "@/lib/routine-estimate";
import type { ActiveSession } from "@/lib/session-state";
import type { Readiness } from "@/lib/types";
import { cn } from "@/lib/utils";
import { withWarmup } from "@/lib/warmup";

export interface BriefingChoices {
  readiness: Readiness | null;
  warmup: boolean;
}

/** A coach note older than this is not news at the start of a workout. */
const NOTE_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const MAX_ROWS = 5;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The workout's opening briefing, shown inside the start intro once the mark
 * has drawn: what today holds (exercises, time, the lift to push, the latest
 * note), how you feel (😴 offers the lighter version), an optional warm-up
 * ramp for the first exercise, and one big "Let's go" that starts the clock.
 */
export function SessionBriefing({
  session,
  onDeload,
  onBegin,
}: {
  session: ActiveSession;
  /** Rebuilds the session lighter (or back to full); resolves false on failure. */
  onDeload: (on: boolean) => Promise<boolean>;
  onBegin: (choices: BriefingChoices) => void;
}) {
  const t = useT();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [warmup, setWarmup] = useState(false);
  const [switching, setSwitching] = useState(false);

  const rows = useMemo(
    () =>
      session.exercicios
        .filter((ex) => !ex.pulado)
        .map((ex) => ({ ex, preview: exercisePreview(ex) })),
    [session],
  );
  const push = rows.find((r) => r.preview.up) ?? null;

  const first = session.exercicios[session.atual] ?? session.exercicios[0];
  const warmed = useMemo(() => (first ? withWarmup(first) : null), [first]);
  const warmupSets = warmed && first ? warmed.sets.length - first.sets.length : 0;

  const minutes = useMemo(() => {
    if (!warmup || !warmed) return estimateSessionMinutes(session);
    const idx = session.exercicios.indexOf(first!);
    const exercicios = session.exercicios.map((ex, i) => (i === idx ? warmed : ex));
    return estimateSessionMinutes({ ...session, exercicios });
  }, [session, warmup, warmed, first]);

  const notesQ = useQuery({
    queryKey: ["coach-notes", "recent", 1],
    queryFn: () => getRecentCoachNotes(1),
  });
  const note = notesQ.data?.[0];
  const freshNote =
    note && Date.now() - new Date(note.createdAt).getTime() <= NOTE_MAX_AGE_MS ? note : null;

  const canDeload = Boolean(session.routineId);
  const deloadOn = Boolean(session.deload);
  const showDeload = canDeload && (readiness === "low" || deloadOn);
  const pct = Math.round(VOLUNTARY_DELOAD_PCT * 100);

  async function toggleDeload(on: boolean) {
    if (switching) return;
    setSwitching(true);
    const ok = await onDeload(on);
    setSwitching(false);
    if (ok) hapticTick();
  }

  function begin() {
    hapticSuccess();
    onBegin({ readiness, warmup: warmup && warmupSets > 0 });
  }

  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <div className="-mx-5 min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-5">
        <p className="text-center text-sm text-muted-foreground tabular-nums">
          {t("{count} exercises", { count: rows.length })}
          {" · "}
          {t("~{min} min", { min: minutes })}
          {deloadOn ? ` · ${t("Lighter")}` : ""}
        </p>

        {push ? (
          <div className="rounded-2xl border border-primary/50 bg-primary/10 px-4 py-3">
            <p className="label-caps text-primary">{t("Today's chance to progress")}</p>
            <p className="mt-1 text-base font-semibold leading-snug">
              {push.ex.nome}
              {": "}
              <span className="tabular-nums">{targetText(t, push.preview)}</span>
            </p>
            {push.preview.lastKg !== null && push.preview.todayKg !== null ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {t("+{weight} vs last time", {
                  weight: formatKg(push.preview.todayKg - push.preview.lastKg),
                })}
              </p>
            ) : null}
          </div>
        ) : null}

        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.slice(0, MAX_ROWS).map(({ ex, preview }, i) => (
            <li
              key={`${ex.exerciseId}-${i}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{ex.nome}</span>
              {preview.up ? (
                <ArrowUp
                  className="size-3.5 shrink-0 text-primary"
                  aria-label={t("Heavier than last time")}
                />
              ) : null}
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {t("{sets} × {target}", { sets: preview.sets, target: targetText(t, preview) })}
              </span>
            </li>
          ))}
          {rows.length > MAX_ROWS ? (
            <li className="px-4 py-2 text-xs text-muted-foreground">
              {t("+{count} more", { count: rows.length - MAX_ROWS })}
            </li>
          ) : null}
        </ul>

        {freshNote ? (
          <div className="flex gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3">
            <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="label-caps text-muted-foreground">{t("Latest note")}</p>
              <p className="line-clamp-3 text-sm leading-snug">{freshNote.content}</p>
            </div>
          </div>
        ) : null}

        <section className="space-y-2">
          <p className="text-sm font-semibold">{t("How are you feeling today?")}</p>
          <div className="grid grid-cols-3 gap-2">
            {READINESS_LEVELS.map(({ level, emoji, label }) => (
              <button
                key={level}
                type="button"
                aria-pressed={readiness === level}
                onClick={() => {
                  hapticTick();
                  setReadiness((prev) => (prev === level ? null : level));
                }}
                className={cn(
                  "tap-target flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors",
                  readiness === level
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {emoji}
                </span>
                {t(label)}
              </button>
            ))}
          </div>

          {showDeload ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-semibold">
                {deloadOn ? t("Lighter version on") : t("Take it lighter today?")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("Fewer sets and about {pct}% less load. Still counts.", { pct })}
              </p>
              <Button
                variant={deloadOn ? "ghost" : "secondary"}
                size="sm"
                className="mt-2"
                disabled={switching}
                onClick={() => void toggleDeload(!deloadOn)}
              >
                {switching ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                {deloadOn ? t("Back to the full workout") : t("Switch to the lighter version")}
              </Button>
            </div>
          ) : readiness === "high" ? (
            <p className="text-xs text-muted-foreground">
              {t("Good day to push — go for the top of the rep range.")}
            </p>
          ) : null}
        </section>

        {warmupSets > 0 && first ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <Flame className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("Warm up first")}</span>
              <span className="block text-xs text-muted-foreground">
                {t("{count} ramp-up sets on {exercise}, with the rest timer", {
                  count: warmupSets,
                  exercise: first.nome,
                })}
              </span>
            </span>
            <Switch checked={warmup} onCheckedChange={setWarmup} />
          </label>
        ) : null}
      </div>

      <Button
        size="lg"
        className="h-14 w-full shrink-0 rounded-2xl text-base font-semibold"
        disabled={switching}
        onClick={begin}
      >
        {t("Let's go")}
      </Button>
    </motion.div>
  );
}

/** "82.5 kg × 8", or the rep range for bodyweight / not-yet-weighted lifts. */
function targetText(t: ReturnType<typeof useT>, p: ExercisePreview): string {
  const reps =
    p.todayReps !== null
      ? String(p.todayReps)
      : p.repsMin === p.repsMax
        ? String(p.repsMin)
        : `${p.repsMin}–${p.repsMax}`;
  return p.todayKg !== null ? t("{weight} × {reps}", { weight: formatKg(p.todayKg), reps }) : reps;
}
