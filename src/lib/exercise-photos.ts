/**
 * Your own reference photo per exercise (machine setup, pin height, grip).
 * Stored locally as a compressed data URL — no schema, no upload.
 */
const KEY = "forja.exercisePhotos.v1";

type PhotoMap = Record<string, string>;

function read(): PhotoMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PhotoMap) : {};
  } catch {
    return {};
  }
}

function write(map: PhotoMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Quota exceeded: keep the app usable, just drop the new photo.
  }
}

export function getExercisePhoto(exerciseId: string): string | null {
  return read()[exerciseId] ?? null;
}

export function setExercisePhoto(exerciseId: string, dataUrl: string) {
  write({ ...read(), [exerciseId]: dataUrl });
}

export function removeExercisePhoto(exerciseId: string) {
  const map = read();
  delete map[exerciseId];
  write(map);
}
