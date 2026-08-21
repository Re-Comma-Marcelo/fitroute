# English UI + Ambient AI Coach + Training Model

Frontend-only pass (no Cloud, no backend). All data keeps flowing through `src/lib/data/`.

## 1. Language: full switch to English

- Every screen's copy: nav labels become Home, Train, Nutrition, Progress, Profile; buttons, empty states, toasts, errors, session table headers (`SET | PREVIOUS | KG | REPS | RPE | ✓`), and all route `head()` titles/descriptions.
- Seeded data translated too: exercise names (Bench Press, Barbell Squat...), muscle groups (Chest, Quads, Hamstrings...), equipment (Barbell, Dumbbells, Machine, Cable, Bodyweight), routine names/descriptions.
- Dates/numbers switch from `pt-BR` to `en-US` formatting; greeting becomes "Good evening, {name}".
- Positioning copy shifts from tracker to coach: login/hero and Profile framing become "an AI trainer that adapts to your actual life" — recovery, schedule, other sports.

## 2. Hierarchy and density cleanup

Same dark theme, cards and accent color — only layout weight changes.

- **Home**: one clear vertical rhythm — Today coach card (new) → weekly goal card with the primary CTA as the single strong button → a quiet 3-metric row (volume / time / sets) demoted to small labels → routines → recent sessions as a plain list. Metrics lose card chrome so they stop competing with the CTA.
- **Train**: each routine card leads with name + exercise count; exercises render as one line each (thumbnail, name, `3 × 8-12`), with numbers de-emphasized and at most one badge/note per exercise so the list reads at a glance instead of as a stat dump.

## 3. Ambient AI coach (rule-based, no separate tab)

New `src/lib/coach/` module — pure, deterministic, no UI imports:

- `signals.ts`: derives per-exercise and per-week signals from workouts/sets — weight/rep trend, sessions since last increase, RPE trend, weekly volume vs prior weeks, sessions done vs target, skipped-routine detection.
- `rules.ts`: turns signals into `CoachInsight { id, scope: 'today' | 'exercise' | 'week' | 'nutrition', severity: 'info' | 'nudge' | 'warning', title, body, plateauType?, exerciseId? }`.
- `today.ts`: composes the Home "Today" recommendation (what to train and why) from recent volume per muscle group, days since each routine, and check-in notes.
- `chat.ts`: matches a typed question against the same signals and returns a written answer; unmatched questions get an honest "I can't reason about that yet" reply. Structured so an LLM call can replace it later without touching the UI.

Surfaces:

- **Home**: "Today" card above the weekly goal — plain-language recommendation plus one-line rationale, and up to two intervention cards (stall, deload suggestion, faster-than-expected progress).
- **Train**: inline notes under exercise rows, extending the existing progression badge into three states — increase, hold, and stalled ("same weight 3 sessions running — worth pushing this time").
- **Nutrition**: placeholder screen gains the same inline-note slot, wired to training-load signals, ready for when meal logging ships.
- **Chat**: single lightweight entry — a small coach icon in the header plus a "Ask your coach" row in Profile — opening a sheet, not a tab.

## 4. Profile as a real training model

Extend `Profile` with: `equipment: string[]`, `avoidExercises: string[]` (with reason), `sessionLengthMin`, `preferredTime`. Rendered as a new "Training setup" section in Profile, and a short guided flow for first-run users.

New `CoachNote` record, stored separately from workout data: `{ id, createdAt, kind: 'checkin' | 'observation', answers, tags }` — persisted via `src/lib/data/coach-notes.ts` (in-memory mock + localStorage), so it survives reloads and is read by the rules as long-term memory.

**Weekly check-in** (Sunday/Monday): user-controlled in Profile — "Prompt me for a weekly check-in" (interrupting sheet) or "Just show a card on Home" (default). Three short questions: anything bothering you, anything that didn't work (too long / disliked exercise / missed sessions), any soreness or injury flags.

## 5. Plateau taxonomy (designed now, partly shipped)

`plateauType` is a typed union covering `strength`, `volume`, `fatigue`, `adherence`, `single-exercise`. This pass detects strength, single-exercise and adherence; volume and fatigue detectors are stubbed behind the same interface so adding them later is rules-only work.

## 6. Deliberately not in this pass

Typed natural-language logging stays out of the headline; voice logging is left as a later idea. Fatigue inference from rep-weight patterns, the "what if" simulator and coach modes aren't built, but signals and notes are stored as timestamped series so those can be layered on without a data migration.

## Technical notes

- All new logic is pure and testable; no component imports data mocks directly.
- Coach output is generated in `useQuery` off the existing data functions, so replacing the rule engine with a server-side LLM later is a one-file swap.
- Types extended in `src/lib/types.ts`; `scripts/supabase-schema.sql` gets matching `coach_notes` and profile columns so a future backend switch is aligned, without enabling any backend now.
