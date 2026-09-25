import { z } from "zod";

import { DAY_KEYS } from "./types";

export const goalTranslationSchema = z.object({
  targetWeightLowKg: z.number(),
  targetWeightHighKg: z.number(),
  bodyCompNote: z.string(),
  timelineWeeks: z.number(),
  rationale: z.string(),
  unrealistic: z.boolean(),
  saferTimelineWeeks: z.number(),
});

export const planDayExerciseSchema = z.object({
  exerciseId: z.string(),
  sets: z.number(),
  repsMin: z.number(),
  repsMax: z.number(),
  restSec: z.number(),
  note: z.string(),
});

export const planDaySchema = z.object({
  day: z.enum(DAY_KEYS),
  kind: z.enum(["gym", "active", "sport", "rest"]),
  label: z.string(),
  minutes: z.number(),
  why: z.string(),
  exercises: z.array(planDayExerciseSchema),
});

export const planDietSchema = z.object({
  kcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  notes: z.array(z.string()),
  sportDayNote: z.string(),
  meals: z.array(
    z.object({
      slot: z.enum(["breakfast", "lunch", "snack", "dinner"]),
      mealId: z.string(),
      why: z.string(),
    }),
  ),
});

export const generatedPlanSchema = z.object({
  summary: z.string(),
  days: z.array(planDaySchema),
  diet: planDietSchema,
});

export const parsedImportSchema = z.object({
  sessions: z.array(
    z.object({
      date: z.string(),
      label: z.string(),
      durationMin: z.number(),
      volumeKg: z.number(),
    }),
  ),
  bodyweights: z.array(z.object({ date: z.string(), kg: z.number() })),
  notes: z.array(z.string()),
});

export type ParsedImport = z.infer<typeof parsedImportSchema>;
