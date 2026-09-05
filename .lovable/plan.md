# Fix and replace the kg / reps steppers

## What's wrong today

The −/+ strip only exists while a number field is focused. Touching a button takes focus away from the field first, the strip is removed in that same instant, and the tap never lands on anything. So the buttons genuinely cannot work in their current form — it isn't a mis-tap.

## What replaces them

The −/+ buttons go away. Numbers become directly adjustable:

- **Tap** a number: keyboard opens, value selected, type as usual (unchanged).
- **Hold and slide** a number up or down: the value scrubs live, no keyboard. Up increases, down decreases.
  - Weight moves in that exercise's natural increment (2.5 kg barbell, smaller for machines/dumbbells), respecting kg/lb.
  - Reps move by 1; slide further/faster and it jumps by 5 (also 5-second steps for timed sets).
  - Never goes below zero.
- While scrubbing, the number enlarges slightly and shows the step being applied (e.g. "+2.5") so it's clear what changed. A light tick of vibration on every step.
- Release: value is saved to the set exactly like typing it.
- A short hint appears the first few sessions ("Hold a number to slide it"), then stops.

## Keeping it usable for everyone

Dragging is invisible to screen readers and keyboards, so the fields also accept up/down arrow keys with the same steps, and the accessible labels state the step size. Nothing depends on being able to drag.

## Scope

Frontend only, inside the workout session screen. No backend, no Supabase, no changes to how sets are saved, no changes to the rest timer. New text is added to the English/Portuguese/Dutch dictionaries.

## Technical notes

- Remove `StepButton` and the conditional `focused` strip from `src/routes/_authenticated/sessao.tsx`; keep `stepKg`/`stepReps` as the value math used by the new gesture and by arrow keys.
- Add a small `useValueScrub` hook (new file under `src/lib/`) built on pointer events with `setPointerCapture`: long-press threshold ~180 ms, then vertical delta ÷ pixels-per-step drives repeated step calls; `touch-action: none` on the field while scrubbing so the page doesn't scroll; suppress the click/focus that would otherwise open the keyboard after a scrub.
- `NumberField` gains optional `onStep(direction, magnitude)` and wires `onKeyDown` for ArrowUp/ArrowDown before the existing `focusNextField` handler.
- Reuse `hapticTick` for step feedback; respect `prefers-reduced-motion` for the scale animation.
