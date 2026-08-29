# Profile screen cleanup

Frontend only. Single file touched: `src/routes/_authenticated/perfil.tsx` (plus new
i18n keys in `src/lib/i18n/dict/*` if strings change). No data layer, Supabase, auth,
MCP or service worker changes.

## 1. Photo: tap the avatar, nothing else

- Remove the "Add photo" / "Change photo" / "Remove photo" text links and the trash icon.
- The avatar itself becomes the only control: tap it to pick a new image. The small
  camera badge stays as the affordance hint.
- To clear a photo, long-press is not discoverable, so removal moves out of the header:
  keep it as a small "Remove" action that only appears in the avatar's own context —
  implemented as a tap-to-open tiny popover on the avatar when a photo exists
  (Change photo / Remove photo). With no photo, tapping opens the file picker directly.
  This keeps zero visual clutter in the header while removal stays reachable.

## 2. Header becomes photo-led and lighter

Current header stacks avatar + name + email + 2 links + 3 stat tiles + 4 tags — too much.
New header:

```text
┌──────────────────────────────────────┐
│  ┌────┐  Marcelo Alves              │
│  │ 📷 │  marcelo@email.com          │
│  └────┘                              │
│  78 kg · 180 cm · Bulking · 4x/week  │
└──────────────────────────────────────┘
```

- Avatar grows (size-16) and is the visual anchor.
- The three `Stat` tiles and the four `Tag` chips collapse into one single muted
  metadata line (weight · height · goal · weekly target). Same information, one row.
- Section-length/preferred-time chips drop from the header — they already live inside
  "Training model".

## 3. Fix the scrollbar look

The page is one long scroll with a default browser scrollbar. Fixes:

- Add a `scrollbar-gutter`-safe subtle scrollbar style scoped to the app (thin,
  transparent track, muted thumb) so it stops reading as a bright system bar.
- Reduce total page height so the bar is shorter: collapse the "App" section's
  nested blocks into a compact list (Language, Vibration, Import, Review onboarding,
  Get a plan, Claude, Account) instead of full-width stacked cards.

## 4. Extra improvements found while reading the screen

- **Sticky save bar overlaps content**: add bottom padding to the form so the last
  row is never hidden behind the "Unsaved changes" bar.
- **Only one section open at a time is unclear**: show a short value summary on each
  collapsed section header (e.g. Training model → "4x/week · 60 min · Evening") so the
  screen is scannable while collapsed.
- **Hardcoded English options**: `activityLevels`, `goals`, `sexes`, `times` labels are
  passed through `t()` already; verify all four exist in the pt/nl dictionaries and add
  the missing ones.
- **Language buttons also mark the form dirty**: pressing a language applies instantly
  but requires Save to persist; keep the behaviour, add the language row into the
  compact App list so it reads as a setting, not a form field.
- **A11y**: the avatar control gets an explicit `aria-label` that reflects state
  ("Change profile photo" / "Add profile photo").

## Out of scope

Body/goal, Training model, Limits & check-in field logic; macro math; anything server-side.
