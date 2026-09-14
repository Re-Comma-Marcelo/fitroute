import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Flag, Pause, Play, Plus, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration, formatKg } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { isSerieValida } from "@/lib/progression";
import {
  isSessionPaused,
  sessionElapsed,
  sessionLabel,
  sessionSetsDone,
  sessionVolume,
  type ActiveSession,
} from "@/lib/session-state";
import { cn } from "@/lib/utils";

/**
 * The whole workout in one sheet: every exercise (jump, reorder), add one,
 * the session note, the clock, and the way out. Opened from the header.
 */
export function SessionSheet({
  open,
  onOpenChange,
  session,
  currentIdx,
  blockLabel,
  onJump,
  onMove,
  onAddExercise,
  onNote,
  onTogglePause,
  onFinish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ActiveSession;
  currentIdx: number;
  blockLabel: Record<string, string>;
  onJump: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onAddExercise: () => void;
  onNote: (value: string) => void;
  onTogglePause: () => void;
  onFinish: () => void;
}) {
  const t = useT();
  const [noteOpen, setNoteOpen] = useState(false);
  const paused = isSessionPaused(session);
  const showNote = noteOpen || session.notas.trim() !== "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">{sessionLabel(session)}</SheetTitle>
        </SheetHeader>
        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
          {t("{time} · {sets} sets · {volume}", {
            time: formatDuration(sessionElapsed(session)),
            sets: sessionSetsDone(session),
            volume: formatKg(Math.round(sessionVolume(session))),
          })}
        </p>

        <ol className="mt-4 space-y-1">
          {session.exercicios.map((ex, idx) => {
            const validas = ex.sets.filter(isSerieValida).length;
            const feitas = ex.sets.filter((s) => s.concluida && isSerieValida(s)).length;
            const done = validas > 0 && feitas >= validas;
            const current = idx === currentIdx;
            return (
              <li key={`${ex.exerciseId}-${idx}`} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onJump(idx);
                    onOpenChange(false);
                  }}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "tap-target flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left",
                    current && "bg-primary/10",
                    ex.pulado && "opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums",
                      done
                        ? "bg-success/15 text-success"
                        : current
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-3 text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-4" strokeWidth={3} /> : idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-semibold",
                        ex.pulado && "line-through",
                      )}
                    >
                      {blockLabel[ex.exerciseId] ? (
                        <span className="mr-1.5 rounded bg-train/15 px-1 text-[10px] font-bold text-train">
                          {blockLabel[ex.exerciseId]}
                        </span>
                      ) : null}
                      {ex.nome}
                    </span>
                    <span className="block text-xs tabular-nums text-muted-foreground">
                      {t("{done}/{total} sets", { done: feitas, total: validas })}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => onMove(idx, -1)}
                  aria-label={t("Move up")}
                  className="tap-target grid size-10 place-items-center rounded-full text-muted-foreground disabled:opacity-30"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === session.exercicios.length - 1}
                  onClick={() => onMove(idx, 1)}
                  aria-label={t("Move down")}
                  className="tap-target grid size-10 place-items-center rounded-full text-muted-foreground disabled:opacity-30"
                >
                  <ArrowDown className="size-4" />
                </button>
              </li>
            );
          })}
        </ol>

        <Button
          variant="secondary"
          className="tap-target mt-2 w-full font-semibold"
          onClick={() => {
            onOpenChange(false);
            onAddExercise();
          }}
        >
          <Plus className="mr-1 size-4" /> {t("Add exercise")}
        </Button>

        <div className="mt-5 space-y-2 border-t border-border pt-4">
          {showNote ? (
            <Textarea
              autoFocus={session.notas === ""}
              value={session.notas}
              onChange={(e) => onNote(e.target.value)}
              placeholder={t("Session note")}
              className="min-h-11 text-sm"
            />
          ) : (
            <Button
              variant="ghost"
              className="tap-target w-full justify-start text-sm font-medium text-muted-foreground"
              onClick={() => setNoteOpen(true)}
            >
              <StickyNote className="mr-2 size-4" /> {t("Session note")}
            </Button>
          )}
          <Button
            variant="ghost"
            className="tap-target w-full justify-start text-sm font-medium text-muted-foreground"
            onClick={onTogglePause}
            aria-pressed={paused}
          >
            {paused ? <Play className="mr-2 size-4" /> : <Pause className="mr-2 size-4" />}
            {paused ? t("Resume clock") : t("Pause clock")}
          </Button>
          <Button
            className="tap-target h-12 w-full font-semibold"
            onClick={() => {
              onOpenChange(false);
              onFinish();
            }}
          >
            <Flag className="mr-2 size-4" /> {t("Finish workout")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
