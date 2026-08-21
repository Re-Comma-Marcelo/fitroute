import { delay, uid } from "./mocks";
import type { CoachNote } from "../types";

const KEY = "forja.coachNotes.v1";

let notes: CoachNote[] = [];

function load() {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      notes = raw ? (JSON.parse(raw) as CoachNote[]) : [];
    } catch {
      notes = [];
    }
  } else {
    notes = [];
  }
}

export async function getCoachNotes(): Promise<CoachNote[]> {
  load();
  return delay([...notes]);
}

export async function getRecentCoachNotes(limit = 5): Promise<CoachNote[]> {
  load();
  return delay(
    [...notes]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
  );
}

export async function saveCoachNote(
  note: Omit<CoachNote, "id" | "createdAt">,
): Promise<CoachNote> {
  const full: CoachNote = {
    ...note,
    id: uid("cn"),
    createdAt: new Date().toISOString(),
  };
  notes.push(full);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(notes));
  }
  return delay(full);
}
