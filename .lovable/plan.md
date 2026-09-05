# Exercise detail sheet: execution, tips and per-exercise coach

Tapping an exercise name during a workout opens a slide-up sheet about that movement. No database changes.

## 1. Tap target in the session

- In the session, the exercise title (and its thumb) becomes tappable, with a small info chevron so it reads as "open".
- Opens a bottom sheet over the session; closing returns to the exact same scroll position and set state.
- The same sheet opens from the exercise list in the library and from the exercise picker.

## 2. What the sheet shows

- Animated execution loop at the top (static image when the phone asks for less motion), full width, playing by default here — no need to expand anything.
- Movement name, primary muscle and equipment.
- "How to do it": the step text already stored for each exercise.
- "Coach tips": short cue list built from the exercise's own data (muscle group, equipment, whether it is a free-weight or machine move) plus the user's own numbers — last load used, best set, and a stagnation note when that lift has stalled.
- "Your history": last few sessions for this exercise (weight x reps, date), reusing the existing history card.

## 3. Ask about this exercise

- An "Ask about this exercise" area at the bottom of the sheet, reusing the existing coach chat panel, pre-scoped to the current movement so answers mention it by name.
- Quick question chips: "Am I doing this right?", "Why does it hurt here?", "How do I progress?".
- In-app answers stay the existing grounded ones (form cues, rest, progression, stalls) with the exercise name and the user's recent numbers filled in.
- Open-ended coaching keeps going through Claude over MCP, as agreed: the sheet shows a short line pointing there, and Claude gains a new read-only tool that returns everything about one exercise (instructions, equipment, recent sets, best set, stall status) so its answers about a specific movement are grounded in real training data.

## Technical notes

- New `src/components/ExerciseDetailSheet.tsx` — sheet composing loop media (`exerciseLoopUrl` / `exerciseThumbUrl`), instructions, tips, `ExerciseHistoryCard`, and the chat panel.
- New `src/lib/coach/exercise-tips.ts` — pure tip generator from `Exercise` + recent workout data; no model call.
- `src/lib/coach/chat.ts` — accept an optional exercise context so answers name the lift and use its numbers; `CoachChatSheet.tsx` exports the chat panel for embedding.
- Wire the tap in `src/routes/_authenticated/sessao.tsx`, `biblioteca.tsx`, `SessionExercisePickerSheet.tsx`.
- New MCP tool `src/lib/mcp/tools/get-exercise-context.ts`, registered in `src/lib/mcp/index.ts`, read-only and scoped to the authenticated user; manifest re-extracted afterwards.
- New strings added to the i18n dictionary in pt and nl; no literals in JSX.
- Untouched: `db.server.ts`, `forja.functions.ts`, `src/integrations/supabase/*`, auth, service worker, manifest, migrations.

## Out of scope

- No new AI model calls inside the app.
- No changes to set logging, rest timer or progression logic.
