import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { NumberField } from "@/components/session/NumberField";
import { formatSignedStep } from "@/lib/set-input";
import { formatKg, weightUnitLabel } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { incrementoPara, isSerieTempo } from "@/lib/progression";
import type { ActiveExercise, ActiveSet } from "@/lib/session-state";
import { displayStep, fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { cn } from "@/lib/utils";

export type SetField = "pesoKg" | "reps" | "rpe";

/**
 * Weight and reps for one set. Weight is always stored in kg; the field shows
 * the user's unit. The grey target is accepted on focus so you only edit what
 * changed. `big` is the current-set layout: tall values with −/+ on the sides.
 */
export function SetFields({
  set,
  exercise,
  onField,
  big = false,
}: {
  set: ActiveSet;
  exercise: ActiveExercise;
  onField: (field: SetField, value: string) => void;
  big?: boolean;
}) {
  const t = useT();
  const tempo = isSerieTempo(set);
  const passoKg = incrementoPara(exercise.equipamento, exercise.grupoPrimario);
  const { unit } = useWeightUnit();
  const [draft, setDraft] = useState<string | null>(null);

  const shownWeight =
    draft ??
    (set.pesoKg === ""
      ? ""
      : String(Math.round(toDisplayWeight(Number(set.pesoKg) || 0, unit) * 100) / 100));
  const alvoPeso =
    set.sugPeso !== null && set.sugPeso > 0
      ? String(Math.round(toDisplayWeight(set.sugPeso, unit) * 100) / 100)
      : "";
  const alvoReps = set.sugReps !== null && set.sugReps > 0 ? String(set.sugReps) : "";

  function writeWeight(displayValue: string) {
    setDraft(displayValue);
    if (displayValue.trim() === "") {
      onField("pesoKg", "");
      return;
    }
    const parsed = Number(displayValue.replace(",", "."));
    if (Number.isNaN(parsed)) return;
    onField("pesoKg", String(Math.round(fromDisplayWeight(parsed, unit) * 1000) / 1000));
  }

  function stepKg(deltaKg: number) {
    const atualKg = Number(set.pesoKg) || set.sugPeso || set.antPeso || 0;
    const step = displayStep(deltaKg, unit);
    const nextDisplay = Math.max(
      0,
      Math.round((toDisplayWeight(atualKg, unit) + step) * 100) / 100,
    );
    setDraft(String(nextDisplay));
    onField("pesoKg", String(Math.round(fromDisplayWeight(nextDisplay, unit) * 1000) / 1000));
  }

  function stepReps(delta: number) {
    const atual = Number(set.reps) || set.sugReps || 0;
    onField("reps", String(Math.max(0, Math.round(atual + delta))));
  }

  function acceptWeightTarget() {
    if (shownWeight === "" && alvoPeso !== "") writeWeight(alvoPeso);
  }
  function acceptRepsTarget() {
    if (set.reps === "" && alvoReps !== "") onField("reps", alvoReps);
  }

  const weightField = (
    <NumberField
      value={shownWeight}
      onChange={writeWeight}
      onBlur={() => setDraft(null)}
      onFocus={acceptWeightTarget}
      onStep={(direction, bigStep) => stepKg(direction * (bigStep ? passoKg * 4 : passoKg))}
      scrub={{
        getValue: () =>
          toDisplayWeight(Number(set.pesoKg) || set.sugPeso || set.antPeso || 0, unit),
        stepFor: (tier) =>
          displayStep(tier === "coarsest" ? 20 : tier === "coarse" ? 10 : passoKg, unit),
        onValue: (value) => writeWeight(String(value)),
        formatValue: (value, delta) =>
          `${formatKg(value)} ${weightUnitLabel()}${delta ? ` ${formatSignedStep(delta)}` : ""}`,
        formatStep: (step) => t("step {step}", { step: formatKg(step) }),
      }}
      inputMode="decimal"
      placeholder={alvoPeso || weightUnitLabel()}
      ariaLabel={t("Weight in {unit}", { unit: weightUnitLabel() })}
      size={big ? "lg" : "md"}
    />
  );

  const repsField = (
    <NumberField
      value={set.reps}
      onChange={(v) => onField("reps", v)}
      onFocus={acceptRepsTarget}
      onStep={(direction, bigStep) => stepReps(direction * (bigStep ? 5 : 1))}
      scrub={{
        getValue: () => Number(set.reps) || set.sugReps || 0,
        stepFor: (tier) => (tier === "fine" ? 1 : 5),
        onValue: (value) => onField("reps", String(Math.round(value))),
        formatValue: (value, delta) =>
          `${Math.round(value)}${delta ? ` ${formatSignedStep(delta)}` : ""}`,
        formatStep: (step) => t("step {step}", { step: String(step) }),
      }}
      inputMode="numeric"
      placeholder={tempo ? t("sec") : alvoReps || `${exercise.repsMin}-${exercise.repsMax}`}
      ariaLabel={tempo ? t("Seconds") : t("Reps")}
      size={big ? "lg" : "md"}
    />
  );

  // A timed set (plank, dead hang...) has no weight to speak of — just duration.
  if (!big) {
    return (
      <div className={cn("grid gap-2", tempo ? "grid-cols-1" : "grid-cols-2")}>
        {tempo ? null : (
          <label className="block">
            <span className="label-caps block text-center">{weightUnitLabel()}</span>
            <span className="mt-1 block">{weightField}</span>
          </label>
        )}
        <label className="block">
          <span className="label-caps block text-center">{tempo ? t("sec") : t("Reps")}</span>
          <span className="mt-1 block">{repsField}</span>
        </label>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2", tempo ? "grid-cols-1" : "grid-cols-2")}>
      {tempo ? null : (
        <Stepper
          label={weightUnitLabel()}
          onMinus={() => stepKg(-passoKg)}
          onPlus={() => stepKg(passoKg)}
          minusLabel={t("Decrease weight")}
          plusLabel={t("Increase weight")}
        >
          {weightField}
        </Stepper>
      )}
      <Stepper
        label={tempo ? t("sec") : t("Reps")}
        onMinus={() => stepReps(-1)}
        onPlus={() => stepReps(1)}
        minusLabel={t("Decrease reps")}
        plusLabel={t("Increase reps")}
      >
        {repsField}
      </Stepper>
    </div>
  );
}

function Stepper({
  label,
  children,
  onMinus,
  onPlus,
  minusLabel,
  plusLabel,
}: {
  label: string;
  children: React.ReactNode;
  onMinus: () => void;
  onPlus: () => void;
  minusLabel: string;
  plusLabel: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-2 px-0.5 pb-1 pt-2">
      <p className="label-caps text-center">{label}</p>
      <div className="mt-0.5 grid grid-cols-[40px_minmax(0,1fr)_40px] items-center">
        <StepButton onClick={onMinus} label={minusLabel}>
          <Minus className="size-4" strokeWidth={2.6} />
        </StepButton>
        {children}
        <StepButton onClick={onPlus} label={plusLabel}>
          <Plus className="size-4" strokeWidth={2.6} />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  // The whole cell is the hit area (40 × 56 px); only the circle shows.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group flex h-14 w-full items-center justify-center text-muted-foreground"
    >
      <span className="grid size-9 place-items-center rounded-full group-active:bg-surface-3">
        {children}
      </span>
    </button>
  );
}
