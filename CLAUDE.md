# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Forja (repo name "fitroute", internal name "Iron Logger") — a mobile-first AI strength-training and nutrition tracker built with TanStack Start (React 19, SSR). It's developed primarily through [Lovable](https://lovable.dev); commits pushed to the connected branch sync back into the Lovable editor, and Lovable's plan history lives in `.lovable/plan/*.md`.

**Do not rewrite published git history** (force-push, rebase/amend/squash already-pushed commits) — it breaks Lovable's sync and can lose the user's project history there.

## Commands

Package manager is **bun** (`bun.lock` is the lockfile; a strict text lockfile is enforced via `bunfig.toml`).

```sh
bun install
bun run dev          # vite dev server (TanStack Start SSR)
bun run build        # production build (nitro, cloudflare target by default)
bun run build:dev    # development-mode build
bun run preview      # preview a production build
bun run lint         # eslint .
bun run format       # prettier --write .
```

There is no test suite in this repo (no test script, no `*.test.*`/`*.spec.*` files).

## Architecture

### TanStack Start, not a Next/Remix-style app

File-based routing under `src/routes/`. See [src/routes/README.md](src/routes/README.md) for the routing conventions (`$param`, `{-$optional}`, `$.` splat, `_layout`, `__root.tsx`). `src/routeTree.gen.ts` is generated — never edit it by hand. Do not create `src/pages/` or Next/Remix-style directories.

- [src/routes/__root.tsx](src/routes/__root.tsx) is the only root shell: loads runtime Supabase config, injects it via an inline `window.__FORJA_SUPABASE__` script before the app bundle runs, sets up `LanguageProvider`/`QueryClientProvider`, PWA update toast, and Supabase auth-state → router/query invalidation.
- [src/routes/_authenticated/route.tsx](src/routes/_authenticated/route.tsx) is the auth gate (`ssr: false`, checks `supabase.auth.getUser()` in `beforeLoad`, redirects to `/` if unauthenticated). All real app screens live under `_authenticated/` (treino, dieta, progresso, perfil, rota, plano, biblioteca, buscar, importar, onboarding, etc.) — one file per tab/screen, matching bottom-nav tabs **Treino / Dieta / Progresso / Perfil**.
- [src/start.ts](src/start.ts) defines global server/function middleware (CSRF middleware for server-fn requests, an error middleware that renders a safe error page instead of leaking a raw 500, and `attachSupabaseAuth` which stamps the bearer token onto every server-fn call).
- [src/server.ts](src/server.ts) wraps the TanStack Start server entry to catch h3's swallowed in-handler throws (which otherwise surface as a bare 500 JSON body) and render `renderErrorPage()` instead.
- [vite.config.ts](vite.config.ts): most Vite/TanStack/Nitro plugins are supplied by `@lovable.dev/vite-tanstack-config` — **do not** add TanStack devtools, `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths`, or nitro plugins manually, that duplicates them and breaks the build. Also wires the `@lovable.dev/mcp-js` plugin and a PWA service worker (`generateSW`, app-shell/network-first for navigations, cache-first for static assets; server function responses are never cached).

### Data layer: mock-catalog + user overrides over Supabase, never direct DB access from components

`src/lib/data/*.ts` is the only layer components should import from (one file per domain: `exercises`, `routines`, `workouts`, `profile`, `body-weight`, `nutrition`, `meals.mock`, `week-menu`, `tracked-lifts`, `coaching`, `coach-notes`, `diet-entries`, `route`, `prices`, `claude-import`). Each exposes async functions with a stable signature. The built-in exercise/meal catalogs ship in `src/lib/data/mocks.ts`; per-user Supabase rows are merged on top (stored rows win by id) — see the `mergeCatalog` pattern in [src/lib/data/exercises.ts](src/lib/data/exercises.ts). Never import `mocks.ts` directly from a component.

