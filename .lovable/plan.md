# Exercise strip: clearer look + drag to reorder

The row of exercise pills at the top of a workout stays, but it becomes easier to read and you can reorder the workout straight from it.

## New look of each pill

Today every pill looks the same size and only says the name. Instead each pill shows, in one compact block:

- a small progress ring (or a tiny "2/4" sets counter) so you see at a glance how far that exercise is
- the exercise name, still shortened when long
- a check when it is finished, a muted crossed-out look when skipped
- the current exercise clearly raised: purple fill, slightly larger, plus a thin marker line under it

Extra polish:

- a numbered order badge (1, 2, 3…) so the sequence is obvious
- the active pill scrolls itself into view when you move between exercises
- soft fade on the left/right edges to hint there is more to scroll
- finished pills sit visually quieter than upcoming ones, so "what's left" reads first

## Drag to reorder in the strip

Same gesture already used on the exercise cards: press and hold a pill for about a fifth of a second, feel a short vibration, then slide left or right. Neighbouring pills shift as you pass them, and releasing drops the exercise in its new place — the cards below reorder to match.

Rules kept safe:

- a plain tap still just jumps to that exercise (no accidental dragging)
- exercises already finished can be moved too, but the one in progress keeps its logged sets
- while dragging, the page does not scroll sideways by accident
- the existing card-level hold-and-drag keeps working exactly as it does now

## Technical notes

- Rework the `<nav aria-label="Jump to exercise">` block in `src/routes/_authenticated/sessao.tsx` (around lines 1197-1235) into a small `ExerciseStrip` piece in the same file.
- Reuse the existing move helper (`moveExercicio`-style logic at ~line 814/829) so the strip and the cards share one reorder path; add a horizontal pointer handler mirroring the vertical one at ~line 842.
- Long-press threshold ~220ms with `touch-action: none` while dragging; haptic via the existing helper.
- Active pill centred with `scrollIntoView({ block: 'nearest', inline: 'center' })`.
- New copy ("Hold and drag to reorder exercises", "{done}/{total} sets") added to the translation dictionaries for English, Portuguese and Dutch.
- Frontend only: no Supabase, no schema, no training-logic changes.
