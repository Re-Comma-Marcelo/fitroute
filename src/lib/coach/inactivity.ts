/**
 * Inactivity check-in and its replies. No guilt, no "get back on track" — the
 * coach asks what the user is up for and proposes something concrete.
 */
import { tx } from "@/lib/format";
import type { Routine, Workout } from "@/lib/types";

export const DEFAULT_INACTIVITY_DAYS = 3;
const DAYS_KEY = "ironlogger.inactivityDays.v1";

export function inactivityThreshold(): number {
  if (typeof window === "undefined") return DEFAULT_INACTIVITY_DAYS;
  const raw = Number(window.localStorage.getItem(DAYS_KEY));
  return Number.isFinite(raw) && raw >= 1 && raw <= 14 ? raw : DEFAULT_INACTIVITY_DAYS;
}

export function setInactivityThreshold(days: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DAYS_KEY, String(Math.min(14, Math.max(1, Math.round(days)))));
}

/** Whole days since the last finished workout, or null when nothing is logged. */
export function daysSinceLastWorkout(workouts: Workout[]): number | null {
  const last = workouts
    .filter((w) => w.finalizadoEm)
    .map((w) => w.iniciadoEm)
    .sort()
    .pop();
  if (!last) return null;
  const ms = Date.now() - new Date(last).getTime();
  return Math.floor(ms / 86_400_000);
}

export function inactivityMessage(days: number): string {
  return tx("No sessions logged in {days} days. What are you up for today?", { days });
}

const SHORT_HINTS = [
  "short",
  "quick",
  "not much",
  "curto",
  "rápido",
  "kort",
  "snel",
  "geen zin",
  "don't feel",
  "dont feel",
  "tired",
  "cansado",
  "moe",
];
const GROUP_HINTS: { keys: string[]; group: string }[] = [
  { keys: ["chest", "peito", "borst", "bench", "supino"], group: "chest" },
  { keys: ["back", "costas", "rug", "pull"], group: "back" },
  { keys: ["leg", "perna", "been", "squat"], group: "legs" },
  { keys: ["shoulder", "ombro", "schouder"], group: "shoulders" },
  { keys: ["arm", "braço", "braco"], group: "arms" },
];

/**
 * A concrete proposal built from the user's own routines — a shortened session
 * or a group-focused one — instead of a generic pep talk.
 */
export function proposeSession(
  reply: string,
  routines: Routine[],
  lastRoutineId?: string,
): { text: string; routineId?: string; shortened: boolean } {
  const q = reply.toLowerCase();
  const wantsShort = SHORT_HINTS.some((h) => q.includes(h));
  const group = GROUP_HINTS.find((g) => g.keys.some((k) => q.includes(k)))?.group;

  const byName = group ? routines.find((r) => r.nome.toLowerCase().includes(group)) : undefined;
  const routine =
    byName ?? routines.find((r) => r.id === lastRoutineId) ?? routines[0] ?? undefined;

  if (!routine) {
    return {
      text: tx("Let's build one routine first — then I can propose something specific."),
      shortened: false,
    };
  }

  if (wantsShort) {
    const keep = Math.max(2, Math.min(3, routine.exercicios.length));
    return {
      text: tx(
        "Then don't do the full thing. {routine}, first {count} exercises, two sets each — about 20 minutes. That still counts.",
        { routine: routine.nome, count: keep },
      ),
      routineId: routine.id,
      shortened: true,
    };
  }

  if (group) {
    return {
      text: tx("{routine} covers that. Start there and stop when the work is done.", {
        routine: routine.nome,
      }),
      routineId: routine.id,
      shortened: false,
    };
  }

  return {
    text: tx("Pick up where you left off: {routine}. Same loads as last time, no heroics.", {
      routine: routine.nome,
    }),
    routineId: routine.id,
    shortened: false,
  };
}