Two parallel Supabase clients, never cross-import:
- [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts) — browser client. Lazily configured at runtime from `window.__FORJA_SUPABASE__` (injected server-side, see root route above), not build-time `VITE_*` vars. `supabase` is a `Proxy` so `supabase.auth.*` works before configuration completes.
- [src/integrations/supabase/client.server.ts](src/integrations/supabase/client.server.ts) — server-only admin client using the service role key (`SUPABASE_SERVICE_ROLE_KEY`). Never import this from a component; only from server-function handlers.
- [src/lib/db.server.ts](src/lib/db.server.ts) has `requireUserId()`: every server-side data handler resolves and scopes rows to this id from the request's bearer token.

File naming convention for server code (enforced by ESLint's `no-restricted-imports` against Next.js's `server-only` package, which this stack doesn't use):
- `*.server.ts` — server-only modules (throws if imported into client bundle).
- `*.functions.ts` — `createServerFn(...)` definitions callable from both client and server (e.g. [src/lib/supabase-config.functions.ts](src/lib/supabase-config.functions.ts)).

SQL migrations are plain numbered/named files under `scripts/` (`supabase-schema.sql`, `supabase-seed.sql`, `supabase-migration-*.sql`) — there's no migration framework, apply them manually against the user's own Supabase project.

### i18n: source-string translation, not keys

`src/lib/i18n/` translates literal English source strings (not opaque keys) via `t("Some English text")` / `tx(...)`. Dictionaries are split per feature area under `src/lib/i18n/dict/*.ts` plus numbered `roundN.ts` files (accumulated translation batches — the number has no other meaning) and merged in [src/lib/i18n/index.tsx](src/lib/i18n/index.tsx). Supported languages: `en` (identity/no dict), `pt`, `nl`. `useT()` is the main hook. ESLint's `react/jsx-no-literals` rule (warning-level) guards against raw user-visible strings bypassing `t()`/`tx()`, so all three languages stay in sync — respect it when adding UI text.

### Claude / MCP integration

This app exposes itself as an MCP server so a user can connect their own Claude to their Forja account:
- [src/lib/mcp/index.ts](src/lib/mcp/index.ts) defines the MCP server (`iron-logger`) via `@lovable.dev/mcp-js`, OAuth-issuer-authenticated, with tools `get_training_context`, `get_exercise_context`, `create_routine`, `create_week_diet`, `log_coach_note` (implementations in `src/lib/mcp/tools/*.ts`). `.lovable/mcp/manifest.json` mirrors this contract for tooling/documentation.
- [src/lib/claude-bridge.ts](src/lib/claude-bridge.ts) defines the fallback path when a user isn't OAuth-connected: Claude emits a `FORJA1.<base64 JSON>` code (routine/diet/note payload, zod-validated) that the user pastes into the app to import — see `encodeBridgeCode`/`decodeBridgeCode`. Keep this schema in sync with what the MCP tools actually write.
- `src/routes/[.mcp]/` and `src/routes/[.well-known]/` implement the MCP HTTP endpoints and OAuth-protected-resource discovery route respectively (bracket-named directories to escape TanStack Start's normal file-routing rules for dot-prefixed paths).

### AI "coach" and plan generation

`src/lib/coach/*` holds the rule-based adaptive coaching logic (recommendations, plateau detection, performance-drop detection, rest-day logic, weekly check-ins, today's-session card, etc.) — these are plain functions over workout/profile data, not LLM calls. `src/lib/plan/*` is the AI-assisted onboarding/interview plan generator (schema, guardrails, prompt construction, a `gateway.server.ts` that calls out to the model). Files ending `-ai.functions.ts` / `-ai.server.ts` at the top of `src/lib` (`nutrition-ai.*`, `plan-ai.functions.ts`, `route-ai.functions.ts`) are the server-fn/server boundary for those AI features.

### Path alias

`@/*` → `src/*` (see [tsconfig.json](tsconfig.json) and `components.json`). shadcn/ui components live in `src/components/ui/` (style "new-york", Tailwind CSS variables, no RSC) — prefer extending/composing these over introducing a new UI primitive library.
