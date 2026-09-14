import { useEffect, useState } from "react";
import {
  Flame,
  History,
  PlayCircle,
  Plus,
  Replace,
  SkipForward,
  StickyNote,
  Timer,
  Trash2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { PlateCalculatorSheet } from "@/components/PlateCalculatorSheet";
import { formatRest } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { usesPlates } from "@/lib/plates";
import type { ActiveExercise } from "@/lib/session-state";
import { cn } from "@/lib/utils";

const REST_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 135, 150, 180, 210, 240, 300];

export type ExerciseMenuAction =
  "watch" | "history" | "replace" | "warmup" | "addSet" | "skip" | "remove" | "startRest";

/**
 * Everything about the exercise that is not logging a set, in one sheet:
 * how to do it, history, rest length, plates, swap, warm-up, skip, note.
 */
export function ExerciseMenuSheet({
  open,
  onOpenChange,
  exercise,
  restSeconds,
  plateTargetKg,
  onRest,
  onNote,
  onAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: ActiveExercise | null;
  restSeconds: number;
  plateTargetKg: number;
  onRest: (segundos: number) => void;
  onNote: (value: string) => void;
  onAction: (action: ExerciseMenuAction) => void;
}) {
  const t = useT();
  const [restOpen, setRestOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    setRestOpen(false);
    setNoteOpen(Boolean(exercise?.notas.trim()));
  }, [open, exercise?.notas]);

  if (!exercise) return null;

  function run(action: ExerciseMenuAction) {
    onOpenChange(false);
    onAction(action);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="truncate text-lg">{exercise.nome}</SheetTitle>
        </SheetHeader>

        <ul className="mt-3 divide-y divide-border/60">
          <Row icon={<PlayCircle className="size-5" />} onClick={() => run("watch")}>
            {t("Watch how to do it")}
          </Row>
          <Row icon={<History className="size-5" />} onClick={() => run("history")}>
            {t("Exercise history")}
          </Row>

          <li>
            <button
              type="button"
              onClick={() => setRestOpen((v) => !v)}
              aria-expanded={restOpen}
              className="tap-target flex w-full items-center gap-3 py-3 text-left text-sm font-medium"
            >
              <Timer className="size-5 text-muted-foreground" />
              <span className="flex-1">{t("Rest for this exercise")}</span>
              <span className="tabular-nums text-muted-foreground">{formatRest(restSeconds)}</span>
            </button>
            {restOpen ? (
              <div className="pb-3">
                <div className="grid grid-cols-4 gap-1.5">
                  {REST_OPTIONS.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        onRest(op);
                        setRestOpen(false);
                      }}
                      className={cn(
                        "tap-target rounded-lg border text-sm font-semibold tabular-nums",
                        op === restSeconds
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card",
                      )}
                    >
                      {formatRest(op)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => run("startRest")}
                  className="tap-target mt-2 w-full rounded-lg bg-surface-3 text-sm font-semibold text-primary"
                >
                  {t("Start rest now")}
                </button>
              </div>
            ) : null}
          </li>

          {usesPlates(exercise.equipamento) ? (
            <li className="flex items-center gap-3 py-2">
              <span className="text-sm font-medium">{t("Plates")}</span>
              <span className="ml-auto">
                <PlateCalculatorSheet targetKg={plateTargetKg} />
              </span>
            </li>
          ) : null}

          <Row icon={<Replace className="size-5" />} onClick={() => run("replace")}>
            {t("Replace exercise")}
          </Row>
          <Row icon={<Flame className="size-5" />} onClick={() => run("warmup")}>
            {t("Add warm-up sets")}
          </Row>
          <Row icon={<Plus className="size-5" />} onClick={() => run("addSet")}>
            {t("Add set")}
          </Row>
          <Row icon={<SkipForward className="size-5" />} onClick={() => run("skip")}>
            {exercise.pulado ? t("Resume exercise") : t("Skip exercise")}
          </Row>

          <li>
            <button
              type="button"
              onClick={() => setNoteOpen((v) => !v)}
              aria-expanded={noteOpen}
              className="tap-target flex w-full items-center gap-3 py-3 text-left text-sm font-medium"
            >
              <StickyNote className="size-5 text-muted-foreground" />
              <span className="flex-1">{t("Exercise note")}</span>
            </button>
            {noteOpen ? (
              <Textarea
                autoFocus={exercise.notas === ""}
                value={exercise.notas}
                onChange={(e) => onNote(e.target.value)}
                placeholder={t("Exercise note (e.g., closer grip)")}
                className="mb-3 min-h-11 text-sm"
              />
            ) : null}
          </li>

          <Row
            icon={<Trash2 className="size-5" />}
            onClick={() => run("remove")}
            className="text-destructive"
          >
            {t("Remove exercise")}
          </Row>
        </ul>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  icon,
  onClick,
  children,
  className,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "tap-target flex w-full items-center gap-3 py-3 text-left text-sm font-medium",
          className,
        )}
      >
        <span className={cn("text-muted-foreground", className)}>{icon}</span>
        {children}
      </button>
    </li>
  );
}
