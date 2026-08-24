# Progress screen: trajectory, not totals

Rework what sits above the History list on Progress so the screen answers "am I moving forward?" at a glance. Same dark theme, card shapes and purple accent — layout and content only.

## What the user will see (top to bottom)

1. **Header** — "Progress". The leftover "MÉDIA" pill label becomes "Avg duration".
2. **Stat pills with comparison** — Sessions / Volume / Avg duration keep their place, each gaining a small line underneath comparing this month to the previous one (e.g. "+2 vs last month", "−4% vs last month"). When there's no prior month of data, the line is omitted rather than showing a fake zero.
3. **Consistency signal** — a separate slim row below the pills (not a fourth pill): "6 of 8 planned sessions this month" plus a week-streak indicator, driven by the weekly goal already in the profile.
4. **Trend chart** — a compact bar/line chart of weekly volume over the last ~8 weeks, with a toggle to weekly session count. Small and glanceable, no axes clutter, no tooltips beyond the value label.
5. **Coach plateau card** — same expandable ambient pattern as the Train screen's coach card, but trend-focused (e.g. "Bench Press hasn't moved in 3 weeks — worth a deload or a rep-range change"). Rendered only when real logged history produces a flag; otherwise nothing appears.
6. **Key lifts** — a strip of the lifts the user chose to track, each with a simple trend line: "Bench Press · 60 → 70 kg · 6 weeks" plus a tiny sparkline and direction chip (up / flat / down). A "+" in the section header opens a picker to add a lift; each entry can be removed. Empty state invites adding the first lift.
7. **History list** — unchanged, exactly as it is today.

## Technical notes

- New `src/lib/progress-analytics.ts`: month-over-month stat deltas, adherence + streak from `Profile.metaTreinosSemana`, weekly series for the chart, and per-lift first/last best-weight trend. Built on the existing helpers in `src/lib/coach/signals.ts` (`perWorkoutStats`, `weeklyAggregate`, `weekStart`) — no duplicate math.
- New `src/lib/coach/plateau.ts`: reuses `isSameWeightForLastN` / `sessionsSinceWeightIncrease` / `rpeTrend` over tracked lifts only, returning at most one `CoachInsight` (existing type) with reasoning + suggested action. No new plateau taxonomy in this pass.
- Tracked lifts use the existing `src/lib/data/tracked-lifts.ts` and its Supabase-backed `tracked_lifts` table — no schema change, no new server functions.
- New components: `ProgressTrendChart.tsx` (Recharts, already a dependency), `KeyLiftsSection.tsx`, `TrackedLiftPickerSheet.tsx`, `PlateauCoachCard.tsx` (mirrors `TodayCoachCard`'s expand/reason pattern).
- `src/routes/progresso.index.tsx` composes these via React Query (`workouts`, `sets`, `routines`, `exercises`, `trackedLifts`), with skeletons while loading.

## Out of scope

Theme/accent changes, session logging, the History list itself, and full plateau-type classification (strength vs volume vs fatigue vs adherence).
