/** Route feature types: the checkpoints between today and the user's goal. */

export type CheckpointStatus = "upcoming" | "achieved" | "missed" | "adjusted";
export type CheckpointSource = "ai_suggested" | "user_created" | "user_edited";

/** What a checkpoint measures, so status can be evaluated from logged data. */
export interface CheckpointMetric {
  kind: "lift" | "sessions" | "weight";
  /** Exercise id for `lift` metrics. */
  exerciseId?: string;
  /** kg for lift/weight, session count for `sessions`. */
  value: number;
}

export interface Checkpoint {
  id: string;
  title: string;
  description?: string;
  /** ISO date (yyyy-mm-dd). */
  targetDate: string;
  orderIndex: number;
  status: CheckpointStatus;
  source: CheckpointSource;
  /** One calm sentence, written when the coach moved this checkpoint. */
  adjustmentReason?: string;
  achievedAt?: string;
  metric?: CheckpointMetric;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressPhoto {
  id: string;
  checkpointId: string | null;
  /** Signed/public URL or a local data URL while the bucket does not exist. */
  url: string;
  takenAt: string;
  visibleToAi: boolean;
  createdAt: string;
}

export interface RouteStart {
  /** ISO date the route began. */
  date: string;
  /** Free snapshot: starting weight, starting lifts, a note. */
  snapshot: string;
}
