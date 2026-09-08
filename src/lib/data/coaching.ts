/**
 * Adaptive coaching storage. Talks to Supabase when the coaching migration is
 * applied and falls back to localStorage otherwise, so detections never break
 * the app or get lost while offline.
 */
import {
  fetchCoachChat,
  fetchCoachingEvents,
  fetchCrossTraining,
  persistCoachChat,
  persistCoachingEvent,
  persistCoachingReply,
  persistCrossTraining,
  removeCrossTraining,
} from "../forja.functions";
import type { CoachChatEntry, CoachingEvent, CrossTrainingLog } from "../types";

const EVENTS_KEY = "ironlogger.coachingEvents.v1";
const CROSS_KEY = "ironlogger.crossTraining.v1";
const CHAT_KEY = "ironlogger.coachChat.v1";

function readLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, 120)));
  } catch {
    /* storage unavailable */
  }
}

function localId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---- coaching events -------------------------------------------------------

let eventsCache: CoachingEvent[] | null = null;

export async function getCoachingEvents(): Promise<CoachingEvent[]> {
  if (eventsCache) return eventsCache;
  try {
    eventsCache = (await fetchCoachingEvents()) as unknown as CoachingEvent[];
  } catch {
    eventsCache = readLocal<CoachingEvent>(EVENTS_KEY);
  }
  return eventsCache;
}

export async function logCoachingEvent(
  event: Omit<CoachingEvent, "id" | "createdAt">,
): Promise<CoachingEvent> {
  let saved: CoachingEvent | null = null;
  try {
    saved = (await persistCoachingEvent({
      data: {
        kind: event.kind,
        message: event.message,
        exerciseId: event.exerciseId,
        workoutId: event.workoutId,
        cause: event.cause,
        detail: event.detail ?? {},
      },
    })) as unknown as CoachingEvent | null;
  } catch {
    saved = null;
  }
  // No database table yet (or the write failed): keep the event on this device.
  if (!saved) {
    saved = { ...event, id: localId("ce"), createdAt: new Date().toISOString() };
    writeLocal(EVENTS_KEY, [saved, ...readLocal<CoachingEvent>(EVENTS_KEY)]);
  }
  eventsCache = [saved, ...(eventsCache ?? [])];
  return saved;
}

export async function replyToCoachingEvent(id: string, reply: string): Promise<void> {
  eventsCache = (eventsCache ?? []).map((e) => (e.id === id ? { ...e, userReply: reply } : e));
  try {
    await persistCoachingReply({ data: { id, reply } });
  } catch {
    writeLocal(
      EVENTS_KEY,
      readLocal<CoachingEvent>(EVENTS_KEY).map((e) =>
        e.id === id ? { ...e, userReply: reply } : e,
      ),
    );
  }
}

/** True when this trigger already fired today — keeps the card from nagging. */
export function firedToday(events: CoachingEvent[], kind: CoachingEvent["kind"], key?: string) {
  const today = new Date().toISOString().slice(0, 10);
  return events.some(
    (e) =>
      e.kind === kind &&
      e.createdAt.slice(0, 10) === today &&
      (!key || e.exerciseId === key || e.workoutId === key),
  );
}

// ---- cross training --------------------------------------------------------

let crossCache: CrossTrainingLog[] | null = null;

export async function getCrossTraining(): Promise<CrossTrainingLog[]> {
  if (crossCache) return crossCache;
  try {
    crossCache = (await fetchCrossTraining()) as unknown as CrossTrainingLog[];
  } catch {
    crossCache = readLocal<CrossTrainingLog>(CROSS_KEY);
  }
  return crossCache;
}

export async function saveCrossTraining(
  entry: Omit<CrossTrainingLog, "id">,
): Promise<CrossTrainingLog> {
  let saved: CrossTrainingLog;
  try {
    saved = (await persistCrossTraining({ data: entry })) as unknown as CrossTrainingLog;
  } catch {
    saved = { ...entry, id: localId("ct") };
    writeLocal(CROSS_KEY, [saved, ...readLocal<CrossTrainingLog>(CROSS_KEY)]);
  }
  crossCache = [saved, ...(crossCache ?? [])];
  return saved;
}

export async function deleteCrossTraining(id: string): Promise<void> {
  crossCache = (crossCache ?? []).filter((e) => e.id !== id);
  try {
    await removeCrossTraining({ data: { id } });
  } catch {
    writeLocal(
      CROSS_KEY,
      readLocal<CrossTrainingLog>(CROSS_KEY).filter((e) => e.id !== id),
    );
  }
}

// ---- coach chat ------------------------------------------------------------

export async function getCoachChat(): Promise<CoachChatEntry[]> {
  try {
    return (await fetchCoachChat()) as unknown as CoachChatEntry[];
  } catch {
    return readLocal<CoachChatEntry>(CHAT_KEY).slice().reverse();
  }
}

export async function saveCoachChat(
  entry: Omit<CoachChatEntry, "id" | "createdAt">,
): Promise<CoachChatEntry> {
  try {
    return (await persistCoachChat({ data: entry })) as unknown as CoachChatEntry;
  } catch {
    const saved: CoachChatEntry = {
      ...entry,
      id: localId("cc"),
      createdAt: new Date().toISOString(),
    };
    writeLocal(CHAT_KEY, [saved, ...readLocal<CoachChatEntry>(CHAT_KEY)]);
    return saved;
  }
}
