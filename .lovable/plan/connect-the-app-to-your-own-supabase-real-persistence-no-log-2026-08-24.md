# Connect the app to your own Supabase (real persistence, no login yet)

Answering the question first: that line in the previous plan only described the Progress redesign — it read from the in-memory mock, so it changed no database. This plan replaces the mock with your real Supabase project. The Progress redesign comes after, unchanged in scope.

## What "connected" means here

Every screen reads and writes real rows in your Supabase project: profile, exercises, routines, workouts, sets, coach notes, nutrition (meals, week plan, market list, meal schedule) and tracked lifts. Nothing lives in `localStorage` or `mocks.ts` afterwards, except the in-progress session timer state (that stays local by design, then saves to the DB when you finish).

Because we're keeping open access (no login), all database access goes through the server, acting as one fixed demo user. Nothing is exposed to the browser: the browser only ever calls our own server functions.

## Steps

1. **Credentials** — I'll ask you for your Supabase project URL, publishable (anon) key and service-role key, and store the keys as secrets. Nothing goes into the source code.
2. **Schema** — Finish `scripts/supabase-schema.sql` so it covers everything the app now has (the existing file predates the nutrition module, coach notes, body-goal fields and tracked lifts). Every table gets grants + RLS as already written. You run this file once in your Supabase SQL editor; I'll walk you through it and then verify from the app side.
3. **Seed** — A second SQL file inserts the demo user row, the 42-exercise library, the starter routines, the 22 meals and the existing sample workout history, so the app opens with the same content it has today instead of empty screens.
4. **Data layer swap** — Each module in `src/lib/data/` (`profile`, `exercises`, `routines`, `workouts`, `coach-notes`, `nutrition`, and a new `tracked-lifts`) keeps its exact current function signatures but calls server functions instead of mocks. Because screens only ever import from `src/lib/data/`, no route or component logic changes.
5. **Local → DB migration of what you already have** — Nutrition week plan, market list, meal schedule and coach notes currently live in `localStorage`. On first load the app pushes any existing local data up once, then reads from the DB.
6. **Verify** — I'll click through Home, Train, a full logged session, Diet (Today/Week/Market) and Profile against the real database, and confirm rows land correctly.

## Technical notes

- Reads/writes go through `createServerFn` in `src/lib/*.functions.ts`; the service-role client is imported inside each handler (`await import("@/integrations/supabase/client.server")`), never at module scope, so nothing server-only reaches the browser bundle.
- A single `DEMO_USER_ID` constant scopes every query, so switching to real auth later is a swap of that constant for `context.userId` plus adding `requireSupabaseAuth` — the queries themselves stay identical.
- RLS stays enabled on every table with owner-scoped `auth.uid()` policies. `anon` gets no grants: with open access the browser never talks to Supabase directly.
- `src/integrations/supabase/auth-middleware.ts`, `auth-attacher.ts` and `src/hooks/use-auth.ts` stay in place unused, ready for when you turn login back on.
- `src/lib/data/mocks.ts` shrinks to the seed source used by step 3 and is no longer imported by the app.

## Known trade-off

Open access + a fixed demo user means anyone with the app URL reads and writes the same data. That's fine for development; re-enabling auth is the fix and the code is structured for it.

## Not in this pass

The Progress screen redesign (trend chart, deltas, consistency line, plateau coach card, key lifts) — that's the next pass, on top of real data.
