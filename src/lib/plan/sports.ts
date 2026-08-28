import type { Intensity, SportEntry } from "./types";

export interface SportPreset {
  kind: string;
  /** English label — translated at render time. */
  label: string;
  defaultDurationMin: number;
  defaultIntensity: Intensity;
  /** How taxing one minute of this sport is relative to a gym minute. */
  loadWeight: number;
  /** Muscle groups the sport already hammers — the gym plan supports instead of duplicating. */
  emphasis: string[];
}

export const SPORT_PRESETS: SportPreset[] = [
  {
    kind: "boxing",
    label: "Boxing / martial arts",
    defaultDurationMin: 75,
    defaultIntensity: "high",
    loadWeight: 1.2,
    emphasis: ["shoulders", "core", "rotation", "conditioning"],
  },
  {
    kind: "football",
    label: "Football / team sport",
    defaultDurationMin: 90,
    defaultIntensity: "high",
    loadWeight: 1.15,
    emphasis: ["legs", "sprinting", "change of direction"],
  },
  {
    kind: "running",
    label: "Running",
    defaultDurationMin: 45,
    defaultIntensity: "moderate",
    loadWeight: 1.1,
    emphasis: ["legs", "endurance"],
  },
  {
    kind: "swimming",
    label: "Swimming",
    defaultDurationMin: 45,
    defaultIntensity: "moderate",
    loadWeight: 0.9,
    emphasis: ["upper back", "shoulders", "endurance"],
  },
  {
    kind: "cycling",
    label: "Cycling",
    defaultDurationMin: 60,
    defaultIntensity: "moderate",
    loadWeight: 0.85,
    emphasis: ["legs", "endurance"],
  },
  {
    kind: "climbing",
    label: "Climbing",
    defaultDurationMin: 90,
    defaultIntensity: "moderate",
    loadWeight: 1,
    emphasis: ["grip", "back", "arms"],
  },
  {
    kind: "tennis",
    label: "Racket sport",
    defaultDurationMin: 60,
    defaultIntensity: "moderate",
    loadWeight: 1,
    emphasis: ["shoulders", "rotation", "legs"],
  },
  {
    kind: "yoga",
    label: "Yoga / mobility",
    defaultDurationMin: 45,
    defaultIntensity: "low",
    loadWeight: 0.4,
    emphasis: ["mobility"],
  },
  {
    kind: "other",
    label: "Other sport",
    defaultDurationMin: 60,
    defaultIntensity: "moderate",
    loadWeight: 1,
    emphasis: [],
  },
];

export function presetFor(kind: string): SportPreset {
  return SPORT_PRESETS.find((p) => p.kind === kind) ?? (SPORT_PRESETS[SPORT_PRESETS.length - 1] as SportPreset);
}

const INTENSITY_WEIGHT: Record<Intensity, number> = { low: 0.6, moderate: 1, high: 1.35 };

/** Weekly minutes of sport, raw. */
export function sportMinutesPerWeek(sports: SportEntry[]): number {
  return sports.reduce((sum, s) => sum + s.sessionsPerWeek * s.durationMin, 0);
}

/** Weekly load units of sport, weighted by sport type and intensity. */
export function sportLoadUnits(sports: SportEntry[]): number {
  return sports.reduce((sum, s) => {
    const preset = presetFor(s.kind);
    return (
      sum + s.sessionsPerWeek * s.durationMin * preset.loadWeight * INTENSITY_WEIGHT[s.intensity]
    );
  }, 0);
}

export function sportEmphasis(sports: SportEntry[]): string[] {
  const set = new Set<string>();
  for (const s of sports) for (const e of presetFor(s.kind).emphasis) set.add(e);
  return [...set];
}

export function describeSports(sports: SportEntry[]): string[] {
  return sports.map(
    (s) =>
      `${s.name} — ${s.sessionsPerWeek}x/week, ${s.durationMin} min, ${s.intensity} intensity${
        s.days.length ? `, usually ${s.days.join("/")}` : ""
      }`,
  );
}

export function newSport(kind: string, name: string): SportEntry {
  const preset = presetFor(kind);
  return {
    id: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    name,
    sessionsPerWeek: 2,
    durationMin: preset.defaultDurationMin,
    intensity: preset.defaultIntensity,
    days: [],
  };
}
