# A better way to record effort (RPE)

Today the effort box sits next to the weight and reps, and tapping it opens a grid of numbers in rows and columns with no explanation. It is easy to ignore and hard to read. This changes it into a single line you slide along, shown at the right moment, with plain-language meaning for each value.

## What changes

**One horizontal scale, 6 on the left and 10 on the right**
- A single track with marks at 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10 — no grid.
- The chosen point is highlighted, the number shown large above the track, with a light tick of vibration as you move.
- Tap a mark or drag along the line; works with a thumb.

**It appears right after you tick a set**
- Ticking the check finishes the set and starts the rest clock straight away, then the scale slides up from the bottom.
- Choosing an effort closes it. There is a clear "Skip" so nothing is forced.
- Only for real working sets — warm-up sets tick through untouched.
- The effort box no longer needs its own tap; it stays visible on the row so you can still change or clear an effort later.

**Plain explanation of what each value means**
Shown under the scale, updating as you move:
- 10 — nothing left, could not have done another rep
- 9.5 — maybe one more rep
- 9 — one more rep for sure
- 8.5 — maybe two more
- 8 — two more for sure
- 7.5 — two to three more
- 7 — three more
- 6.5 — three to four more
- 6 — easy, four or more left

A short line at the top says why it matters: it is how the app decides your next weights and spots stalls.

**A switch in Profile**
- "Ask for effort after each set" — on by default. Turned off, the scale never pops up and you can still set effort by tapping the box on the row.

## Notes

- Frontend only; no database, no changes to how sessions are saved or to the rest timer logic. The pop-up is purely on top of the existing flow.
- New pieces: an effort scale component plus a slide-up sheet, reusing the existing drag-to-adjust and vibration helpers; the preference lives in local device settings alongside the other session preferences.
- All new wording added to the translation files for Portuguese and Dutch as well.
