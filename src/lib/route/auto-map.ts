/**
 * Mapping the route is the app's job, not the user's. This is the one place
 * that turns a goal date into checkpoints: the empty route screen, the re-map
 * button and the end of the plan interview all call it.
 */
import { getCheckpoints, removeCheckpoint, saveCheckpoint } from "@/lib/data/route";
import { formatKg } from "@/lib/format";
import { checkPace, type PaceCheck } from "@/lib/plan/guardrails";
import { buildCoachContext } from "./context";
import type { CoachContext } from "./context";
import { checkpointDates, daysBetween } from "./cadence";
import type { CheckpointMetric } from "./types";
import { generateCheckpoints } from "@/lib/route-ai.functions";
import { pathValues } from "./goal-path";

type AiCheckpoint = {
  title: string;
  description: string;
  date: string;
  metricKind: "lift" | "sessions" | "weight" | "none";
  exerciseId?: string;
  value?: number;
};

type RouteCopy = {
  /** "Goal {n}: {value}" — what's on schedule at this point, not a pep talk. */
  goal: (n: number, value: string) => string;
  finalGoal: (value: string) => string;
  sessionsGoal: (n: number, count: number) => string;
  finalSessions: (count: number) => string;
  progressDescription: string;
  consistencyDescription: string;
  finalDescription: string;
  /** What the weekly average should read by this checkpoint. */
  weightDescription: (value: string) => string;
  /** The heaviest set on this lift by this checkpoint. */
  liftDescription: (lift: string, value: string) => string;
};

function routeCopy(language: string): RouteCopy {
  if (language === "nl") {
    return {
      goal: (n, value) => `Doelstelling ${n}: ${value}`,
      finalGoal: (value) => `Einddoel: ${value}`,
      sessionsGoal: (n, count) => `Doelstelling ${n}: ${count}x trainen`,
      finalSessions: (count) => `Einddoel: ${count}x trainen`,
      progressDescription: "Controleer je voortgang en stuur je training bij waar nodig.",
      consistencyDescription: "Houd je geplande trainingsritme vast tot dit meetpunt.",
      finalDescription: "Evalueer je resultaat ten opzichte van je hoofddoel.",
      weightDescription: (value) =>
        `Je weekgemiddelde zit rond ${value}. Zo blijf je op schema naar je doel.`,
      liftDescription: (lift, value) => `Een set ${lift} op ${value}. Zo blijf je op schema.`,
    };
  }
  if (language === "pt") {
    return {
      goal: (n, value) => `Meta ${n}: ${value}`,
      finalGoal: (value) => `Meta final: ${value}`,
      sessionsGoal: (n, count) => `Meta ${n}: ${count}x treinos`,
      finalSessions: (count) => `Meta final: ${count}x treinos`,
      progressDescription: "Confira seu progresso e ajuste o treino quando necessário.",
      consistencyDescription: "Mantenha o ritmo de treinos planejado até este marco.",
      finalDescription: "Avalie seu resultado em relação ao objetivo principal.",
      weightDescription: (value) =>
        `Sua média semanal fica perto de ${value}. Assim você segue no ritmo do objetivo.`,
      liftDescription: (lift, value) =>
        `Uma série de ${lift} com ${value}. Assim você segue no ritmo.`,
    };
  }
  return {
    goal: (n, value) => `Goal ${n}: ${value}`,
    finalGoal: (value) => `Final goal: ${value}`,
    sessionsGoal: (n, count) => `Goal ${n}: ${count}x training`,
    finalSessions: (count) => `Final goal: ${count}x training`,
    progressDescription: "Review your progress and adjust your training where needed.",
    consistencyDescription: "Keep your planned training rhythm through this checkpoint.",
    finalDescription: "Evaluate your result against your main goal.",
    weightDescription: (value) =>
      `Your weekly average sits around ${value}. That keeps you on track for your goal.`,
    liftDescription: (lift, value) => `One set of ${lift} at ${value}. That keeps you on track.`,
  };
}

/**
 * The main goal as monthly steps on a straight line from where the goal
 * started: body weight, or one lift. Empty when the goal isn't measurable
 * yet (no target set), so the caller falls back to the coach.
 */
