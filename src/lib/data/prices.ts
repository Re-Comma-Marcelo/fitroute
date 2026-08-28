import type { Aisle, ShoppingItem } from "../nutrition-types";

/**
 * Rough supermarket price estimates in EUR. Weight/volume entries are priced per
 * 100 g / 100 ml; countable units (unit, slice, can) are priced per piece.
 * These are deliberately approximate — the UI always labels them as estimates.
 */
const PRICE: Record<string, number> = {
  // Protein (per 100 g)
  "Chicken breast": 1.1,
  "Chicken thigh": 0.9,
  "Turkey breast slices": 1.6,
  "Lean ground beef": 1.3,
  "Sirloin steak": 2.6,
  "Salmon fillet": 2.8,
  Shrimp: 2.4,
  "Canned tuna": 1.3, // per can
  Eggs: 0.35, // per unit
  "Whey protein": 2.4,
  // Dairy (per 100 g / 100 ml)
  "Greek yogurt": 0.5,
  "Cottage cheese": 0.6,
  Milk: 0.12,
  Butter: 0.9,
  Parmesan: 2.2,
  "Feta cheese": 1.5,
  // Produce
  Spinach: 0.9,
  Broccoli: 0.35,
  Zucchini: 0.3,
  Asparagus: 1.4,
  "Cherry tomatoes": 0.7,
  "Mixed salad": 1.1,
  "Romaine lettuce": 0.5,
  "Snap peas": 1.0,
  "Sweet potato": 0.25,
  Potatoes: 0.15,
  Blueberries: 1.6,
  "Mixed berries": 1.2,
  Pineapple: 0.4,
  Avocado: 1.5, // per unit
  Banana: 0.3,
  Apple: 0.5,
  Cucumber: 0.8,
  Onion: 0.3,
  Carrot: 0.2,
  "Bell pepper": 0.8,
  // Pantry
  "Rolled oats": 0.2,
  "White rice": 0.2,
  "Brown rice": 0.25,
  Quinoa: 0.6,
  Pasta: 0.2,
  "Rice noodles": 0.4,
  "Black beans": 0.3,
  Chickpeas: 0.3,
  Hummus: 0.9,
  "Peanut butter": 0.7,
  Almonds: 1.6,
  Honey: 0.7,
  "Olive oil": 0.9,
  "Soy sauce": 0.6,
  "Caesar dressing": 0.8,
  "Tomato sauce": 0.25,
  "Rice cakes": 0.15, // per unit
  // Bakery
  "Sourdough bread": 0.3, // per slice
  "Tortilla wrap": 0.4, // per unit
};

/** Fallback when an ingredient is not in the table. */
const AISLE_FALLBACK: Record<Aisle, number> = {
  Produce: 0.5,
  Protein: 1.3,
  Pantry: 0.4,
  Dairy: 0.6,
  Frozen: 0.7,
  Bakery: 0.4,
};

const COUNTABLE = new Set(["unit", "slice", "can", "piece"]);

/** Estimated cost in EUR for one shopping-list row. */
export function estimateItemPrice(item: Pick<ShoppingItem, "name" | "qty" | "unit" | "aisle">): number {
  const rate = PRICE[item.name] ?? AISLE_FALLBACK[item.aisle] ?? 0.5;
  const multiplier = COUNTABLE.has(item.unit) ? item.qty : item.qty / 100;
  return Math.max(0, rate * multiplier);
}

export function estimateTotalPrice(items: Pick<ShoppingItem, "name" | "qty" | "unit" | "aisle">[]): number {
  return items.reduce((sum, item) => sum + estimateItemPrice(item), 0);
}
