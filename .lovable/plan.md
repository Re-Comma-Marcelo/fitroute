# Progress screen: trajectory, not totals

A layout and content pass on `/progresso`. Same dark theme, card shapes, and purple accent. History list untouched.

## New screen order

1. **Header** — "Progress". The third stat pill's leftover `Média` label becomes `Avg time`.
2. **Stat pills with deltas** — Sessions / Volume / Avg time, each with a small secondary line comparing the current 30 days to the previous 30 days (e.g. "+2 vs last month", "−4% vs last month"). When there's no prior-period data, the delta line is omitted rather than showing a fake zero.
3. **Consistency signal** — one distinct full-width line under the pills (not a pill), styled differently from the stat row: "5 of 8 planned sessions this month" plus a current weekly streak when there is one ("3-week streak"). Uses the profile's `metaTreinosSemana` as the planned baseline.
4. **Trend chart** — compact bar chart of weekly volume for the last 8 weeks (Recharts, ~120px tall, minimal axes, purple bars, tooltip on tap). Hidden when there are fewer than 2 weeks of data.
5. **Coach plateau card** — same ambient pattern as Train's coach card: preview line, tap to expand into reasoning and a suggested action. Only renders when a tracked lift has actually stalled in logged history (top working weight flat across the last 3+ sessions of that exercise, with average RPE not dropping). Nothing notable ⇒ no card.
6. **Key lifts** — a card listing the lifts the user chose to track, each with `Bench Press · 60kg → 70kg · 6 weeks` and a tiny sparkline. A `+` in the section header opens a picker sheet to add a lift; each row has a remove action. Empty state invites the user to pick their first lift.
7. **History list** — unchanged.

## Data and logic

- New `src/lib/data/tracked-lifts.ts`: read/add/remove tracked exercise IDs, persisted to `localStorage` (same pattern as `coach-notes.ts` / `nutrition.ts`). Defaults to a couple of common compounds on first load so the section isn't empty.
- New `src/lib/progress-stats.ts` (pure functions over `Workout[]` / `WorkoutSet[]`):
  - `periodStats(workouts, days)` → sessions, volume, avg duration for a window; used twice for current vs previous period.
  - `weeklyVolume(workouts, weeks)` → chart series.
  - `consistency(workouts, weeklyTarget)` → planned vs done this month, weekly streak.
  - `liftTrend(sets, workouts, exerciseId)` → first/last top working weight, span in weeks, sparkline points.
- Coach card reuses the existing `perWorkoutStats` / `isSameWeightForLastN` / `rpeTrend` signals in `src/lib/coach/signals.ts` via a new `plateauCard(...)` helper in `src/lib/coach/` returning `{ line, reasoning[], action }` or `null`. Deliberately one rule (flat top weight in a tracked lift) — no plateau-type classification this pass.

## Components

- `src/routes/progresso.index.tsx` — recomposed to the order above; existing `Stat` extended with an optional delta line.
- `src/components/progress/TrendChart.tsx` — Recharts bar chart.
- `src/components/progress/KeyLiftsCard.tsx` + `TrackedLiftPickerSheet.tsx` — list, `+` sheet (reuses the exercise library data and existing `sheet` primitive), remove.
- `src/components/progress/PlateauCoachCard.tsx` — mirrors `TodayCoachCard`'s expandable structure and tokens.

All reads go through `src/lib/data/*`; no backend, no Cloud, no schema changes.

## Out of scope

Theme/accent changes, session logging, the History list itself, and full plateau-type detection (strength vs volume vs fatigue vs adherence).