function goalCheckpoints(dates: string[], context: CoachContext, language: string): AiCheckpoint[] {
  const copy = routeCopy(language);
  const startIso = context.goal.startedOn ?? new Date().toISOString().slice(0, 10);
  const lift = context.goal.lift;
  if (lift) {
    const values = pathValues(lift.startKg, lift.targetKg, startIso, dates, 2.5);
    return dates.map((date, index) => {
      const isFinal = index === dates.length - 1;
      const value = values[index]!;
      const label = `${lift.nome} ${formatKg(value)}`;
      return {
        title: isFinal ? copy.finalGoal(label) : copy.goal(index + 1, label),
        description: isFinal
          ? copy.finalDescription
          : copy.liftDescription(lift.nome, formatKg(value)),
        date,
        metricKind: "lift",
        exerciseId: lift.exerciseId,
        value,
      };
    });
  }
  const start = context.goal.startWeightKg ?? context.currentWeightKg;
  const target = context.goal.targetWeightKg;
  if (!start || !target) return [];
  const values = pathValues(start, target, startIso, dates, 0.1);
  return dates.map((date, index) => {
    const isFinal = index === dates.length - 1;
    const value = values[index]!;
    return {
      title: isFinal ? copy.finalGoal(formatKg(value)) : copy.goal(index + 1, formatKg(value)),
      description: isFinal ? copy.finalDescription : copy.weightDescription(formatKg(value)),
      date,
      metricKind: "weight",
      value,
    };
  });
}

/** Keep route creation useful even when the coach service is temporarily unavailable. */
function fallbackCheckpoints(
  dates: string[],
  context: CoachContext,
  language: string,
): AiCheckpoint[] {
  const copy = routeCopy(language);
  const lift = context.bestLifts[0];
  return dates.map((date, index) => {
    const isFinal = index === dates.length - 1;
    const n = index + 1;
    const progress = n / dates.length;
    if (context.goal.targetWeightKg && context.currentWeightKg) {
      const value =
        Math.round(
          (context.currentWeightKg +
            (context.goal.targetWeightKg - context.currentWeightKg) * progress) *
            10,
        ) / 10;
      return {
        title: isFinal ? copy.finalGoal(formatKg(value)) : copy.goal(n, formatKg(value)),
        description: isFinal ? copy.finalDescription : copy.progressDescription,
        date,
        metricKind: "weight",
        value,
      };
    }
    if (lift?.kg) {
      const value = Math.round(lift.kg * (1 + 0.025 * n) * 2) / 2;
      const label = `${lift.nome} ${formatKg(value)}`;
      return {
        title: isFinal ? copy.finalGoal(label) : copy.goal(n, label),
        description: isFinal ? copy.finalDescription : copy.progressDescription,
        date,
        metricKind: "lift",
        exerciseId: lift.exerciseId,
        value,
      };
    }
    const count = Math.max(1, context.weeklyTarget) * 4;
    return {
      title: isFinal ? copy.finalSessions(count) : copy.sessionsGoal(n, count),
      description: isFinal ? copy.finalDescription : copy.consistencyDescription,
      date,
      metricKind: "sessions",
      value: count,
    };
  });
}

export class RouteMapError extends Error {}

export interface MapRouteResult {
  count: number;
  /** Set (and !ok) when goalDate asks for a weight change faster than research supports for this user. */
  pace: PaceCheck | null;
}

/**
 * Generates the coach's checkpoints for a goal date. Hand-made checkpoints are
 * kept; the coach's own ones are only replaced once generation succeeded.
 */
export async function mapRoute(goalDate: string, language: string): Promise<MapRouteResult> {
  const dates = checkpointDates(goalDate);
  if (!dates.length) throw new RouteMapError("too-short");

  const context = await buildCoachContext();
  const pace =
    context.currentWeightKg && context.goal.targetWeightKg
      ? checkPace(
          context.currentWeightKg,
          context.goal.targetWeightKg,
          daysBetween(new Date(), goalDate) / 7,
          context.experience,
        )
      : null;
  // A measurable main goal maps itself: the numbers come from the goal, not a model.
  let generated: AiCheckpoint[] = goalCheckpoints(dates, context, language);
  if (!generated.length) {
    try {
      const result = (await generateCheckpoints({
        data: { context, goalDate, dates, language },
      })) as { ok: true; checkpoints: AiCheckpoint[] } | { ok: false; error: string };
      if (result.ok && result.checkpoints.length) generated = result.checkpoints;
    } catch {
      // Route creation must not depend on the coach service being reachable.
    }
  }
  if (!generated.length) generated = fallbackCheckpoints(dates, context, language);

  // Only now the old coach checkpoints go, so a failed call never wipes a route.
  const existing = await getCheckpoints();
  for (const cp of existing.filter((c) => c.source === "ai_suggested")) {
    await removeCheckpoint(cp.id);
  }

  let index = 0;
  for (const cp of generated) {
    const metric: CheckpointMetric | undefined =
      cp.metricKind === "none" || !cp.value
        ? undefined
        : {
            kind: cp.metricKind,
            value: cp.value,
            ...(cp.exerciseId ? { exerciseId: cp.exerciseId } : {}),
          };
    await saveCheckpoint({
      title: cp.title,
      description: cp.description,
      targetDate: cp.date,
      orderIndex: index++,
      status: "upcoming",
      source: "ai_suggested",
      ...(metric ? { metric } : {}),
    });
  }
  return { count: generated.length, pace };
}
