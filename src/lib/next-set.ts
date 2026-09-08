import { formatNumber, tx } from "./format";
import { incrementoPara } from "./progression";

/**
 * Autoregulation between sets: the app decides the target for the next set from
 * what just happened, so nobody has to set a goal by hand. Pure helper.
 *
 * Double progression: own the top of the rep range at an easy effort and the
 * weight goes up; grind it and the weight holds while the reps stay realistic.
 */
export interface NextTarget {
  pesoKg: number;
  reps: number;
  /** One line explaining the target, shown above the sets. */
  line: string;
}

export interface LoggedSet {
  pesoKg: number;
  reps: number;
  rpe?: number | null;
}

export function nextSetTarget(
  ex: { repsMin: number; repsMax: number; equipamento?: string },
  logged: LoggedSet,
): NextTarget | null {
  const peso = Number(logged.pesoKg) || 0;
  const reps = Math.round(Number(logged.reps) || 0);
  if (peso <= 0 || reps <= 0) return null;

  const repsMin = Math.max(1, ex.repsMin || 8);
  const repsMax = Math.max(repsMin, ex.repsMax || repsMin + 4);
  const step = incrementoPara(ex.equipamento ?? "");
  const rpe = typeof logged.rpe === "number" && logged.rpe > 0 ? logged.rpe : null;

  const easy = reps >= repsMax && (rpe === null || rpe <= 8);
  const hard = (rpe !== null && rpe >= 9.5) || reps < repsMin;

  let pesoKg = peso;
  let alvo = reps;

  if (easy) {
    pesoKg = peso + step;
    alvo = repsMin;
  } else if (hard) {
    alvo = Math.max(repsMin, reps - 1);
  } else {
    alvo = Math.min(repsMax, reps + 1);
  }

  const weight = formatNumber(pesoKg, 1);
  const line = easy
    ? tx(
        "Next set: {weight} kg x {reps}. That was clean, so the weight goes up — all {reps} reps.",
        {
          weight,
          reps: alvo,
        },
      )
    : hard
      ? tx("Next set: {weight} kg x {reps}. Hold this weight and keep the reps honest.", {
          weight,
          reps: alvo,
        })
      : tx("Next set: {weight} kg x {reps}. It can feel heavy, but you need all {reps}.", {
          weight,
          reps: alvo,
        });

  return { pesoKg: Math.round(pesoKg * 100) / 100, reps: alvo, line };
}
