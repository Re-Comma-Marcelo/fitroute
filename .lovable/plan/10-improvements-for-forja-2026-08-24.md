# 10 Improvements for Forja

This plan lists ten concrete, scoped improvements based on the current state of the app. Each item references existing code or screens so it can be reviewed and prioritized.

## 1. Unified "Today" card on Home
**Current state:** `src/routes/inicio.tsx` already has separate Body Goal and Today cards.
**Improvement:** Merge them into one glanceable "Today" card that tells the user: next scheduled training, next meal, and one coach action. Keep the body-goal progress as a thin secondary row inside the same card.
**Why:** The reference screenshot the user shared treats Home as a single daily briefing, not two competing cards.

## 2. Collapsed-by-default routine list on Train
**Current state:** `src/routes/treino.tsx` has a `TodayCoachCard` and routine cards, but the expansion behavior needs to be verified.
**Improvement:** Ensure every routine card starts collapsed (name, exercise count, last session, 1–2 flagged exercises). Tapping the card or chevron expands the full exercise list with sets/reps/notes. The coach-recommended routine leads the list with a "Recommended today" tag.
**Why:** The screen currently reads like a routine library; this makes it read like a daily plan.

## 3. Inline exercise swap during a live session
**Current state:** `src/routes/sessao.tsx` lets users add exercises from the library but has no swap flow.
**Improvement:** Add a per-exercise "Swap" action in the session screen that opens a small bottom sheet with alternatives based on the same muscle group and available equipment. Persist the swap as part of the saved workout.
**Why:** Coach flags exercises on the Train screen, but users can't act on them mid-workout without restarting.

## 4. Prominent rest timer with sound/vibration
**Current state:** `src/routes/sessao.tsx` has a rest state but it is subtle.
**Improvement:** Render a floating rest timer pill above the exercise list, and add an optional beep/vibration when rest ends. Keep it one-tap dismissible.
**Why:** Rest timing is a core training variable; it should be impossible to miss.

## 5. Weekly check-in prompt (Sunday/Monday)
**Current state:** `Profile` has `checkInMode` but no actual check-in UI.
**Improvement:** Show a check-in card on Home on Sundays/Mondays asking for soreness, fatigue, sleep, and any new issues. Store it as a `CoachNote` in `src/lib/data/coach-notes.ts` so the Train screen's grounded coach notes can reference real data.
**Why:** Grounded coach notes depend on having recent user-reported context.

## 6. Real Progress dashboard with trends
**Current state:** `src/routes/progresso.index.tsx` exists but is minimal.
**Improvement:** Build a Progress screen with Recharts charts for: weekly volume, bodyweight trend, sessions per week, and estimated 1RM for key lifts. Pull from `getWorkouts()` and profile weight history.
**Why:** The user asked for history/progress early on; the current screen does not yet deliver on that promise.

## 7. Training-aware meal timing
**Current state:** `MealSwapCard` and `MealScheduleSheet` exist, but meal timing is not tied to the actual workout schedule.
**Improvement:** When a workout is logged or scheduled, automatically tag the closest pre/post-workout meal slots in the Today and Week views with higher carbs/protein suggestions. Surface this in the meal swap reasoning.
**Why:** The user explicitly wants diet and training to relate to each other.

## 8. Market list generated from the actual week plan
**Current state:** `src/routes/dieta.market.tsx` exists but likely uses a static list.
**Improvement:** Auto-aggregate ingredients from the meals currently planned in `dieta.week.tsx`, group them by supermarket aisle, and let users check items off. Add a "Regenerate from week plan" button.
**Why:** The user's diet vision includes "see what I need to buy in the market" based on the chosen week plan.

## 9. PWA offline shell
**Current state:** The app is described as a PWA but there is no visible service worker or manifest wiring.
**Improvement:** Add a web app manifest and a lightweight service worker that caches the shell and lets users view routines/meals/history offline. Defer writes until the connection returns.
**Why:** A workout logger is used in gyms with poor reception; offline support is essential for a PWA.

## 10. Import preview for the Claude bridge
**Current state:** `ClaudeBridgeSection.tsx` and `src/lib/data/claude-import.ts` allow pasting a code, but apply immediately.
**Improvement:** Before writing to `localStorage`, show a preview sheet summarizing what will change: routine name, exercises/meals added, conflicts, and coach notes. Let the user confirm or cancel.
**Why:** MCP imports come from an external AI; users should see exactly what will land in their data before it happens.

## Suggested order of implementation
1. Unified Today card (quick UI win)
2. Collapsed routine list (Train screen clarity)
3. Weekly check-in prompt (enables grounded coach notes)
4. Inline exercise swap during session
5. Prominent rest timer
6. Training-aware meal timing
7. Market list from week plan
8. Import preview for Claude bridge
9. Real Progress dashboard
10. PWA offline shell (largest infrastructure item)
