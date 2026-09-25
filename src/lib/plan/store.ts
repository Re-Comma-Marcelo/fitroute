import { DEFAULT_EQUIPMENT_FALLBACK } from "./defaults";
import { emptyGrid } from "./life";
import type {
  GeneratedPlan,
  GoalTranslation,
  PlanIntake,
  PlanVersion,
  StoredPlanState,
} from "./types";

const STATE_KEY = "iron-plan-state-v1";
const DISMISS_KEY = "iron-plan-dismissed-at";
/** Resurface the home prompt after two weeks, once. */
const DISMISS_DAYS = 14;

function emptyState(): StoredPlanState {
  return { intake: null, goal: null, versions: [], activeVersionId: null };
}

export function readPlanState(): StoredPlanState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as StoredPlanState;
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

export function writePlanState(next: StoredPlanState): StoredPlanState {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STATE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked — the flow still works in memory */
    }
  }
  return next;
}

export function saveIntakeDraft(intake: PlanIntake): void {
  writePlanState({ ...readPlanState(), intake });
}

export function saveGoalTranslation(goal: GoalTranslation | null): void {
  writePlanState({ ...readPlanState(), goal });
}

export function addPlanVersion(
  plan: GeneratedPlan,
  feedback: string,
  diffSummary: string,
): PlanVersion {
  const state = readPlanState();
  const version: PlanVersion = {
    id: `v${state.versions.length + 1}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    feedback,
    diffSummary,
    plan,
  };
  writePlanState({
    ...state,
    versions: [...state.versions, version].slice(-10),
    activeVersionId: version.id,
  });
  return version;
}

export function updateActiveVersion(plan: GeneratedPlan): void {
  const state = readPlanState();
  if (!state.activeVersionId) return;
  writePlanState({
    ...state,
    versions: state.versions.map((v) => (v.id === state.activeVersionId ? { ...v, plan } : v)),
  });
}

export function setActiveVersion(id: string): void {
  writePlanState({ ...readPlanState(), activeVersionId: id });
}

export function activeVersion(state = readPlanState()): PlanVersion | null {
  return state.versions.find((v) => v.id === state.activeVersionId) ?? null;
}

export function dismissPlanPrompt(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
}

export function shouldShowPlanPrompt(): boolean {
  if (typeof window === "undefined") return false;
  const at = window.localStorage.getItem(DISMISS_KEY);
  if (!at) return true;
  const days = (Date.now() - new Date(at).getTime()) / 86_400_000;
  return days >= DISMISS_DAYS;
}

export function blankIntake(): PlanIntake {
  return {
    planScope: "full",
    age: 30,
    sex: "male",
    heightCm: 178,
    weightKg: 80,
    dailyActivity: "desk",
    goalMode: "words",
    targetWeightKg: null,
    goalText: "",
    timelineWeeks: 12,
    equipment: DEFAULT_EQUIPMENT_FALLBACK,
    gymDaysPerWeek: 3,
    trainingGoal: null,
    trainingYears: "1to3y",
    consistency: "onOff",
    experience: "intermediate",
    limitations: "",
    sports: [],
    slots: emptyGrid(),
    workPattern: "regular",
    commuteMin: 20,
    careDuties: false,
    sleepHours: 7,
    stress: 2,
    cookTime: "some",
    eatOutPerWeek: 2,
    budget: "normal",
    lifeNotes: "",
    timeAdjust: "asIs",
    allergies: "",
    dislikes: "",
    likes: "",
  };
}
