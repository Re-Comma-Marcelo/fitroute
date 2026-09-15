import { formatNumber, tx } from "./format";
import { classifyExercise, failureBackoff, loadIncrement, type LoadShape } from "./load-step";
import { RPE_HOLD_MIN, RPE_INCREASE_MAX } from "./progression";

/**
 * Autoregulation between sets: the app decides the target for the next set from
 * what just happened, so nobody has to set a goal by hand. Pure helper.
 *
 * Double progression: own the top of the rep range at an easy effort and the
 * weight goes up; grind it and the weight holds while the reps stay realistic.
 *
 * Failure is expensive: a set at RPE 10 costs the next sets 2-4 reps at the
 * same load (repeated sets to failure lose reps every set even with 2 min
 * rest). Helms et al. 2018 handle that with "RPE stops": back-off sets drop
 * the load 2-6% so the rep target stays reachable. On a compound lift the
 * app takes the weight down one small step; on an isolation move (where one
 * plate is already a big share of the load) it holds the weight and trims
 * the rep target instead.
 */
export interface NextTarget {
  pesoKg: number;
  reps: number;
  /** One line explaining the target, shown above the sets. */
  line: string;
  /** What the rule decided, for tests and analytics. */
  decision: "increase" | "hold" | "trim-reps" | "backoff";
}

export interface LoggedSet {
  pesoKg: number;
  reps: number;
  rpe?: number | null;
}

export interface NextSetExercise extends LoadShape {
  repsMin: number;
  repsMax: number;
}

export function nextSetTarget(ex: NextSetExercise, logged: LoggedSet): NextTarget | null {
  const peso = Number(logged.pesoKg) || 0;
  const reps = Math.round(Number(logged.reps) || 0);
  if (peso <= 0 || reps <= 0) return null;

  const repsMin = Math.max(1, ex.repsMin || 8);
  const repsMax = Math.max(repsMin, ex.repsMax || repsMin + 4);
  const rpe = typeof logged.rpe === "number" && logged.rpe > 0 ? logged.rpe : null;
  const isolation = classifyExercise(ex) === "isolation";

  const failure = rpe !== null && rpe >= 10;
  const underRange = reps < repsMin;
  const easy = reps >= repsMax && (rpe === null || rpe <= RPE_INCREASE_MAX);
  const hard = (rpe !== null && rpe >= RPE_HOLD_MIN) || underRange;

  let pesoKg = peso;
  let alvo = reps;
  let decision: NextTarget["decision"];

  if (easy) {
    pesoKg = peso + loadIncrement(ex, peso);
    alvo = repsMin;
    decision = "increase";
  } else if (failure || (underRange && (rpe === null || rpe >= 9))) {
    // Failure, or short of the range while grinding: the load is too heavy
    // for the next set. Back it off so the reps come back — unless the
    // equipment can't express a small drop, then keep the weight and ask for
    // fewer reps.
    const drop = failureBackoff(ex, peso);
    if (drop > 0 && !(isolation && !underRange)) {
      pesoKg = peso - drop;
      alvo = Math.min(repsMax, Math.max(repsMin, reps));
      decision = "backoff";
    } else {
      alvo = Math.max(repsMin, reps - 2);
      decision = "trim-reps";
    }
  } else if (hard) {
    alvo = Math.max(repsMin, reps - 1);
    decision = "trim-reps";
  } else {
    alvo = Math.min(repsMax, reps + 1);
    decision = "hold";
  }

  const weight = formatNumber(pesoKg, 1);
  let line: string;
  switch (decision) {
    case "increase":
      line = tx(
        "Next set: {weight} kg x {reps}. That was clean, so the weight goes up — all {reps} reps.",
        { weight, reps: alvo },
      );
      break;
    case "backoff":
      line = failure
        ? tx(
            "Next set: {weight} kg x {reps}. You hit failure — backing the weight off a little so the reps come back.",
            { weight, reps: alvo },
          )
        : tx(
            "Next set: {weight} kg x {reps}. Short of the range, so the weight comes down to get you into it.",
            { weight, reps: alvo },
          );
      break;
    case "trim-reps":
      line = failure
        ? tx(
            "Next set: {weight} kg x {reps}. Failure costs reps — hold the weight and aim a couple lower.",
            { weight, reps: alvo },
          )
        : tx("Next set: {weight} kg x {reps}. Hold this weight and keep the reps honest.", {
            weight,
            reps: alvo,
          });
      break;
    default:
      line = tx("Next set: {weight} kg x {reps}. It can feel heavy, but you need all {reps}.", {
        weight,
        reps: alvo,
      });
  }

  return { pesoKg: Math.round(pesoKg * 100) / 100, reps: alvo, line, decision };
}
