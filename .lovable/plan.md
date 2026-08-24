# Train screen: from routine library to today's plan

Layout and content pass only — same dark theme, card shapes, purple accent. No chat tab, no changes to the session/logging flow.

## What the screen becomes

Top to bottom:

1. Header "Train" + add button (unchanged)
2. Weekly Goal bar (unchanged)
3. **Today's coach card** (new) — the main coach touchpoint
4. Start / Blank buttons (unchanged position; Start reflects the *active choice*, see below)
5. **My routines** — recommended routine first, tagged "Recommended today", all cards collapsed by default

Today the routine cards dump all 7 exercises with sets/reps inline. Every card becomes a collapsed preview (cover, name, exercise count, last-session line, up to 2 flagged exercises) and expands on tap/chevron into the full exercise list with sets, reps, notes and per-exercise coach flags. Tapping the card body no longer navigates to the editor — expansion is the primary gesture, with editing moved to an explicit "Edit routine" action inside the expanded state.

## Today's coach card

**Collapsed:** one plain line naming the active routine and a reason drawn from real data, e.g. "Upper A today — Bench has room to move and your chest volume is low this week." Treated as commentary, not a metric or CTA: bordered/tinted panel with a small coach icon, no filled purple, chevron to indicate expandability.

**Expanded (inline expand):** three blocks —

- *Why today* — recent volume per muscle group, days since that routine, how the last sessions went (RPE trend, weight movement).
- *Your setup* — only the profile inputs that actually influenced the pick: preferred time, session length vs. routine size, available equipment, exercises being avoided (with the reason the user typed).
- *Actions* — "Keep this plan" (starts it), "Swap <flagged exercise>" (picks an alternative for the same muscle group from the library, respecting equipment and avoid-list, applied to this session only), and "Lighter session" (deload — reduced sets/load flag carried into the session).

Also inside the expanded card: a compact "Log an issue" row (short free text + soreness/injury tags) so the user can record something the coach can reference later, without waiting for the weekly check-in.

## Grounding rule

Coach copy on this screen may only reference things the user actually entered: profile fields (equipment, exercises to avoid + reason, session length, preferred time) and stored coach notes (weekly check-in text/tags, newly logged issues). A note is matched to today's session by body-part keywords in the note text/tags against the muscle groups of the routine's exercises, so a "shoulder soreness" note surfaces on a pressing day and stays quiet on a leg day. When nothing relevant is on file, the copy falls back to a plain acknowledgment — never an invented reason.

## Choosing a different routine

An "active choice" is tracked for the day (defaults to the coach's recommendation, persisted locally). Starting or selecting another routine card sets it, and both the Start button and the coach card follow — the card rewrites itself to acknowledge the switch, grounded: "Switching to Lower A — keep shoulders low on presses, you flagged shoulder soreness last week." No confirmation, no gate.

## Per-exercise notes

The existing pill pattern is kept but normalised into one calm "coach note" style: a single pill per exercise, short label only (Increase / Stalled / Ease off), with the full sentence in the existing popover. Positive and attention notes stay in one visual family, distinguished by a small icon and a muted vs. accent tint, so 2–3 notes on one list still read as a list rather than a wall of text. Stagnation flagging already exists in the coach engine and gets surfaced here; collapsed cards show at most 2 flags, prioritising warnings.

## Technical notes

- `src/routes/treino.tsx`: routine cards get local expanded state; recommended routine sorted first via `getTodayPlan()` from `src/lib/coach/recommendations.ts`.
- New `src/lib/coach/today-card.ts`: builds the collapsed line, expanded reasoning, relevant-profile-inputs list, and switch acknowledgment from workouts/sets/profile/coach notes — pure functions, no UI imports.
- New `src/lib/coach/grounding.ts`: body-part keyword extraction from coach notes and matching against exercise muscle groups; shared by the card and the switch note.
- New `src/components/TodayCoachCard.tsx` and `src/components/CoachIssueForm.tsx` (the latter reusing the same `saveCoachNote` shape as the Home check-in).
- Swap/deload adjustments live in session-start options (`src/lib/start-session.ts`) as per-session overrides; routines themselves are not mutated.
- Active choice stored in localStorage keyed by date, alongside existing `session-state` helpers.
- Still frontend-only: everything reads through `src/lib/data/`, no backend.
