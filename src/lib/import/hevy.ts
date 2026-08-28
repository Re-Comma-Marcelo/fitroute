/**
 * Hevy CSV import — pure functions only (no I/O, no data layer, no React).
 *
 * Pipeline: parseCsv -> parseHevyCsv -> resolveExerciseMapping -> buildImport.
 * Persisting is the caller's job (it uses the existing saveWorkout()).
 */
import type { Exercise, TipoSerie, Workout, WorkoutSet } from "../types";

/* ------------------------------------------------------------------ CSV ---- */

/** Tolerant CSV reader: quoted fields, embedded commas/newlines, BOM, CRLF. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      endField();
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\n") {
      endRow();
      continue;
    }
    field += ch;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/* ----------------------------------------------------------------- dates ---- */

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Accepts "28 Mar 2025, 17:29" and ISO 8601. Returns an ISO string or null. */
export function parseHevyDate(raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const human = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/.exec(value);
  if (human) {
    const month = MONTHS[human[2]!.slice(0, 3).toLowerCase()];
    if (month !== undefined) {
      const d = new Date(
        Number(human[3]),
        month,
        Number(human[1]),
        Number(human[4] ?? 0),
        Number(human[5] ?? 0),
        0,
        0,
      );
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/* ------------------------------------------------------------ parsed rows ---- */

export interface ParsedSet {
  tipoSerie: TipoSerie;
  pesoKg: number;
  reps: number;
  rpe?: number;
  durationSec: number;
}

export interface ParsedEntry {
  exerciseTitle: string;
  notes: string;
  sets: ParsedSet[];
}

export interface ParsedWorkout {
  /** Deterministic id derived from start time + title. */
  id: string;
  title: string;
  startedAt: string;
  finishedAt: string;
  durationSec: number;
  notes: string;
  entries: ParsedEntry[];
}

export interface HevyParseResult {
  workouts: ParsedWorkout[];
  /** Rows with neither reps nor weight (cardio, stretching, empty). */
  skippedRows: number;
  /** Distinct exercise titles found in the file, in first-seen order. */
  titles: string[];
  /** Non-fatal problems worth surfacing (bad dates, missing columns). */
  warnings: string[];
}

const LBS_TO_KG = 0.45359237;
const FALLBACK_SET_SEC = 150;

function num(raw: string | undefined): number {
  const value = (raw ?? "").trim().replace(",", ".");
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function setType(raw: string | undefined): TipoSerie {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "warmup":
    case "warm up":
      return "aquecimento";
    case "failure":
      return "falha";
    case "dropset":
    case "drop set":
      return "drop";
    default:
      return "normal";
  }
}

/** Small stable hash so two workouts starting at the same minute never collide. */
function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function hevyWorkoutId(startedAt: string, title: string): string {
  return `hevy_${Date.parse(startedAt)}_${hash(title.trim().toLowerCase())}`;
}

export function parseHevyCsv(csv: string): HevyParseResult {
  const rows = parseCsv(csv);
  const warnings: string[] = [];
  if (rows.length < 2) {
    return { workouts: [], skippedRows: 0, titles: [], warnings: ["EMPTY_FILE"] };
  }

  const header = (rows[0] ?? []).map((c) => c.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  const idx = {
    title: col("title"),
    start: col("start_time"),
    end: col("end_time"),
    description: col("description"),
    exercise: col("exercise_title"),
    notes: col("exercise_notes"),
    setType: col("set_type"),
    kg: col("weight_kg"),
    lbs: col("weight_lbs"),
    reps: col("reps"),
    duration: col("duration_seconds"),
    rpe: col("rpe"),
  };

  if (idx.exercise < 0 || idx.start < 0) {
    return { workouts: [], skippedRows: 0, titles: [], warnings: ["MISSING_COLUMNS"] };
  }

  const get = (row: string[], at: number) => (at >= 0 ? row[at] : undefined);
  const byKey = new Map<string, ParsedWorkout>();
  const titles: string[] = [];
  let skippedRows = 0;
  let badDates = 0;

  for (const row of rows.slice(1)) {
    const startedAt = parseHevyDate(get(row, idx.start));
    if (!startedAt) {
      badDates++;
      continue;
    }
    const title = (get(row, idx.title) ?? "").trim() || "Workout";
    const exerciseTitle = (get(row, idx.exercise) ?? "").trim();
    if (!exerciseTitle) {
      skippedRows++;
      continue;
    }

    const reps = Math.max(0, Math.round(num(get(row, idx.reps))));
    const kgCol = get(row, idx.kg);
    const pesoKg =
      kgCol !== undefined && kgCol.trim() !== ""
        ? num(kgCol)
        : Math.round(num(get(row, idx.lbs)) * LBS_TO_KG * 10) / 10;

    if (reps <= 0 && pesoKg <= 0) {
      skippedRows++;
      continue;
    }

    const key = `${title}__${startedAt}`;
    let workout = byKey.get(key);
    if (!workout) {
      workout = {
        id: hevyWorkoutId(startedAt, title),
        title,
        startedAt,
        finishedAt: parseHevyDate(get(row, idx.end)) ?? "",
        durationSec: 0,
        notes: (get(row, idx.description) ?? "").trim(),
        entries: [],
      };
      byKey.set(key, workout);
    }

    let entry = workout.entries.find((e) => e.exerciseTitle === exerciseTitle);
    if (!entry) {
      entry = { exerciseTitle, notes: (get(row, idx.notes) ?? "").trim(), sets: [] };
      workout.entries.push(entry);
      if (!titles.includes(exerciseTitle)) titles.push(exerciseTitle);
    }

    const rpe = num(get(row, idx.rpe));
    entry.sets.push({
      tipoSerie: setType(get(row, idx.setType)),
      pesoKg,
      reps,
      ...(rpe > 0 ? { rpe } : {}),
      durationSec: Math.max(0, Math.round(num(get(row, idx.duration)))),
    });
  }

  const workouts = [...byKey.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const w of workouts) {
    const explicit =
      w.finishedAt && w.startedAt
        ? Math.round((Date.parse(w.finishedAt) - Date.parse(w.startedAt)) / 1000)
        : 0;
    const summed = w.entries.reduce(
      (sum, e) => sum + e.sets.reduce((s, set) => s + set.durationSec, 0),
      0,
    );
    const setCount = w.entries.reduce((n, e) => n + e.sets.length, 0);
    w.durationSec = explicit > 0 ? explicit : summed > 0 ? summed : setCount * FALLBACK_SET_SEC;
    if (!w.finishedAt) {
      w.finishedAt = new Date(Date.parse(w.startedAt) + w.durationSec * 1000).toISOString();
    }
  }

  if (badDates > 0) warnings.push("BAD_DATES");
  return { workouts, skippedRows, titles, warnings };
}

/* -------------------------------------------------------------- matching ---- */

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Aliases -> library exercise name. Covers Hevy's English titles (with the
 * equipment suffix Hevy appends) and the common Portuguese names.
 */
export const EXERCISE_SYNONYMS: Record<string, string> = {
  // Chest
  "bench press barbell": "Bench Press",
  "supino reto com barra": "Bench Press",
  "supino reto": "Bench Press",
  "incline bench press dumbbell": "Incline Dumbbell Press",
  "incline press dumbbell": "Incline Dumbbell Press",
  "supino inclinado com halteres": "Incline Dumbbell Press",
  "decline bench press barbell": "Decline Bench Press",
  "supino declinado": "Decline Bench Press",
  "chest fly machine": "Pec Deck Machine",
  "butterfly pec deck": "Pec Deck Machine",
  "peck deck": "Pec Deck Machine",
  "cable fly": "Cable Crossover",
  "cable chest fly": "Cable Crossover",
  crucifixo: "Cable Crossover",
  "crossover no cabo": "Cable Crossover",
  "push up": "Push-up",
  flexao: "Push-up",
  "flexao de braco": "Push-up",
  // Legs
  "squat barbell": "Barbell Squat",
  "back squat": "Barbell Squat",
  "agachamento livre": "Barbell Squat",
  agachamento: "Barbell Squat",
  "front squat barbell": "Front Squat",
  "agachamento frontal": "Front Squat",
  "leg press horizontal": "Leg Press",
  "leg press machine": "Leg Press",
  "leg extension machine": "Leg Extension",
  "cadeira extensora": "Leg Extension",
  "lunge dumbbell": "Dumbbell Lunge",
  "avanco com halteres": "Dumbbell Lunge",
  afundo: "Dumbbell Lunge",
  "bulgarian split squat dumbbell": "Bulgarian Split Squat",
  "agachamento bulgaro": "Bulgarian Split Squat",
  "hack squat machine": "Hack Squat",
  "deadlift barbell": "Deadlift",
  "conventional deadlift": "Deadlift",
  "levantamento terra": "Deadlift",
  "romanian deadlift barbell": "Romanian Deadlift",
  "stiff leg deadlift": "Romanian Deadlift",
  "terra romeno": "Romanian Deadlift",
  stiff: "Romanian Deadlift",
  "leg curl lying": "Lying Leg Curl",
  "mesa flexora": "Lying Leg Curl",
  "leg curl seated": "Seated Leg Curl",
  "cadeira flexora": "Seated Leg Curl",
  "hip thrust barbell": "Hip Thrust",
  "elevacao pelvica": "Hip Thrust",
  "hip abduction machine": "Hip Abduction Machine",
  "cadeira abdutora": "Hip Abduction Machine",
  "standing calf raise machine": "Standing Calf Raise",
  "calf raise standing": "Standing Calf Raise",
  "panturrilha em pe": "Standing Calf Raise",
  "seated calf raise machine": "Seated Calf Raise",
  "panturrilha sentado": "Seated Calf Raise",
  // Back
  "bent over row barbell": "Barbell Row",
  "barbell row bent over": "Barbell Row",
  "remada curvada": "Barbell Row",
  "bent over row dumbbell": "One-Arm Dumbbell Row",
  "single arm dumbbell row": "One-Arm Dumbbell Row",
  "remada unilateral": "One-Arm Dumbbell Row",
  "remada serrote": "One-Arm Dumbbell Row",
  "lat pulldown cable": "Lat Pulldown",
  "lat pulldown wide grip": "Lat Pulldown",
  "puxada alta": "Lat Pulldown",
  "puxada frontal": "Lat Pulldown",
  "seated row cable": "Seated Cable Row",
  "seated cable row": "Seated Cable Row",
  "remada baixa": "Seated Cable Row",
  "chest supported row": "Chest-Supported Row",
  "t bar row": "Chest-Supported Row",
  "remada cavalinho": "Chest-Supported Row",
  "pull up": "Pull-up",
  "chin up": "Pull-up",
  barra_fixa: "Pull-up",
  "barra fixa": "Pull-up",
  "straight arm pulldown cable": "Rope Pulldown",
  "rope pulldown": "Rope Pulldown",
  pulldown: "Rope Pulldown",
  // Shoulders
  "shoulder press barbell": "Overhead Press",
  "overhead press barbell": "Overhead Press",
  "military press": "Overhead Press",
  "desenvolvimento militar": "Overhead Press",
  "shoulder press dumbbell": "Dumbbell Shoulder Press",
  "desenvolvimento com halteres": "Dumbbell Shoulder Press",
  "lateral raise dumbbell": "Lateral Raise",
  "lateral raise cable": "Lateral Raise",
  "elevacao lateral": "Lateral Raise",
  "front raise dumbbell": "Front Raise",
  "elevacao frontal": "Front Raise",
  "reverse fly machine": "Reverse Pec Deck",
  "rear delt reverse fly machine": "Reverse Pec Deck",
  "crucifixo inverso": "Reverse Pec Deck",
  "shrug dumbbell": "Dumbbell Shrug",
  "encolhimento de ombros": "Dumbbell Shrug",
  // Arms
  "bicep curl barbell": "Barbell Curl",
  "barbell curl": "Barbell Curl",
  "rosca direta": "Barbell Curl",
  "bicep curl dumbbell": "Alternating Dumbbell Curl",
  "rosca alternada": "Alternating Dumbbell Curl",
  "hammer curl dumbbell": "Hammer Curl",
  "rosca martelo": "Hammer Curl",
  "skullcrusher barbell": "Skull Crusher",
  "lying triceps extension": "Skull Crusher",
  "triceps testa": "Skull Crusher",
  "triceps pushdown cable": "Tricep Rope Pushdown",
  "triceps rope pushdown": "Tricep Rope Pushdown",
  "triceps corda": "Tricep Rope Pushdown",
  "triceps extension overhead": "Overhead Tricep Extension",
  "overhead triceps extension": "Overhead Tricep Extension",
  "triceps frances": "Overhead Tricep Extension",
  "triceps dip": "Bench Dip",
  "bench dip": "Bench Dip",
  "banco triceps": "Bench Dip",
  // Core
  plank: "Plank",
  prancha: "Plank",
  "cable crunch": "Cable Crunch",
  "abdominal na polia": "Cable Crunch",
};

/** exerciseId (or null when the user must resolve it) per Hevy title. */
export type ExerciseMapping = Record<string, string | null>;

/** Hevy titles carry an equipment suffix: "Bench Press (Barbell)". */
function variants(title: string): string[] {
  const base = title.replace(/\(([^)]*)\)/g, " $1 ");
  const noParens = title.replace(/\([^)]*\)/g, " ");
  return [title, base, noParens].map(normalizeName).filter(Boolean);
}

export function resolveExerciseMapping(titles: string[], library: Exercise[]): ExerciseMapping {
  const byName = new Map<string, string>();
  for (const e of library) byName.set(normalizeName(e.nome), e.id);

  const synonyms = new Map<string, string>();
  for (const [alias, canonical] of Object.entries(EXERCISE_SYNONYMS)) {
    const id = byName.get(normalizeName(canonical));
    if (id) synonyms.set(normalizeName(alias), id);
  }

  const mapping: ExerciseMapping = {};
  for (const title of titles) {
    let found: string | null = null;
    for (const key of variants(title)) {
      found = byName.get(key) ?? synonyms.get(key) ?? null;
      if (found) break;
    }
    mapping[title] = found;
  }
  return mapping;
}

/** Titles the user still has to map (null) — "ignore" is expressed as IGNORE_MARKER. */
export const IGNORE_MARKER = "__ignore__";

export function unresolvedTitles(mapping: ExerciseMapping): string[] {
  return Object.keys(mapping).filter((k) => mapping[k] === null);
}

/* ---------------------------------------------------------------- build ----- */

export interface BuiltWorkout {
  workout: Workout;
  sets: WorkoutSet[];
}

export interface ImportStats {
  workouts: number;
  sets: number;
  volumeKg: number;
  from: string;
  to: string;
  prs: number;
  skippedRows: number;
  duplicates: number;
  ignoredExercises: number;
}

export interface BuiltImport {
  items: BuiltWorkout[];
  stats: ImportStats;
}

function countsAsVolume(set: ParsedSet): boolean {
  return set.tipoSerie !== "aquecimento";
}

/**
 * Turns parsed workouts into Workout + WorkoutSet[] ready for saveWorkout().
 * `existingIds` makes re-importing the same file a no-op.
 */
export function buildImport(
  parsed: HevyParseResult,
  mapping: ExerciseMapping,
  existingIds: string[] = [],
): BuiltImport {
  const taken = new Set(existingIds);
  const items: BuiltWorkout[] = [];
  let duplicates = 0;
  let ignoredExercises = 0;
  let totalSets = 0;
  let totalVolume = 0;

  for (const w of parsed.workouts) {
    if (taken.has(w.id)) {
      duplicates++;
      continue;
    }

    const sets: WorkoutSet[] = [];
    let ordem = 0;
    let volume = 0;

    for (const entry of w.entries) {
      const exerciseId = mapping[entry.exerciseTitle];
      if (!exerciseId || exerciseId === IGNORE_MARKER) {
        ignoredExercises++;
        continue;
      }
      let serieNum = 0;
      for (const s of entry.sets) {
        serieNum++;
        sets.push({
          id: `${w.id}_s${ordem}_${serieNum}`,
          workoutId: w.id,
          exerciseId,
          ordemExercicio: ordem,
          serieNum,
          tipoSerie: s.tipoSerie,
          pesoKg: s.pesoKg,
          reps: s.reps,
          ...(s.rpe === undefined ? {} : { rpe: s.rpe }),
          concluida: true,
        });
        if (countsAsVolume(s)) volume += s.pesoKg * s.reps;
      }
      ordem++;
    }

    if (sets.length === 0) continue;

    items.push({
      workout: {
        id: w.id,
        iniciadoEm: w.startedAt,
        finalizadoEm: w.finishedAt,
        duracaoSeg: w.durationSec,
        volumeTotalKg: Math.round(volume * 10) / 10,
        notas: w.notes,
        origem: "branco",
      },
      sets,
    });
    totalSets += sets.length;
    totalVolume += volume;
  }

  const dates = items.map((i) => i.workout.iniciadoEm).sort();
  return {
    items,
    stats: {
      workouts: items.length,
      sets: totalSets,
      volumeKg: Math.round(totalVolume),
      from: dates[0] ?? "",
      to: dates[dates.length - 1] ?? "",
      prs: countPRs(items),
      skippedRows: parsed.skippedRows,
      duplicates,
      ignoredExercises,
    },
  };
}

/** Weight records set inside the imported history, chronologically. */
export function countPRs(items: BuiltWorkout[]): number {
  const chronological = [...items].sort((a, b) =>
    a.workout.iniciadoEm.localeCompare(b.workout.iniciadoEm),
  );
  const best = new Map<string, number>();
  let prs = 0;
  for (const item of chronological) {
    const perExercise = new Map<string, number>();
    for (const s of item.sets) {
      if (s.tipoSerie === "aquecimento" || s.pesoKg <= 0) continue;
      perExercise.set(s.exerciseId, Math.max(perExercise.get(s.exerciseId) ?? 0, s.pesoKg));
    }
    for (const [exerciseId, weight] of perExercise) {
      const prior = best.get(exerciseId);
      if (prior === undefined) {
        best.set(exerciseId, weight);
        continue;
      }
      if (weight > prior) {
        best.set(exerciseId, weight);
        prs++;
      }
    }
  }
  return prs;
}
