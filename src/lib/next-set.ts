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
  const grindy = rpe !== null && rpe >= 9.5;
  // Missed the rep floor: fatigue plus a target it couldn't hit means the next
  // set needs less weight, not the same weight with a *higher* rep ask.
  const missedBy = Math.max(0, repsMin - reps);
  const bigMiss = missedBy >= 2 || (grindy && missedBy > 0);
  const closeMiss = missedBy === 1 && !grindy;

  let pesoKg = peso;
  let alvo = reps;
  let kind: "easy" | "deload" | "hold" | "grind" | "climb";

  if (easy) {
    pesoKg = peso + step;
    alvo = repsMin;
    kind = "easy";
  } else if (bigMiss) {
    pesoKg = Math.max(0, peso - step);
    alvo = repsMin;
    kind = "deload";
  } else if (closeMiss) {
    // One rep short: same weight, chase the same number again — not repsMin.
    alvo = reps;
    kind = "hold";
  } else if (grindy) {
    alvo = Math.max(repsMin, reps - 1);
    kind = "grind";
  } else {
    alvo = Math.min(repsMax, reps + 1);
    kind = "climb";
  }

  const weight = formatNumber(pesoKg, 1);
  const line =
    kind === "easy"
      ? tx(
          "Next set: {weight} kg x {reps}. That was clean, so the weight goes up — all {reps} reps.",
          { weight, reps: alvo },
        )
      : kind === "deload"
        ? tx("Next set: {weight} kg x {reps}. You missed that one, so the weight comes down.", {
            weight,
            reps: alvo,
          })
        : kind === "hold"
          ? tx("Next set: {weight} kg x {reps}. So close — same weight, chase {reps} again.", {
              weight,
              reps: alvo,
            })
          : kind === "grind"
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
