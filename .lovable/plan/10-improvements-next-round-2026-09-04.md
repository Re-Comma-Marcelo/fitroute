# 10 improvements — next round

Frontend only. No Supabase schema changes, no new backend.

## 1. Session screen split into a focused view
`sessao.tsx` is over 2,000 lines and shows every exercise at once. Add a "focus mode" toggle that shows only the current exercise full-screen with big weight/reps fields, plus a slim strip to jump between exercises. The current full list stays available.

## 2. Rest timer as a persistent island everywhere
`RestIsland` exists but the countdown is easy to lose when scrolling. Make it always reachable: compact pill when scrolled, tap to expand with -15s / +15s / skip, and a clear "overdue" state.

## 3. Quick-add exercise mid-session
Today adding an exercise means leaving the session. Add a search sheet inside the session (reusing the library search with favorites and recents) so an extra exercise can be added in two taps without losing the timer.

## 4. Warm-up sets generated automatically
Use `warmup.ts` to propose warm-up sets from the first working weight (e.g. 40% / 60% / 80%), inserted as `W` rows with one tap and easily removed.

## 5. Session recovery after an app crash
If the app closes mid-session, on next open show a card: "Unfinished workout from 19:42 — resume or discard", restoring timer, sets and rest state from local storage.

## 6. Home: next-session preview and rest-day clarity
Show on the Train/Home card what is coming next (routine name, first two exercises, estimated time) and when it is a rest day make it explicit with the reason, instead of always suggesting a workout.

## 7. Progress: single "You vs last month" summary at the top
One condensed block: sessions, volume, average RPE, streak, each with an up/down delta and a one-line coach reading, so trends are visible without scrolling through charts.

## 8. Exercise detail: personal history table
On the exercise page add a compact table of the last 10 sessions (date, best set, e1RM, RPE) with the trend arrow, so progress on one movement is readable at a glance.

## 9. Diet: one-tap logging from the plan
Each planned meal gets an "Ate this" button that logs it with the planned macros, plus a portion adjuster (0.5x / 1x / 1.5x). Removes the need to re-enter foods already planned.

## 10. Diet: weekly macro consistency view
A 7-day strip showing hit/miss against protein and calorie targets, with the weekly average and how many days remain to reach the target — same visual language as the training weekly goal.

## Technical notes
- New files expected: a session focus-mode component, a session-recovery card, an in-session exercise picker, a weekly macro strip component.
- Reuse existing modules: `warmup.ts`, `session-state.ts`, `use-rest-expiry.ts`, `progress-analytics.ts`, `e1rm.ts`, `nutrition-local.ts`, `coach/rest-day.ts`.
- All new copy goes through the i18n dictionaries (EN/PT/NL) in a new fragment.
- Persistence stays in `src/lib/data/` and localStorage fallbacks; no schema work.

## Suggested order
5 → 2 → 1 → 3 → 4 → 6 → 9 → 10 → 7 → 8
