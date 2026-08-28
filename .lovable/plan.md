# MCP tools writing straight to your Supabase (no more FORJA1. paste)

## 1. Authentication — the answer that decides the design

**How a tool gets the user.** `defineTool({ handler })` receives a second argument, a `ToolContext` instance (`node_modules/@lovable.dev/mcp-js/dist/types-C0Wgm9zp.d.ts:95-117`). Real accessors: `isAuthenticated()`, `getToken()`, `getUserId()` (the token `sub`), `getUserEmail()`, `getClientId()`, `getScopes()`, `getIssuer()`, `getClaims()`. There is no request object and no helper import — identity arrives only through this argument. Current tools declare `handler: () => ...` and simply ignore it.

**Which authorization server.** The SDK is only a resource server: it validates bearer JWTs, publishes RFC 9728 metadata and returns 401 challenges; it does not implement `/authorize`, `/token`, DCR or consent (`README.md:72`). There is **no Lovable identity layer in the token path** — you choose the issuer yourself via `auth.oauth.issuer({ issuer, acceptedAudiences })`, and `issuer` must match the token `iss` exactly (`README.md:94`). So we point it at **your own external Supabase Auth**: `issuer: "<FORJA_SUPABASE_URL>/auth/v1"`, `acceptedAudiences: "authenticated"`.

Consequence, and this is the good news: `ctx.getUserId()` is the token `sub`, which is `auth.users.id` of your Supabase project — **the exact same value `requireUserId()` returns today** (`src/lib/db.server.ts:15-19` calls `db().auth.getUser(token)` and returns `data.user.id`). No identity mapping table is needed. Your tables store `user_id text`, already filled with that uuid string for real accounts.

**What is missing right now.** `src/lib/mcp/index.ts` has **no `auth` key**, so the server is currently public and every call arrives unauthenticated. `src/routes/mcp.ts` and `src/routes/[.well-known]/oauth-protected-resource.ts` are the generated handlers and are fine; `mcpPlugin()` is already in `vite.config.ts:19`. Beyond adding `auth`, the flow needs, outside of code:

- **Supabase**: enable the **OAuth 2.1 authorization server + dynamic client registration** in your own Supabase dashboard, then reconnect the project in Lovable. Lovable's `configure_oauth_server` only applies to managed Cloud; for bring-your-own Supabase this is your action and the docs are explicit that without it the protected integration cannot be built.
- **Lovable**: enable **More → Agent integrations** and choose "Protected with OAuth", and **publish** — the integration only exists for clients on the published app.
- **A consent route**: Supabase redirects the approving user to `/.lovable/oauth/consent?authorization_id=…`. That file does not exist in this repo (there is no `src/routes/[.]lovable.oauth.consent.tsx`). Without it, Claude's "connect" flow dead-ends. It also has to bounce unauthenticated visitors to your sign-in page, which here is `/` (`src/routes/index.tsx`), not `/login`.
- **A build-time issuer value**: the SDK reads no env and the MCP entry must stay import-safe, while your Supabase URL currently only exists as the server-side secret `FORJA_SUPABASE_URL` (handed to the browser at runtime via `window.__FORJA_SUPABASE__`, `src/routes/__root.tsx:93`). So we need the URL (or just the project ref) as a `VITE_`-prefixed build-time variable — your action to add. It is a public host, not a secret.

## 2. Reusing the existing data layer

The tools **cannot call the `createServerFn`s in `src/lib/forja.functions.ts`** as functions: each handler calls `requireUserId()`, which reads `getRequest()?.headers.get("Authorization")` — inside an MCP tool call that header is the MCP bearer, and `getRequest()` in that context is not the shape those handlers expect. Calling them over HTTP with `ctx.getToken()` would work but adds a self-request per tool.

Smallest correct change, and it does not duplicate any data logic: add one optional parameter to `requireUserId` in `db.server.ts`, e.g. `requireUserId(explicitToken?: string)` — when a token is passed it validates that token instead of reading the header, otherwise behaviour is byte-identical. Then MCP tools import `db()` plus the existing mappers (`toProfile`, `toExercise`, `toWorkout`, `toCoachNote`, `unwrap`, `uid`) from `db.server.ts` and reuse the **same queries** as the corresponding server functions. Writes reuse the same table/column shapes as `persistRoutine`, `persistPlannedMeals`, `persistCoachNote`.

If you would rather not touch `db.server.ts` at all, the alternative is a thin `src/lib/mcp/db.ts` that resolves the user with `db().auth.getUser(ctx.getToken())` and re-exports nothing else — five lines, zero changes to your protected files. **This is my recommendation**, since your standing rule protects `db.server.ts`; it duplicates only the token→uid call, not any data access.

## 3. Empty database — what to run

Verified in the repo:

