import type { MealSlot } from "../nutrition-types";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const SLOT_PARTS = ["morning", "midday", "evening"] as const;
export type SlotPart = (typeof SLOT_PARTS)[number];

export type SlotState = "free" | "tight" | "blocked";
export type SlotGrid = Record<DayKey, Record<SlotPart, SlotState>>;

export type Intensity = "low" | "moderate" | "high";

export interface SportEntry {
  id: string;
  /** Sport catalogue key, or "other". */
  kind: string;
  name: string;
  sessionsPerWeek: number;
  durationMin: number;
  intensity: Intensity;
  days: DayKey[];
}

export type DailyActivity = "desk" | "onFeet" | "physical";
export type WorkPattern = "regular" | "shifts" | "nights" | "travel";
export type CookTime = "none" | "some" | "plenty";
export type Experience = "beginner" | "intermediate" | "advanced";
export type TrainingYears = "lt6m" | "6to12m" | "1to3y" | "3plus";
export type Consistency = "barely" | "onOff" | "steady";
export type Budget = "tight" | "normal" | "comfortable";
export type TimeAdjust = "less" | "asIs" | "more";

/** What the interview should build: everything, training only, or diet only. */
export type PlanScope = "full" | "training" | "diet";

export interface PlanIntake {
  // Step 0 — what you want
  planScope: PlanScope;
  // Step 1 — you
  age: number;
  sex: "male" | "female" | "other";
  heightCm: number;
  weightKg: number;
  dailyActivity: DailyActivity;
  // Step 2 — goal
  goalMode: "number" | "words";
  targetWeightKg: number | null;
  goalText: string;
  timelineWeeks: number | null;
  // Step 3 — training
  equipment: string[];
  gymDaysPerWeek: number;
  /** How long they have been training — asked directly. */
  trainingYears: TrainingYears;
  /** How consistent the last 6 months were — asked directly. */
  consistency: Consistency;
  /** Derived from trainingYears + consistency, never asked. */
  experience: Experience;
  limitations: string;
  sports: SportEntry[];
  // Step 4 — life
  slots: SlotGrid;
  workPattern: WorkPattern;
  commuteMin: number;
  careDuties: boolean;
  sleepHours: number;
  stress: number;
  cookTime: CookTime;
  eatOutPerWeek: number;
  budget: Budget;
  lifeNotes: string;
  timeAdjust: TimeAdjust;
  // Step 5 — food
  allergies: string;
  dislikes: string;
  likes: string;
}

export interface PlannedSlot {
  day: DayKey;
  part: SlotPart;
  minutes: number;
}

export interface TimeBudget {
  /** Gym minutes the week realistically allows. */
  gymMinutesPerWeek: number;
  /** Minutes already committed to other sports. */
  sportMinutesPerWeek: number;
  /** Suggested gym slots, longest first. */
  gymSlots: PlannedSlot[];
  freeSlotCount: number;
  tightSlotCount: number;
  /** 0.7 – 1 factor from sleep / stress / total load. */
  recoveryFactor: number;
  /** True when the week barely allows structured training. */
  tight: boolean;
}

export interface GoalTranslation {
  targetWeightLowKg: number;
  targetWeightHighKg: number;
  bodyCompNote: string;
  timelineWeeks: number;
  rationale: string;
  unrealistic: boolean;
  saferTimelineWeeks: number;
}

export interface PlanDayExercise {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
  note: string;
}

export interface PlanDay {
  day: DayKey;
  kind: "gym" | "sport" | "rest";
  label: string;
  minutes: number;
  why: string;
  exercises: PlanDayExercise[];
}

export interface PlanMeal {
  slot: MealSlot;
  mealId: string;
  why: string;
}

export interface PlanDiet {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string[];
  sportDayNote: string;
  meals: PlanMeal[];
}

export interface GeneratedPlan {
  summary: string;
  days: PlanDay[];
  diet: PlanDiet;
}

export interface PlanVersion {
  id: string;
  createdAt: string;
  /** Feedback that produced this version, when regenerated. */
  feedback: string;
  diffSummary: string;
  plan: GeneratedPlan;
}

export interface StoredPlanState {
  intake: PlanIntake | null;
  goal: GoalTranslation | null;
  versions: PlanVersion[];
  activeVersionId: string | null;
}
