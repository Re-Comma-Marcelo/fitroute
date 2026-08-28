export type PlateauType = "strength" | "volume" | "fatigue" | "adherence" | "single-exercise";

export type CoachSeverity = "info" | "nudge" | "warning";

export type CoachScope = "today" | "exercise" | "week" | "nutrition";

export interface CoachInsight {
  id: string;
  scope: CoachScope;
  severity: CoachSeverity;
  title: string;
  body: string;
  plateauType?: PlateauType;
  exerciseId?: string;
}

export interface TodayRecommendation {
  routineId?: string;
  routineName?: string;
  title: string;
  subtitle: string;
  reason: string;
}

export interface TodayPlan {
  recommendation: TodayRecommendation;
  insights: CoachInsight[];
}
