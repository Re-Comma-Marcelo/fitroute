# Nutrition: from placeholder to a real meal-planning experience

Goal: the Diet tab becomes a planner that answers three questions — "what should I eat now?", "what am I eating this week?", and "what do I need to buy?" — and stays ready to link with training load later.

Still frontend-only: all data lives in the in-memory mock layer under `src/lib/data/`, same as workouts. No backend, no Lovable Cloud.

## The experience

Open the app at 8am and the Diet tab opens on **Breakfast**, because it picks the meal slot closest to the current time (you can swipe/tap to any other slot). Each option is a card with a photo, the calories and protein, and a one-line coach note ("high carb — matches today's run"). Pick one and the day's rings update.

Three modes in the Diet tab, switched by a segmented control at the top:

```text
[ Today ]   [ Week ]   [ Market ]
```

- **Today** — the time-aware meal slot (Breakfast / Lunch / Snack / Dinner), the day's kcal + macro rings, and 2-3 suggested options per slot with images.
- **Week** — a 7-day grid, one row per day, one cell per meal slot. Tap a cell to assign a meal from the library. Each day shows its planned kcal/protein total against target, and the training tag for that day (Strength / Run / Rest) so the plan reads next to the workout.
- **Market** — the shopping list generated from whatever is planned for the week: ingredients merged and summed across meals, grouped by aisle (Produce, Protein, Pantry, Dairy), with checkboxes. Meals marked "order out" are listed separately instead of contributing ingredients.

## Steps

### Step 1 — Meal library and data layer
Add nutrition types (`Meal`, `MealIngredient`, `MealSlot`, `PlannedMeal`, `NutritionTargets`) to `src/lib/types.ts`. Seed ~24 meals in the mock across the four slots, each with photo, kcal, protein/carb/fat, prep time, ingredient list with quantities, and tags (`high-carb`, `high-protein`, `light`, `order-out`). New data module `src/lib/data/nutrition.ts` with async functions: list meals, get/set the week plan, day totals, shopping list. Targets derive from the existing profile (weight, goal, activity level).

### Step 2 — Today view
Rebuild `src/routes/dieta.tsx` around the segmented control, defaulting to Today. Time-aware slot selection, the existing kcal/macro rings fed by real planned data instead of hardcoded numbers, and suggestion cards with images. Tapping a card logs it for that slot.

### Step 3 — Week planner
Week grid with per-day totals, meal picker sheet (filter by slot, tag, prep time), and a "fill the week" action that auto-suggests a plan hitting the daily targets. Plan persists through the mock layer plus `localStorage`, matching how the active session already persists.

### Step 4 — Market list
Aisle-grouped, quantity-merged shopping list from the week plan, with check-off state, a date-range selector (next 3 days / full week), and a separate "order out" section.

### Step 5 — Training link
Each day in the plan reads the routine scheduled/logged for that day and tags it. Extend `src/lib/coach/nutrition.ts` so suggestions shift with load: leg/heavy-strength days bias high-protein meals, cardio days bias high-carb, rest days trim calories. Coach notes appear inline on meal cards and above the Today rings.

### Step 6 — Meal photography
Generate a consistent set of meal images (one visual treatment across all of them: overhead, dark surface, matching the app's dark aesthetic) and wire them through a helper like the existing `src/lib/exercise-image.ts`, with a slot-based fallback so any meal without a photo still looks intentional.

## Technical notes

- New: `src/lib/data/nutrition.ts`, `src/lib/meal-image.ts`, `src/components/MealCard.tsx`, `src/components/MealPickerSheet.tsx`, plus routes `dieta.index.tsx` / `dieta.semana.tsx` / `dieta.mercado.tsx` under a `dieta.tsx` layout so each mode is its own URL with its own head metadata.
- Extends: `src/lib/types.ts`, `src/lib/data/mocks.ts`, `src/lib/coach/nutrition.ts`.
- Week plan and shopping-list check state persist in `localStorage`, keyed like `src/lib/session-state.ts`.
- Reads via `useQuery` against the data layer; no direct mock imports in components.

## Suggested order

Steps 1-2 give a working, useful Today screen. Steps 3-4 make it a planner. Steps 5-6 are the polish and the training tie-in. I'd ship 1-2 first and review before continuing.
