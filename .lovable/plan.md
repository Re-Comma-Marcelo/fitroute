# Train screen: reachable coach chat + scannable "Why this session"

Small UI-only pass on `/treino`. No backend, no data changes, no new coach logic.

## 1. Make the coach chat reachable from the body

The chat entry point is currently only a small icon in the header.

Add a second, text-based entry point on the Train screen so users notice it without hunting for the icon.

- Place it right after the **Start / Blank** buttons, before the **My routines** heading.
- Render as a quiet, full-width row: coach icon + "Any questions about today's training?" + right chevron.
- Tapping it opens the same `CoachChatSheet` bottom sheet.
- Keep it subtle (muted text, border, no fill) so it doesn't compete with the purple Start button.

## 2. "Why this session" preview + expand

The TodayCoachCard currently shows only a one-liner in the collapsed state, then dumps every bullet when expanded.

Change the collapsed card to show a scannable preview of the reasoning:

- Keep the one-liner at the top.
- Below it, show the first 2–3 sentences of the combined reasoning (from `why` + `setup` + `cautions`), truncated with an ellipsis.
- Add a clearer expand affordance: "See why" / "Show more" with a chevron, in slightly stronger muted text than the current plain "Why this session" label.
- The whole card header stays tappable; the "See why" text just makes the action more obvious.
- Keep the header compact — no oversized button, no extra vertical padding.

When expanded, show the full blocks exactly as they are today (`Why today`, `Your setup`, `What you told me`, actions, swap, issue form).

## Files to touch

- `src/components/TodayCoachCard.tsx` — truncate collapsed reasoning and add the "See why" affordance.
- `src/routes/treino.tsx` — add the text-based chat entry row below Start/Blank.
- `src/components/CoachChatSheet.tsx` — export a second trigger variant or accept a custom child so the new row can reuse the same sheet.

## Out of scope

- No new coach engine logic.
- No changes to the chat sheet content or backend.
- No changes to routine cards, Start/Blank buttons, or Weekly Goal bar.
