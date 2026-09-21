import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RpeScale } from "@/components/RpeScale";
import { SetFields, type SetField } from "@/components/session/SetFields";
import { useT } from "@/lib/i18n";
import type { ActiveExercise, ActiveSet } from "@/lib/session-state";
import type { TipoSerie } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: TipoSerie[] = ["aquecimento", "normal", "falha", "drop", "tempo"];

/**
 * Everything about one set that is not "do it": fix the numbers, rate the
 * effort, change the type, leave a note for the coach, untick or drop it.
 */
export function SetEditSheet({
  open,
  onOpenChange,
  exercise,
  set,
  label,
  typeName,
  onField,
  onTipo,
  onNote,
  onUncheck,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: ActiveExercise | null;
  set: ActiveSet | null;
  label: string;
  typeName: Record<TipoSerie, string>;
  onField: (field: SetField, value: string) => void;
  onTipo: (tipo: TipoSerie) => void;
  onNote: (value: string) => void;
  onUncheck: () => void;
  onRemove: () => void;
  /** Reorder this set within the exercise — e.g. move a warm-up set added late back to the front. */
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const t = useT();
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) setNote(set?.coachNote ?? "");
  }, [open, set?.coachNote]);

  if (!exercise || !set) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">
            {t("Set {label}", { label })}
            <span className="ml-2 text-sm font-medium text-muted-foreground">{exercise.nome}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <SetFields set={set} exercise={exercise} onField={onField} />

          {set.concluida && set.tipoSerie !== "aquecimento" ? (
            <div>
              <p className="label-caps mb-2">{t("RPE")}</p>
              <RpeScale
                value={set.rpe ? Number(set.rpe) : null}
                onChange={(v) => onField("rpe", String(v))}
              />
            </div>
          ) : null}

          <div>
            <p className="label-caps mb-2">{t("Order")}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="tap-target flex-1"
                disabled={!canMoveUp}
                onClick={() => onMove(-1)}
                aria-label={t("Move up")}
              >
                <ArrowUp className="mr-1.5 size-4" /> {t("Move up")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="tap-target flex-1"
                disabled={!canMoveDown}
                onClick={() => onMove(1)}
                aria-label={t("Move down")}
              >
                <ArrowDown className="mr-1.5 size-4" /> {t("Move down")}
              </Button>
            </div>
          </div>

          <div>
            <p className="label-caps mb-2">{t("Set type")}</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => onTipo(tipo)}
                  aria-pressed={set.tipoSerie === tipo}
                  className={cn(
                    "tap-target rounded-full border px-3 text-xs font-semibold",
                    set.tipoSerie === tipo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {typeName[tipo]}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="label-caps">{t("Note for coach (optional)")}</span>
            <Input
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                onNote(e.target.value);
              }}
              placeholder={t("e.g., lower back felt tight")}
              maxLength={140}
              className="mt-1.5 h-11"
            />
          </label>

          <div className="flex gap-2">
            {set.concluida ? (
              <Button
                variant="outline"
                className="tap-target flex-1"
                onClick={() => {
                  onUncheck();
                  onOpenChange(false);
                }}
              >
                <Undo2 className="mr-1.5 size-4" /> {t("Uncheck set")}
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="tap-target flex-1 text-destructive"
              onClick={() => {
                onRemove();
                onOpenChange(false);
              }}
            >
              <Trash2 className="mr-1.5 size-4" /> {t("Remove set")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
