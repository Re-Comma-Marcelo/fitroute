# Route — home preview + "Mijn Route" page

Your goal becomes a visible path: a curved line with checkpoints between where you started and where you want to be. It gets its own place in the bottom bar (labelled **Route**), and the coach starts talking about those checkpoints instead of about progress in the abstract.

## What changes on the home screen

- The square consistency grid is replaced by a **Route preview card** in the same spot: a short piece of the curved line, your current position (filled purple, slow pulse), and the next checkpoint with its title and date ("Next: Bench press 60 kg — Oct 12").
- Tapping the card opens the Route page. No edit controls on the card.
- No route yet: "No route yet. Once you set a goal, your coach will map out checkpoints along the way." with a pill button "Set your goal".
- Everything else on the home screen stays exactly as it is, including the weekly check-in, coach notes and the diet summary.

## The new page

Bottom bar item, same icon and position, now labelled **Route**, opens the new page with two tabs in the app's existing segmented style:

- **Route** — the full path: start marker (start date and starting stats), checkpoints along the curve, end-goal flag, an entry to your progress photos, and a "+" to add a checkpoint.
- **Progress** — today's progress view moved here unchanged (charts, records, key lifts, body weight, calendar). No redesign.

Old links to the progress page keep working; they land on the Progress tab.

### Checkpoint states

Achieved: filled purple. Current: filled purple, slightly bigger, slow pulse. Upcoming: outline, muted grey. Missed or moved: outline with a thin diagonal line, never red.

### Tapping a checkpoint

A bottom sheet with title, target date, status, date achieved, and — when the coach moved it — one sentence explaining why ("Moved back one week — you were recovering from cross-training load."). Pencil icon to rename, reschedule or remove; add a progress photo from here when this month has none yet. AI-suggested and self-made checkpoints edit the same way.

## Monthly progress photo

- Once per calendar month, if no photo yet, the coach adds a card to Coach Notes: "It's been a month since your last progress photo. Want to add one to your route?" Dismissible, never blocking, doesn't come back until next month.
- On upload you always choose: **Just for me** or **Share with my coach**. The photo is stored either way; only that choice controls whether the coach may use it later. Reading photos with AI is not part of this build.
- The photo attaches to the nearest checkpoint by date, otherwise just to the month.
- Confirmation is calm: "Saved to your route."
- "Progress photos" on the Route tab opens your own timeline, newest first — always all of your photos, whatever you chose per photo.

## How this ties into the coach you already have

- **Weekly check-in**: the first question becomes checkpoint-aware ("You're aiming for Bench press 60 kg by Oct 12 — still realistic, or should we move it?"), and the answer feeds straight into moving that checkpoint.
- **Coach Notes**: photo reminders, "you reached a checkpoint" and "I moved this checkpoint" all use the existing coaching-events mechanism — no second notification system.
- **In-workout chat and exercise chat**: the nearest checkpoint is added to the context the coach already receives, so a swap answer can mention the effect on it. No new screens.
- **Cross-training, performance drop and plateau signals**: one shared context builder feeds both checkpoint generation and the decision "moved" versus "missed".
- **Post-workout message**: may mention checkpoint proximity when it's genuinely relevant, not every time.

## Checkpoints and your goal

One main goal: the bodyweight/date goal in your profile plus a strength target. When you set or change it, the coach proposes checkpoints between today and the goal date. Spacing is a fixed rule — roughly monthly for goals two months out or more, every one to two weeks for shorter goals — the coach only decides what each checkpoint measures. Suggested checkpoints become "edited by you" the moment you change one.

## What you need to do in Supabase

Nothing right away: the route, checkpoints and reminders work on this device immediately and start syncing once you run the setup. I'll add one SQL script for you to run in the Supabase SQL editor, plus one storage bucket named `route-photos` for the photos (photos need the bucket, so until then photo upload stays on this device).

## Technical section

Data and backend:

- New `scripts/supabase-migration-route.sql`: `route_checkpoints` (id, user_id, title, description, target_date, order_index, status, source, adjustment_reason, achieved_at, created_at, updated_at) and `route_progress_photos` (id, user_id, checkpoint_id nullable, photo_path, taken_at, visible_to_ai, created_at). Both with grants for `authenticated`/`service_role`, RLS enabled and `auth.uid() = user_id` policies, plus storage policies for a private `route-photos` bucket keyed on the user's folder. `coaching_events.kind` is free text, so `monthly_photo_reminder` and `checkpoint_*` need no schema change.
- Server functions in `src/lib/forja.functions.ts` following the existing tolerant pattern (`isMissingTable` → return empty/null) so nothing crashes before the script runs; `src/lib/data/route.ts` mirrors `data/coaching.ts` with a localStorage cache and fallback.
- `src/lib/route/` holds the pure logic: `cadence.ts` (deterministic spacing), `status.ts` (achieved/adjusted/missed evaluation against workouts and sets), `context.ts` (shared coach context: goal, plan, history, cross-training, drop/plateau signals) reused by checkpoint generation, weekly check-in and the chat payload, and `path.ts` (SVG curve geometry from N checkpoints).
- `src/lib/route-ai.functions.ts`: `generateCheckpoints` and `explainAdjustment` through the existing `plan/gateway.server.ts` (`generateJson` + Zod schema), same error handling as `plan-ai.functions.ts`.

UI and routing:

- New `src/routes/_authenticated/rota.tsx` (layout with segmented tabs), `rota.index.tsx` (Route tab), `rota.progresso.tsx` (Progress tab). The current body of `progresso.index.tsx` moves to `src/components/progress/ProgressView.tsx` untouched and is rendered by the Progress tab; `progresso.index.tsx` becomes a redirect to `/rota/progresso`, and `progresso.$id.tsx` stays where it is.
- `BottomNav.tsx`: the fourth item points to `/rota` with label `Route`.
- New components: `RoutePreviewCard.tsx` (home), `RoutePath.tsx` (SVG path and markers), `CheckpointSheet.tsx`, `CheckpointEditSheet.tsx`, `ProgressPhotoSheet.tsx` (picker + visibility choice, compressed via the existing `lib/photo.ts`), `ProgressPhotoGallery.tsx`.
- `inicio.tsx`: `HeatmapSection` is replaced by `RoutePreviewCard`; the heatmap keeps living on the Progress tab.
- Existing touch points edited minimally: `WeeklyCheckInCard.tsx` (checkpoint-aware first question + write-back), `CoachNotesCard.tsx` (new kinds + labels), `coach/chat.ts` and the exercise/session chat context (add checkpoint), `lib/types.ts` (`Checkpoint`, `ProgressPhoto`, coaching kinds), plus a new i18n fragment with English, Portuguese and Dutch.
- Styling uses the existing tokens only (`primary`, `surface-1/2/3`, `muted-foreground`), rounded cards, pill buttons, no confetti, badges or sound.
