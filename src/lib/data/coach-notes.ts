import { fetchCoachNotes, persistCoachNote } from "../forja.functions";
import type { CoachNote } from "../types";

let cache: CoachNote[] | null = null;

async function all(): Promise<CoachNote[]> {
  if (!cache) cache = (await fetchCoachNotes()) as CoachNote[];
  return cache;
}

export async function getCoachNotes(): Promise<CoachNote[]> {
  return [...(await all())];
}

export async function getRecentCoachNotes(limit = 5): Promise<CoachNote[]> {
  return [...(await all())]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function saveCoachNote(
  note: Omit<CoachNote, "id" | "createdAt">,
): Promise<CoachNote> {
  const saved = (await persistCoachNote({
    data: { kind: note.kind, content: note.content, tags: note.tags },
  })) as CoachNote;
  cache = [saved, ...(cache ?? [])];
  return saved;
}
