import breakfast from "@/assets/meal-breakfast.jpg";
import lunch from "@/assets/meal-lunch.jpg";
import dinner from "@/assets/meal-dinner.jpg";
import snack from "@/assets/meal-snack.jpg";
import type { MealSlot } from "./nutrition-types";

const BY_SLOT: Record<MealSlot, string> = { breakfast, lunch, snack, dinner };

/** Photo for a meal — falls back to a slot-based treatment. */
export function mealImage(slot: MealSlot | undefined): string {
  return BY_SLOT[slot ?? "lunch"];
}
