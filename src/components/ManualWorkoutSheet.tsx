import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { buildManualWorkout, type ManualEntryRow } from "@/lib/manual-workout";
import { saveWorkout } from "@/lib/data/workouts";
import { weightUnitLabel } from "@/lib/format";
import { fromDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { cn } from "@/lib/utils";
import type { Exercise, Routine } from "@/lib/types";

/** Logs a workout that happened away from the phone, so the history stays honest. */
export function ManualWorkoutSheet({
  open,
  onOpenChange,
  routines,
  exercises,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routines: Routine[];
  exercises: Exercise[];
}) {
  const t = useT();
  const { unit } = useWeightUnit();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [data, setData] = useState(today);
  const [duration, setDuration] = useState("60");
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [rows, setRows] = useState<ManualEntryRow[]>([]);
  const [saving, setSaving] = useState(false);

  const routine = useMemo(
    () => routines.find((r) => r.id === routineId) ?? null,
    [routines, routineId],
  );

  // Picking a routine prefills its exercises with the planned sets and rep range.
  useEffect(() => {
    if (!routine) {
      setRows([]);
      return;
    }
    setRows(
      [...routine.exercicios]
        .sort((a, b) => a.ordem - b.ordem)
        .map((re) => ({
          exerciseId: re.exerciseId,
          nome: exercises.find((e) => e.id === re.exerciseId)?.nome ?? re.exerciseId,
          series: re.seriesAlvo,
          pesoKg: 0,
          reps: re.repsMax,
        })),
    );
  }, [routine, exercises]);

  function patchRow(index: number, patch: Partial<ManualEntryRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function submit() {
    const minutes = Number(duration.replace(",", "."));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      toast.error(t("Enter how long the workout took."));
      return;
    }
    setSaving(true);
    try {
      const draft = buildManualWorkout({
        data,
        durationMin: minutes,
        routine,
        rows: rows.map((row) => ({
          ...row,
          pesoKg: Math.round(fromDisplayWeight(row.pesoKg, unit) * 10) / 10,
        })),
      });
      await saveWorkout(draft.workout, draft.sets);
      await queryClient.invalidateQueries({ queryKey: ["workouts"] });
      await queryClient.invalidateQueries({ queryKey: ["workout-log"] });
      toast.success(t("Workout added to your history."));
      onOpenChange(false);
      setRoutineId(null);
      setData(today);
    } catch {
      toast.error(t("Could not save this workout. Check your connection and try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("Add a past workout")}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-muted-foreground">
            {t("Date")}
            <Input
              type="date"
              value={data}
              max={today}
              onChange={(e) => setData(e.target.value)}
              className="mt-1 h-11"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            {t("Minutes")}
            <Input
              value={duration}
              inputMode="numeric"
              onChange={(e) => setDuration(e.target.value)}
              className="numeric-field mt-1 h-11"
            />
          </label>
        </div>

        <p className="label-caps mt-4">{t("Routine")}</p>
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip active={routineId === null} onClick={() => setRoutineId(null)}>
            {t("No routine")}
          </Chip>
          {routines.map((r) => (
            <Chip key={r.id} active={routineId === r.id} onClick={() => setRoutineId(r.id)}>
              {r.nome}
            </Chip>
          ))}
        </div>

        {rows.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {rows.map((row, index) => (
              <li
                key={`${row.exerciseId}-${index}`}
                className="rounded-lg border border-border p-3"
              >
                <p className="truncate text-sm font-semibold">{row.nome}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <NumberField
                    label={t("Sets")}
                    value={row.series}
                    onChange={(v) => patchRow(index, { series: v })}
                  />
                  <NumberField
                    label={weightUnitLabel()}
                    value={row.pesoKg}
                    onChange={(v) => patchRow(index, { pesoKg: v })}
                    decimal
                  />
                  <NumberField
                    label={t("Reps")}
                    value={row.reps}
                    onChange={(v) => patchRow(index, { reps: v })}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-xs leading-snug text-muted-foreground">
            {t("Pick a routine to fill in its exercises, or save just the date and duration.")}
          </p>
        )}

        <Button
          className="mt-4 mb-4 h-12 w-full font-semibold"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? t("Saving…") : t("Save workout")}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function NumberField({
  label,
  value,
  onChange,
  decimal = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  decimal?: boolean;
}) {
  return (
    <label className="text-[11px] font-semibold text-muted-foreground">
      {label}
      <Input
        value={value === 0 ? "" : String(value)}
        inputMode={decimal ? "decimal" : "numeric"}
        placeholder="0"
        onChange={(e) => {
          const parsed = Number(e.target.value.replace(",", "."));
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        className="numeric-field mt-1 h-11"
      />
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tap-target shrink-0 rounded-sm border px-3 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
