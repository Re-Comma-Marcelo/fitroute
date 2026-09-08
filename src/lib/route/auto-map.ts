/**
 * Mapping the route is the app's job, not the user's. This is the one place
 * that turns a goal date into checkpoints: the empty route screen, the re-map
 * button and the end of the plan interview all call it.
 */
import { getCheckpoints, removeCheckpoint, saveCheckpoint } from "@/lib/data/route";
import { buildCoachContext } from "./context";
import { checkpointDates } from "./cadence";
import type { CheckpointMetric } from "./types";
import { generateCheckpoints } from "@/lib/route-ai.functions";

type AiCheckpoint = {
  title: string;
  description: string;
  date: string;
  metricKind: "lift" | "sessions" | "weight" | "none";
  exerciseId?: string;
  value?: number;
};

export class RouteMapError extends Error {}

/**
 * Generates the coach's checkpoints for a goal date. Hand-made checkpoints are
 * kept; the coach's own ones are only replaced once generation succeeded.
 */
export async function mapRoute(goalDate: string, language: string): Promise<number> {
  const dates = checkpointDates(goalDate);
  if (!dates.length) throw new RouteMapError("too-short");

  const context = await buildCoachContext();
  const result = (await generateCheckpoints({ data: { context, goalDate, dates, language } })) as
    { ok: true; checkpoints: AiCheckpoint[] } | { ok: false; error: string };
  if (!result.ok) throw new RouteMapError(result.error);

  // Only now the old coach checkpoints go, so a failed call never wipes a route.
  const existing = await getCheckpoints();
  for (const cp of existing.filter((c) => c.source === "ai_suggested")) {
    await removeCheckpoint(cp.id);
  }

  let index = 0;
  for (const cp of result.checkpoints) {
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
  return result.checkpoints.length;
}
