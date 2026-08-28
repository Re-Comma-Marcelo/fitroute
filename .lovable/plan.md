# Interview detail, clearer food plan, shopping prices

Four focused improvements. Frontend only — no Supabase or schema changes.

## 1. Experience question gets specific

Today the interview only asks Beginner / Intermediate / Advanced. Change it to:

- A "How long have you been training?" choice: less than 6 months, 6-12 months, 1-3 years, 3+ years.
- A short qualifier: how consistent the last 6 months were (barely trained / on and off / steady).
- The level (beginner / intermediate / advanced) is derived from those two answers and shown back as a read-only line ("That puts you around intermediate"), so the AI prompt still receives a level plus the raw years/consistency for more accurate programming.

## 2. Food plan section becomes scannable

In the plan review screen the diet block is one long stack of text. Restructure into:

- A macro header row: kcal, protein, carbs, fat as four small stat tiles with color accents.
- One collapsible row per meal slot (Breakfast, Lunch, Snack, Dinner): closed shows the meal name and its kcal/protein; open reveals the "why" text and ingredients.
- Coach notes and the sport-day note move into a single collapsible "Notes and adjustments" row.
- The consultation note stays visible as small footnote text.

## 3. More color on the plan page

Apply existing semantic tokens (primary, accent, muted, plus training/rest accents already used elsewhere) so the page is not uniformly grey:

- Day cards get a left accent bar tinted by type: gym, sport, rest.
- Macro tiles get distinct tinted backgrounds.
- Section headers get small colored icon chips instead of plain grey uppercase labels.

No new palette is introduced; only tokens defined in `src/styles.css`.

## 4. Shopping list price estimate

- Add a local estimated price table (price per unit per ingredient, with an aisle-level fallback) so every shopping item gets an approximate cost.
- Each list row shows a subtle estimated price next to the quantity.
- A summary line at the top shows the estimated total for the selected range, plus estimated remaining (unchecked items only).
- Clearly labelled as an estimate.

## 5. "Next 3 days" vs "Full week" showing the same list

Confirmed cause: "Full week" uses the Monday-to-Sunday week containing today, while plan activation only fills days from today onward. Today is Friday, so the remaining planned days in the week are roughly the same three days the other tab shows — hence identical lists.

Fix: make both ranges rolling from today — "Next 3 days" and "Next 7 days" — and show the covered day count and item count under the tabs so the difference is visible.

## Technical notes

- `src/routes/_authenticated/plano.tsx`: new training-history fields, derived level display.
- `src/lib/plan/types.ts` + `defaults.ts` + `prompt.ts`: carry years-trained and consistency into the intake and prompt; keep `experience` as derived value so existing schema/AI logic is unchanged.
- `src/components/plan/PlanReview.tsx`: collapsible meal rows, macro tiles, colored accents.
- New `src/lib/data/prices.ts`: static per-unit price estimates plus `estimateItemPrice()`.
- `src/routes/_authenticated/dieta.market.tsx`: rolling ranges, price column, estimated totals.
- `src/lib/i18n/dict/plan.ts` and `diet.ts`: new strings in EN/PT/NL.
