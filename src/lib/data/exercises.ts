import { delay, exercises, uid } from "./mocks";
import type { Exercise } from "../types";

export async function getExercises(): Promise<Exercise[]> {
  return delay([...exercises]);
}

export async function getExercise(id: string): Promise<Exercise | null> {
  return delay(exercises.find((e) => e.id === id) ?? null);
}

export async function getMuscleGroups(): Promise<string[]> {
  return delay([...new Set(exercises.map((e) => e.grupoPrimario))].sort());
}

export async function getEquipments(): Promise<string[]> {
  return delay([...new Set(exercises.map((e) => e.equipamento))].sort());
}

export async function createExercise(input: Omit<Exercise, "id" | "isCustom">): Promise<Exercise> {
  const created: Exercise = { ...input, id: uid("ex"), isCustom: true };
  exercises.push(created);
  return delay(created);
}