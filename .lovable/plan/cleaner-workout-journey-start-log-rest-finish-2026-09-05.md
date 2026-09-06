# Cleaner workout journey: start → log → rest → finish

Goal: make the whole training flow feel calm and obvious on a phone — one decision at a time — without removing any feature you already rely on.

## What feels heavy today

- **Start**: on the Train screen up to three "start/resume" buttons can be on screen at once (unfinished-workout banner, coach card, and the Start/Blank pair). Tapping a routine while another workout is running silently resumes that other workout instead.
- **Logging**: each exercise card packs a drag handle, name, counters, progress bar, expand arrow, rest picker, plate calculator, progress badge, info button, coach button, warm-up chip and a 9-item menu. Up to three advice boxes can stack above the sets. Every checked set grows an extra unlabeled note field, and every exercise keeps an always-open note box.
- **Reordering** exists three ways at once (drag, move up/down, do this last), and "Remove exercise" sits in the same flat menu with no confirmation or undo.
- **Rest**: the timer bar only exists while resting, and the header timer icon shows a toast with a "Restart" action instead of just restarting.
- **Finish**: the same Finish button appears twice (header and bottom bar). The discard dialog says sets will be dropped but never shows which ones.
- **Summary**: records and the coach message are handed over through a one-shot local stash, so reopening the summary shows an empty page with no explanation.

## The plan

### 1. Quiet the exercise card
- One identity line: name, block tag, sets done / target reps, thin progress bar.
- Rest, plates, info and warm-up become one small action row; rare actions live in the menu only (removing today's duplicate warm-up chip).
- Merge the three advice boxes into a single coach line with the target, expandable for the reasoning.
- Note boxes become an "Add note" action instead of always-open fields.

### 2. Make the current set the hero
- Active set row gets bigger numbers and more space; completed sets shrink to a compact done line (weight × reps · effort).
- Check, hold-and-slide editing, typing and the effort scale keep working exactly as now.

### 3. One clear way to do each thing
- Reorder: keep hold-and-drag, and keep move up/down in the menu only as the accessible fallback; drop "do this one last".
- Group the exercise menu into sections and put Remove behind a confirm with an undo toast.
- Rest: keep the rest bar visible during the exercise (idle state shows the chosen length and a Start rest button); the header timer icon restarts directly instead of via a toast.

### 4. A clear rhythm between exercises
- When the last set of an exercise is checked, show a short "Exercise done — next: <name>" strip with a Next button that collapses the finished card and opens the next one.
- Chip row marks done / current / skipped more legibly.

### 5. Tidier start and finish
- Train screen: one primary action at a time — resume takes over when a workout is running, and routine cards show "Resume" instead of a misleading start.
- Session finish: the button shows what will be saved (sets · volume); the discard dialog lists the exact sets that would be dropped.
- Summary: when records or the coach message are no longer available, show a plain fallback instead of a blank space.

### 6. Polish pass
- Consistent tap sizes and spacing across the session screen; single visual language for rest bar, coach line and effort scale.
- Clearer paused-clock state on the timer itself.
- All new wording in English, Portuguese and Dutch.

## Technical notes

Frontend only — no Supabase, schema, auth, MCP or service-worker changes. Work stays in `src/routes/_authenticated/sessao.tsx` (extracted into smaller presentation components where it helps), `src/routes/_authenticated/treino.tsx`, `src/routes/_authenticated/resumo.$id.tsx`, session components under `src/components/`, plus a new i18n fragment registered in the dictionary index. Existing session state, rest timer, prescription, coach and RPE logic is reused unchanged: this is layout, hierarchy and flow, not new behaviour.
