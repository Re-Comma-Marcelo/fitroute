/**
 * Readiness check at the start of a workout (😴 / 🙂 / 🔥). The answer is
 * stored on the session and as a coaching event, so the coach can read a
 * weaker session in context instead of flagging it as a drop out of nowhere.
 */
import { tx } from "@/lib/format";
import type { Readiness } from "@/lib/types";

export const READINESS_LEVELS: { level: Readiness; emoji: string; label: string }[] = [
  { level: "low", emoji: "😴", label: "Tired" },
  { level: "ok", emoji: "🙂", label: "Okay" },
  { level: "high", emoji: "🔥", label: "Ready to push" },
];

/** Line for the coach feed: what the user said when the workout started. */
export function readinessMessage(
  level: Readiness,
  routine: string,
  opts: { deload?: boolean } = {},
): string {
  if (level === "low") {
    return opts.deload
      ? tx("Started {routine} feeling tired and went with the lighter version.", { routine })
      : tx("Started {routine} feeling tired.", { routine });
  }
  if (level === "high") return tx("Started {routine} feeling ready to push.", { routine });
  return tx("Started {routine} feeling okay.", { routine });
}
