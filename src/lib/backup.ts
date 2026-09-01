/**
 * Export / import of the user's own data. Reads through the existing data layer
 * and writes back with the same save functions — no new server queries.
 */

import { getProfile, saveProfile } from "./data/profile";
import { getRoutines, saveRoutine } from "./data/routines";
import { getWorkoutLog, saveWorkout } from "./data/workouts";
import { formatDateNumeric } from "./format";
import type { Profile, Routine, Workout, WorkoutSet } from "./types";

export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: "iron-logger";
  version: number;
  exportedAt: string;
  profile: Profile;
  routines: Routine[];
  workouts: Workout[];
  sets: WorkoutSet[];
}

export async function buildBackup(): Promise<BackupFile> {
  const [profile, routines, log] = await Promise.all([
    getProfile(),
    getRoutines(),
    getWorkoutLog(),
  ]);
  return {
    app: "iron-logger",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    routines,
    workouts: log.workouts,
    sets: log.sets,
  };
}

/** One row per logged set — the shape spreadsheets and other apps expect. */
export async function buildWorkoutsCsv(): Promise<string> {
  const log = await getWorkoutLog();
  const byId = new Map(log.workouts.map((w) => [w.id, w]));
  const head = [
    "date",
    "workout_id",
    "exercise_id",
    "set_number",
    "set_type",
    "weight_kg",
    "reps",
    "rpe",
  ].join(",");
  const rows = log.sets
    .slice()
    .sort((a, b) => a.workoutId.localeCompare(b.workoutId) || a.serieNum - b.serieNum)
    .map((s) =>
      [
        byId.get(s.workoutId)?.iniciadoEm ?? "",
        s.workoutId,
        s.exerciseId,
        s.serieNum,
        s.tipoSerie,
        s.pesoKg,
        s.reps,
        s.rpe ?? "",
      ].join(","),
    );
  return [head, ...rows].join("\n");
}

export function downloadFile(name: string, contents: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function backupFileName(ext: "json" | "csv"): string {
  const stamp = formatDateNumeric(new Date()).replace(/\D+/g, "-");
  return `iron-logger-${stamp}.${ext}`;
}

export interface ImportResult {
  routines: number;
  workouts: number;
  profile: boolean;
  errors: string[];
}

function isBackup(value: unknown): value is BackupFile {
  if (!value || typeof value !== "object") return false;
  const b = value as Partial<BackupFile>;
  return b.app === "iron-logger" && Array.isArray(b.routines) && Array.isArray(b.workouts);
}

export interface BackupPreview {
  exportedAt: string;
  routines: number;
  workouts: number;
  sets: number;
  hasProfile: boolean;
}

/** Read a backup file without writing anything, so the restore can be confirmed. */
export function previewBackup(raw: string): BackupPreview {
  const parsed: unknown = JSON.parse(raw);
  if (!isBackup(parsed)) throw new Error("not-a-backup");
  return {
    exportedAt: parsed.exportedAt,
    routines: parsed.routines.length,
    workouts: parsed.workouts.length,
    sets: Array.isArray(parsed.sets) ? parsed.sets.length : 0,
    hasProfile: !!parsed.profile,
  };
}

/**
 * Restore a backup. Existing ids are overwritten (upsert), anything unknown is
 * reported instead of silently dropped.
 */
export async function restoreBackup(
  raw: string,
  opts: { includeProfile?: boolean } = {},
): Promise<ImportResult> {
  const parsed: unknown = JSON.parse(raw);
  if (!isBackup(parsed)) {
    throw new Error("not-a-backup");
  }
  const result: ImportResult = { routines: 0, workouts: 0, profile: false, errors: [] };

  for (const routine of parsed.routines) {
    try {
      await saveRoutine(routine);
      result.routines += 1;
    } catch {
      result.errors.push(routine.nome || routine.id);
    }
  }

  const sets = Array.isArray(parsed.sets) ? parsed.sets : [];
  for (const workout of parsed.workouts) {
    try {
      await saveWorkout(
        workout,
        sets.filter((s) => s.workoutId === workout.id),
      );
      result.workouts += 1;
    } catch {
      result.errors.push(workout.id);
    }
  }

  if (opts.includeProfile !== false && parsed.profile) {
    try {
      const current = await getProfile();
      await saveProfile({ ...parsed.profile, id: current.id || parsed.profile.id });
      result.profile = true;
    } catch {
      result.errors.push("profile");
    }
  }

  return result;
}
