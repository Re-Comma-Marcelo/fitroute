export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

export interface MealSlotSchedule {
  /** 24h "HH:MM" the user usually eats this meal. */
  time: string;
  enabled: boolean;
}

export type MealSchedule = Record<MealSlot, MealSlotSchedule>;

export type MealTag = "high-protein" | "high-carb" | "light" | "order-out" | "quick";

export type Aisle = "Produce" | "Protein" | "Pantry" | "Dairy" | "Frozen" | "Bakery";

export interface MealIngredient {
  name: string;
  qty: number;
  unit: string;
  aisle: Aisle;
}

export interface Meal {
  id: string;
  name: string;
  slots: MealSlot[];
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepMin: number;
  tags: MealTag[];
  ingredients: MealIngredient[];
  /** Ordered out / delivery — does not contribute to the shopping list. */
  orderOut?: boolean;
  /** Created by the user (AI estimate from a description or a photo). */
  custom?: boolean;
  /** How a custom meal was created. */
  source?: "text" | "photo";
}

/** Week plan keyed by ISO date (yyyy-mm-dd) -> slot -> mealId. */
export type WeekPlan = Record<string, Partial<Record<MealSlot, string>>>;

export interface NutritionTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DayTotals extends NutritionTargets {}

export interface ShoppingItem {
  key: string;
  name: string;
  qty: number;
  unit: string;
  aisle: Aisle;
}

export type TrainingTag = "Strength" | "Cardio" | "Rest";
