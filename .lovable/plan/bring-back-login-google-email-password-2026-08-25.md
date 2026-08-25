# Bring back login (Google + email/password)

## What you get
- A real sign-in screen at `/` in English: "Continue with Google" plus email/password sign-in and sign-up.
- Every app screen (Home, Train, Session, Library, Progress, Profile, Diet) requires being signed in.
- Each account starts empty — the old `demo` rows stay in the database but are no longer reachable.
- Profile screen gets the signed-in email and a Sign out action.

## What you need to do in your own Supabase project
1. Authentication → Providers → enable **Google**, pasting a Google OAuth client ID/secret from Google Cloud Console.
2. In Google Cloud, set the authorized redirect URI to `https://<your-project>.supabase.co/auth/v1/callback`.
3. Authentication → URL Configuration → add both app URLs to redirect allow-list:
   - `https://gym-session-pro.lovable.app`
   - `https://id-preview--6348699b-3af7-46e0-9c05-163e356b7bc2.lovable.app`
4. Provide the project's **publishable (anon) key** — the browser needs it to hold a session. Today only the URL, service-role key and DB URL are configured, so I will ask for it through the secure secret form before wiring the client.

## Implementation

### 1. Browser Supabase client
`src/integrations/supabase/client.ts` currently reads `VITE_SUPABASE_*`, which are not set. Point it at the project's own values (`VITE_FORJA_SUPABASE_URL`, `VITE_FORJA_SUPABASE_PUBLISHABLE_KEY`, with the server names as SSR fallback), keeping session persistence and `detectSessionInUrl` on for the OAuth return.

### 2. Auth screen
- `src/routes/index.tsx` becomes the public sign-in page (replacing the redirect to `/inicio`), reusing `hero-login.jpg` and the existing dark/purple card style. Tabs for Sign in / Create account, plus a Google button calling `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- Already-signed-in visitors are sent to `/inicio`.
- Sign-up shows a "check your email to confirm" state (email confirmation is on by default in your project unless you disable it).

### 3. Route protection
- Add `src/routes/_authenticated/route.tsx` (`ssr: false`, `beforeLoad` → `supabase.auth.getUser()`, redirect to `/` when absent).
- Move `inicio`, `treino`, `sessao`, `biblioteca`, `progresso*`, `resumo.$id`, `rotina.$id`, `perfil`, `dieta*` under `src/routes/_authenticated/`. Paths stay identical (`/inicio`, `/treino`, …) so no internal links change.
- `__root.tsx` gets a single `onAuthStateChange` subscriber that invalidates the router and query cache on `SIGNED_IN` / `SIGNED_OUT` / `USER_UPDATED`.

### 4. Per-user data (replacing `DEMO_USER_ID`)
- `src/integrations/supabase/auth-middleware.ts` is updated to read the project's env names and to validate the bearer with the publishable key.
- `src/start.ts` gains `functionMiddleware: [attachSupabaseAuth]` so every server-function call carries the bearer token (CSRF and error middleware stay).
- Every server function in `src/lib/forja.functions.ts` gets `.middleware([requireSupabaseAuth])`, and each `user_id` filter/insert switches from `DEMO_USER_ID` to `context.userId`. Writes keep using the service-role client in `db.server.ts` (RLS stays fully closed to `anon`/`authenticated`), but the row owner is now the authenticated user id.
- `user_id` columns are `text` today, so Supabase UUIDs fit with no schema migration. `DEMO_USER_ID` is removed from `db.server.ts`.
- Profile bootstrap: on first fetch for a new user id, no profile exists → the existing "create default profile" path runs, so a fresh account lands on Profile setup with sensible defaults instead of empty screens.
- MCP/Claude bridge routes (`/mcp`, `/.mcp/*`) keep their own auth story unchanged in this pass.

### 5. Profile & sign out
Add an account row in `src/routes/_authenticated/perfil.tsx` showing the signed-in email and a Sign out button that cancels in-flight queries, clears the query cache, calls `supabase.auth.signOut()`, then navigates to `/` with history replace.

## Validation
- Build check plus a Playwright pass: unsigned visit to `/inicio` redirects to `/`, sign-up/sign-in with email works, a created routine persists and is only visible to that account.
- Google button is verified up to the provider redirect (the consent screen itself depends on step 1–3 above being finished in your Supabase/Google projects).

## Out of scope
- Password reset flow, other social providers, migrating the old `demo` data.
