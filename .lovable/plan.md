# Cleaner workout journey: start → log → rest → finish

Goal: make the whole training flow feel calm and obvious on a phone, one decision at a time, without removing any feature you already rely on.

## What feels heavy today

Walking the flow end to end, the logging screen carries too much at once:

- Each exercise card shows, in the same small space: a drag handle, name, set counter, progress bar, expand arrow, rest picker, plate calculator, progress badge, info button, coach button, "Add warm-up" button and a 10-item menu.
- Up to three advice boxes can stack above the sets (adaptive target, prescription line, coach comment) saying overlapping things.
- Every completed set grows an extra "note for coach" field, and every exercise keeps an always-open notes box, so the list gets longer the more you train.
- Nothing clearly tells you "this exercise is done, move to the next" — you have to find the next card yourself.
- Starting a session drops you straight into a long list with no quick read of what today is.

## The plan

### 1. Quiet the exercise card
- One line of identity: name, block tag, sets done / target reps, thin progress bar.
- Move rest picker, plate calculator, warm-up and info into a single row of small icon actions, with the rarely used ones inside the existing menu.
- Merge the three advice boxes into one coach line with the target, expandable when you want the reasoning.
- Collapse the notes box into a "Add note" link; the per-set coach note appears only from a small action, not automatically.

### 2. Make the current set the hero
- The active set row gets larger numbers and more breathing room; completed sets shrink to a compact done line (weight × reps · RPE).
- Keep the check, hold-and-slide editing, typing and the effort scale exactly as they work now.

### 3. A clear rhythm between exercises
- When the last set of an exercise is checked, show a short "Exercise done — next: <name>" strip with a Next button that collapses the finished card and opens the next one.
- Keep the top chip row as the quick jump, marking done / current / skipped more legibly.

### 4. A short start and a stronger finish
- On entering a session: a one-glance header line (routine name, exercise count, estimated time) and a Start lifting button that opens the first exercise.
- Finish button shows what will be saved (sets · volume) so the confirmation dialog stops being a surprise; the summary screen keeps records, comparison and sharing as today.

### 5. Polish pass
- Consistent tap sizes and spacing on every control in the session.
- Same visual language for rest bar, coach line and effort scale.
- All new wording added in English, Portuguese and Dutch.

## Technical notes

Frontend only, no Supabase, schema or backend changes. Work stays in `src/routes/_authenticated/sessao.tsx` (split into smaller presentation components where it helps), `src/routes/_authenticated/treino.tsx`, session UI components under `src/components/`, and a new i18n fragment registered in the dictionary index. Existing session state, rest timer, prescription, coach and RPE logic is reused unchanged — this is layout, hierarchy and flow, not new behaviour.
