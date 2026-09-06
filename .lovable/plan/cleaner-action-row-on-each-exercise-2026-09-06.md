# Cleaner action row on each exercise

Today an open exercise can show five wrapping pills (Rest, Plates, How to do it, Ask coach, Weight increased) plus a full-width "See execution" bar. On a phone they wrap into two or three lines and push the sets down. Fix: one single line, one clear meaning per control.

## The new row

```text
[ Rest 3:00 ▾ ]   ( ▶ )  ( ⚖ )  ( 💬 )        (progress dot)
```

- **Rest** stays the only labelled control, because the number itself is information you read while training. Tap opens the same 60/90/120/180 picker.
- **Play icon** = watch the execution loop. It opens the exercise sheet already in the app (loop, description, tips, history, coach chat) straight on the media, so the tall "See execution" bar inside the card disappears. When the exercise has no video, the icon becomes the info icon and opens the same sheet.
- **Scale icon** = plates, shown only for barbell-style lifts (unchanged rule).
- **Speech icon** = ask the coach about this exercise.
- **"Weight increased"** stops being a wide pill and becomes a small up-arrow badge next to the exercise name, where progress belongs; tapping still shows the reason.
- Row never wraps: fixed 40px round icon buttons, all with labels for screen readers and long-press titles, so nothing is lost by dropping the text.

## Also cleaned

- The row appears only when the exercise is expanded; a collapsed card keeps just name, sets, last set and the menu — less noise while scrolling a long workout.
- Spacing tightened so the first set is visible without scrolling on a small phone.
- The three-dot menu is untouched; every action stays reachable there.

## Technical notes

Frontend only. Files: `src/routes/_authenticated/sessao.tsx` (action row, `RestPicker`, `ExerciseInfoButton`, `ProgressBadge`), `src/components/ExerciseDetailSheet.tsx` (accept an initial focus on media), `src/components/ExerciseExecutionCard.tsx` (no longer rendered inside the session card; still used in the library), plus a new i18n fragment `src/lib/i18n/dict/round26.ts` for the new aria labels, registered in `src/lib/i18n/index.tsx`. No Supabase, schema, auth, MCP, service worker or manifest changes.
