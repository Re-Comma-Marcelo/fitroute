# 10 improvements — Iron Logger

Ten concrete improvements: one bug fix the user already hit, plus nine UX gaps I found reading the current screens. All are frontend-only except #1, which adds a graceful fallback to one server function (no Supabase changes needed).

## 1. Custom meal save: localStorage fallback (bug fix)

**Problem:** "Add a meal" fails entirely when the `custom_meals` table is missing. `persistCustomMeal` (`src/lib/forja.functions.ts:442`) uses `unwrap`, which throws on any error. Reads already tolerate this via `unwrapSoft` + `fetchCustomMeals().catch(() => [])`, but writes don't.

**Fix:** Make `persistCustomMeal` detect a missing-table error (`isMissingTable`) and return the meal object anyway (with a generated id), so `createCustomMeal` in `src/lib/data/nutrition.ts` can store it in the in-memory `customCache` + a localStorage backup. The meal appears in the diet list and shopping list immediately. When the user later runs the `custom_meals` migration, the next hydrate pulls the row from Supabase and the localStorage copy is superseded.

**Files:** `src/lib/forja.functions.ts` (persistCustomMeal → soft unwrap), `src/lib/data/nutrition.ts` (createCustomMeal fallback to localStorage).

## 2. Home diet card: show protein, not just calories

**Problem:** The home `DietCard` (`src/routes/_authenticated/inicio.tsx:384`) shows only kcal today vs target. Protein is the single most important macro for lifters and is already computed by `totalsFor`.

**Fix:** Add a one-line protein summary (`{eaten}g of {target}g protein`) under the calorie bar, in teal (diet color). Keep it compact — same card, one extra line.

**Files:** `src/routes/_authenticated/inicio.tsx` (DietCard), i18n dict.

## 3. Session: collapsed exercise shows last working weight

**Problem:** When an exercise card is collapsed (`aberto === false`), the header shows the progress bar and "X/Y sets · target 8-12 reps" — but not the weight you're actually lifting. You have to expand to recall where you are.

**Fix:** In the collapsed header, show the last completed valid set's weight×reps (e.g. "80 kg × 10") next to the set count. This is already available from the sets array. Keep it muted so it doesn't compete with the exercise name.

**Files:** `src/routes/_authenticated/sessao.tsx` (exercise header line ~1201).

## 4. Body weight: goal progress bar

**Problem:** `BodyWeightCard` shows the trend chart and pace text, but no visual bar from start weight → current → goal. The profile already has `pesoInicialKg` and `pesoMetaKg`.

**Fix:** Add a slim progress bar above the chart: a track from `pesoInicialKg` to `pesoMetaKg`, with a marker at the latest entry. Show the remaining distance as text (e.g. "3.2 kg to go"). When no goal is set, hide the bar.

**Files:** `src/components/BodyWeightCard.tsx`, i18n dict.

## 5. Diet week: mark training days

**Problem:** The week plan grid (`src/routes/_authenticated/dieta.week.tsx`) shows meal slots and calorie totals per day, but you can't tell at a glance which days are training days without reading the tag text.

**Fix:** Add a small dumbbell badge on the day header when that day has a training tag. The tags are already fetched (`getTrainingTags`). One icon, no text, muted unless today.

**Files:** `src/routes/_authenticated/dieta.week.tsx`, i18n dict.

## 6. Session: haptic on rest done

**Problem:** When rest finishes, a full-screen overlay and sound play, but there's no vibration. If the phone is in your pocket or face-down, you don't feel it.

**Fix:** Call `hapticTick()` inside `onRestExpired` when `live === true` (in `src/routes/_authenticated/sessao.tsx`), right before showing the overlay. The haptic fires alongside the audio.

**Files:** `src/routes/_authenticated/sessao.tsx` (one line in the `onRestExpired` callback).

## 7. Library: recent exercises quick-access row

**Problem:** When picking an exercise for a session or routine, the library opens to muscle-group folders. Recently-used exercises (already tracked in `getExerciseUsage`) aren't surfaced, so you scroll/search every time.

**Fix:** When `showFolders` is true and the user came from a session/routine pick (`para` is set), show a horizontal "Recent" row at the top with the 6 most-used exercises (from `getExerciseUsage`), each as a compact tappable chip. Tapping opens the detail as usual.

**Files:** `src/routes/_authenticated/biblioteca.tsx`, i18n dict.

## 8. Progress history: muscle group chips

**Problem:** The workout history list at the bottom of Progress (`src/routes/_authenticated/progresso.index.tsx:275`) shows routine name, date, duration, volume — but not which muscle groups were trained. You must tap each workout to see what you did.

**Fix:** Add a compact line of muscle-group chips under each history item, derived from the sets in `logQuery.data.sets` for that workout (using the exercise's `grupoPrimario`). Dedupe and cap at 4 groups + "+N". Keep it one line, muted.

**Files:** `src/routes/_authenticated/progresso.index.tsx`, i18n dict.

## 9. Diet: "Repeat yesterday" handles an empty day

**Problem:** The "Repeat yesterday" button (`src/routes/_authenticated/dieta.index.tsx:282`) calls `repeatYesterdayToToday()`. If yesterday had no planned meals, it still shows "Copied yesterday's meals into today." — misleading and useless.

**Fix:** Before calling, check if yesterday has any slots. If empty, change the toast to "Yesterday had no meals — copied your last planned day instead." and fall back to the most recent non-empty day (walking back up to 6 days). If no day in the window has meals, show "No recent meals to copy — plan a day first." and do nothing.

**Files:** `src/lib/data/nutrition.ts` (repeatYesterdayToToday → repeatLastPlannedDay), `src/routes/_authenticated/dieta.index.tsx`, i18n dict.

## 10. Macro breakdown sheet: show all four macros, not just kcal

**Problem:** `MacroBreakdownSheet` (`src/components/MacroBreakdownSheet.tsx`) top stats show only Eaten / Planned / Still-to-go in kcal. Protein, carbs and fat totals are nowhere in the summary, even though the user explicitly asked to "see where all the nutritional values come from."

**Fix:** Below the kcal stat row, add a compact P/C/F row: three small stats (Eaten protein / target, carbs / target, fat / target), each with a mini bar. The per-meal list below already shows macros — this completes the summary at the top.

**Files:** `src/components/MacroBreakdownSheet.tsx`, i18n dict.

---

## Technical notes

- All ten are frontend-only except #1, which softens one existing server function (`persistCustomMeal`) — no new tables, no Supabase changes, no new env vars.
- Each improvement reuses data already fetched by the screen (sets, profile, tags, usage) — no new queries or server functions.
- i18n: every new string goes into the EN dictionary with PT/NL translations, following the existing pattern in `src/lib/i18n/dict/`.
- Tap targets stay ≥44px; no new horizontal scroll on the session row.
- Order: #1 first (it's a bug the user already hit), then the rest in any order — they're independent.
