# Why "Map my route" is greyed out — and the fix

## What's wrong

The Route page only offers to map your route once it knows **two** things: what your goal is, and **by when**. The "by when" date has no place in the app where you can enter it — it exists in the data model but no screen ever asks for it. So the button stays disabled forever, with the hint "Set a goal and a target date in your profile" pointing at a field that isn't there.

Two smaller problems found in the same code path:

1. The language of the generated checkpoint texts is passed under the wrong name, so the coach may write your route in English even when the app is in Dutch.
2. Mapping the route a second time adds a second set of checkpoints on top of the first instead of replacing it.

## The fix

### 1. A goal you can actually set

Add a **Goal** block, in two places that share one piece of UI:

- **Profile** — a small section with: target date (date picker), and target body weight (optional, since the app already reasons about it but never lets you type it). Your goal type (build muscle / lose fat / maintain) already lives in Profile and stays where it is.
- **Route page, empty state** — instead of a dead hint, an inline "Set my goal date" that opens the same block, so you can start your route without hunting through Profile.

Saving writes to your profile as usual. If your Supabase doesn't have those two columns yet (they came with a migration you may not have run), the save falls back to this device so the Route still works — same pattern the app already uses for checkpoints and photos.

### 2. Sensible guard rails on the date

- Must be in the future, and at least ~10 days out (below that there's no room for checkpoints — today the button just fails silently with "too short").
- If the date is too close, say so under the field instead of failing after the tap.
- A quick-pick row (3 months / 6 months / 1 year) next to the picker.

### 3. Re-mapping replaces, not stacks

"Map my route" on an existing route asks for confirmation and then replaces the coach-suggested checkpoints, keeping any you added or edited yourself.

### 4. Language fix

Pass the interface language under the name the generator expects, so checkpoint titles and notes come back in Dutch, Portuguese or English to match the app.

## Technical notes

- `Profile.metaPrazo` / `pesoMetaKg` exist in `src/lib/types.ts` and are mapped both ways in `db.server.ts`, but no route edits them. New `GoalSection` component used by `perfil.tsx` and by `rota.index.tsx`'s empty state.
- Profile save wrapped so a `PGRST204`-style missing-column error degrades to a localStorage overlay merged on read in `src/lib/data/profile.ts`, rather than throwing.
- `checkpointDates()` returns `[]` under 10 days; surface that as validation before enabling the button.
- `rota.index.tsx` generation payload: send `language: lang` instead of `lang` (`generateCheckpoints` reads `data.language`).
- Re-map: delete existing `source === "ai_suggested"` checkpoints before saving the new set.
- New strings added to the round28 dictionary in English, Portuguese and Dutch.
- Frontend only; no Supabase changes and no new migration in this round.