- **(a) Yes.** `scripts/supabase-seed.sql` inserts the exercise library with the same ids as `mocks.ts`: `e1` Bench Press … `e43` Cable Crunch, all with `user_id = null` and `is_custom = false`, `on conflict (id) do nothing`.
- **(b) Yes, it conflicts.** The seed writes `user_id = 'demo'` for the profile (`p1`), routines (`r1`, `r2`) and the six workouts (`w1`…`w6`) — `scripts/supabase-schema.sql` even defaults `user_id text not null default 'demo'`. A real account's `user_id` is its auth uuid, so none of those demo rows will ever be visible to you once signed in. They are harmless leftovers, not blockers. Note `profiles.user_id` is `unique`, so `'demo'` occupies one row only.
- **(c) Practical order.** In the Supabase SQL editor: 1) run `scripts/supabase-schema.sql`, 2) run `scripts/supabase-migration-language.sql`, 3) run `scripts/supabase-seed.sql` but **only the `exercises` inserts** (lines with `insert into public.exercises`) — that gives you the 43-exercise library shared by all users via `user_id is null`, which `fetchExercises` already reads with `or(user_id.is.null,user_id.eq.<you>)`. Skip the profile/routine/workout/set/meal-plan demo rows, or run them and ignore them. 4) Sign up in the app; the app creates your profile row on first save. 5) Optional cleanup later: `delete from public.workouts where user_id = 'demo';` and the same for `routines`, `profiles`.

RLS detail worth knowing: RLS is on with no grants to `anon`/`authenticated`, and every read/write goes through the service-role key. So MCP tools inherit the same trust model — the tool authorizes the caller from the verified token and then scopes every query by that `user_id` itself. That scoping is the security boundary; it must be applied on every query with no exception.

## 4. Degradation

As you asked: no silent mock fallback. Every tool starts with `if (!ctx.isAuthenticated()) throw new ToolError(...)` carrying an actionable message ("This tool needs you to connect Iron Logger to Claude — reconnect the connector and approve access"). Read tools return the same error rather than mock libraries. The `FORJA1.` code path stays: `src/components/ClaudeBridgeSection.tsx` and the import field in Profile are untouched, and the write tools keep returning the code in their response text as a fallback **in addition to** having written the rows, so a partially-broken setup still degrades to paste-by-hand.

## 5. Implementation plan

**Step 0 — your actions, before code helps (blocking).**
- Enable OAuth 2.1 + DCR in your Supabase dashboard, reconnect the project in Lovable.
- Add `VITE_FORJA_SUPABASE_URL` (same value as `FORJA_SUPABASE_URL`).
- Enable More → Agent integrations (choose OAuth) and publish.
Risk: if Supabase OAuth 2.1 is unavailable on your plan/version, the whole design stops here — there is no sanctioned workaround (no service-role shortcut, no pasted session token).

**Step 1 — protect the server.** `src/lib/mcp/index.ts`: add `auth: auth.oauth.issuer({ issuer: \`${import.meta.env["VITE_FORJA_SUPABASE_URL"]}/auth/v1\`, acceptedAudiences: "authenticated" })`, keep the entry import-safe with a sentinel fallback, and rewrite `instructions` (no longer "nothing is written directly"). Then re-run the manifest extractor. Risk: low; a wrong issuer string shows up as 401 on every call.

**Step 2 — consent route.** New `src/routes/[.]lovable.oauth.consent.tsx` (literal-dot filename, `ssr: false`), using the existing browser client, redirecting unauthenticated visitors to `/` with the consent URL preserved and consumed after password sign-in, sign-up `emailRedirectTo` **and** the Google `signInWithOAuth` redirect. Risk: medium — the most common reason connecting silently fails; needs a live test with Claude.

**Step 3 — MCP data access.** New `src/lib/mcp/db.ts`: `requireMcpUser(ctx)` verifying `ctx.getToken()` against Supabase Auth and returning the uid, plus a thin re-export of `db()`/mappers. No change to `db.server.ts` or `forja.functions.ts`. Risk: low.

**Step 4 — `get_training_context` reads real data.** Rewrite `src/lib/mcp/tools/get-training-context.ts` to load, scoped to the uid: exercises (`user_id is null` or mine, including custom), profile (weight, height, goal, equipment, avoid list, session length, weekly target), last ~10 finished workouts with their sets, recent coach notes, and the meal library plus the user's meal schedule. Meals stay from `meals.mock.ts` only if that library is still static — I'll confirm while implementing whether meals live in a table. Risk: low (read-only); watch payload size, so cap rows and project few columns.

**Step 5 — write tools.** `create-routine.ts`, `create-week-diet.ts`, `log-coach-note.ts`: validate auth, validate that every `exerciseId`/`mealId` exists for this user, then write with the same table shapes `persistRoutine` / `persistPlannedMeals` / `persistCoachNote` use, returning what was written (ids, counts) plus the `FORJA1.` code as fallback. `create_routine` upserts by name so a re-run updates instead of duplicating. Annotations change to `readOnlyHint: false`. Risk: **highest** — these are the first MCP writes into real rows; mitigation is strict id validation, per-user scoping on every statement, and no deletes.

**Step 6 — verify.** Re-run the manifest extractor, typecheck/lint, then a live round trip from Claude on the published app: connect → approve → `get_training_context` → `create_routine` → confirm the rows appear in the app UI. Risk: needs Steps 0 done; nothing can be end-to-end verified from the editor sandbox alone.

**Untouched by this plan:** `src/lib/forja.functions.ts`, `src/lib/db.server.ts`, all SQL under `scripts/`, the service worker/manifest, and the Profile → Claude import section.
