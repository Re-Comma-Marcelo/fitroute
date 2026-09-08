# Real in-app AI coach chat + keep the Claude MCP connector

## Goal
Turn the in-app "Coach" chat from rule-based keyword matching into a real
streaming AI conversation powered by the Lovable AI Gateway, and keep the
existing external Claude-MCP connector flow. One conversation per user,
synced to Supabase (`coach_chat_messages`), with the localStorage fallback
that already exists so it works even before the migration is applied.

## Background / current state (verified)
- `LOVABLE_API_KEY` is provisioned (managed secret).
- `src/lib/plan/gateway.server.ts` already calls the Lovable AI Gateway via
  `@ai-sdk/openai-compatible` (Gemini) — reused as the provider helper pattern.
- `src/components/CoachChatSheet.tsx` (Home entry) and
  `src/components/SessionCoachSheet.tsx` (in-workout entry) both call
  `askCoach()` in `src/lib/coach/chat.ts` — pure keyword/heuristic, no LLM.
- `src/lib/data/coaching.ts` already has `getCoachChat()` / `saveCoachChat()`
  backed by the `coach_chat_messages` Supabase table with a localStorage
  fallback. The table migration lives in `scripts/supabase-migration-coaching.sql`.
- MCP server (`src/lib/mcp/`) exposes tools to external Claude; the
  `ClaudeBridgeSection` Profile flow (copy URL → add connector → paste
  `FORJA1.` code) is built and working.
- Installed: `ai`, `@ai-sdk/openai-compatible`. NOT installed: `@ai-sdk/react`
  (for `useChat`) and `@ai-sdk/openai` (for the Responses API path).

## What changes

### 1. Install client chat deps
`bun add @ai-sdk/react` and `@ai-sdk/openai` (the Responses API path for the
default chat model). Add to `bunfig.toml` `minimumReleaseAgeExcludes` only if
the supply-chain guard blocks them.

### 2. Shared gateway provider helper
Create `src/lib/ai-gateway.server.ts` with the canonical
`createLovableAiGatewayProvider` helper (from the `ai-sdk-lovable-gateway`
knowledge). `src/lib/plan/gateway.server.ts` keeps its own minimal provider for
plan generation unchanged; the new chat path uses the shared helper.

### 3. Streaming chat server route — `src/routes/api/chat.ts`
- `POST` handler: read `LOVABLE_API_KEY` inside the handler; build the provider;
  call `streamText` with the **`openai/gpt-6-astra`** model via the gateway
  Responses API (per `ai-responses-api` knowledge; reasoning effort `low`).
- Convert incoming `UIMessage[]` with `convertToModelMessages` and forward.
- Return `result.toUIMessageStreamResponse({ originalMessages, onFinish })`.
- The system prompt / grounding context is supplied by the client as the
  first system message (see step 4) — the route stays simple and does not need
  to resolve auth server-side, because the context is the user's own training
  data they already see in the app.
- Surface gateway errors per `ai-gateway-error-semantics`: only 429/5xx may
  retry with bounded backoff inside the route; 400/401/402/403 are terminal
  and pass through to the client as a clear error.

### 4. Refactor `CoachChatSheet` ChatPanel → real streaming chat
- Replace `askCoach()` with AI SDK `useChat` (from `@ai-sdk/react`) pointed at
  `/api/chat` via `DefaultChatTransport`.
- On open, load history with `getCoachChat()` and seed `messages`.
- Build a compact **grounding system message** client-side from: profile
  (goal, equipment, avoids, weekly target), today's plan
  (`getTodayPlan()`), recent coach notes, and — when scoped to an exercise —
  the exercise tips/last&best label/stalled flag. Reuse the existing data
  layer + react-query already wired in these components.
- `onFinish`: persist the user message and assistant reply to
  `coach_chat_messages` via `saveCoachChat()` (fire-and-forget with the
  existing localStorage fallback).
- Keep `askCoach()` heuristic as a **fallback only** when a terminal gateway
  error (401/402/403) occurs or the key is missing: show a small "offline
  coach" notice and answer from the heuristic so the chat never dead-ends.
- Render `message.parts` (text), show a typing indicator while
  `status === "submitted"`, keep the input focused, auto-scroll.

### 5. Refactor `SessionCoachSheet` → same `/api/chat` streaming
- Exercise-scoped system context (exercise name, instructions, last/best set,
  stalled flag) sent as the grounding system message.
- **Swap suggestions stay rule-based** — they are a DB filter
  (same primary muscle, not avoided, not already in session, equipment match),
  not an LLM call. Keep returning the candidate `Exercise[]` buttons.
- Persist to `coach_chat_messages` with `workoutId`/`exerciseId` via
  `saveCoachChat()` on `onFinish`.

### 6. Keep + polish the external Claude MCP connector
- No structural change to the MCP server or `ClaudeBridgeSection`.
- Light copy polish so the Profile section makes the two-way nature explicit:
  "Talk to Claude in your own chat → it writes into this app" (MCP) vs
  "Talk to the coach inside the app" (the new AI chat). Add one line noting the
  in-app coach is now a real AI conversation.

### 7. No Supabase schema work required
- `coach_chat_messages` migration already exists in
  `scripts/supabase-migration-coaching.sql`. The data layer's localStorage
  fallback means the chat works now, even while you have no Supabase access;
  once you run the coaching migration, messages sync across devices
  automatically. I will not touch Supabase.

## Technical notes
- Model: `openai/gpt-6-astra` (enforced default) via the gateway Responses API.
- Keep `LOVABLE_API_KEY` server-side only; never expose to browser code.
- Conversation shape: **one conversation** (no threads, no thread route) per
  the chosen history option — single persisted message list per user.
- The `coach_chat_messages` AI SDK message ids are strings; store them only if
  needed for dedupe — the table's own UUID `id` is the primary key (already
  the case in the existing `persistCoachChat`).
- Translations: add the few new UI strings (e.g. "offline coach", error
  notices) to the i18n dictionaries (en/pt/nl).

## Acceptance checks
- Home "Coach" button opens a real streaming AI conversation; replies appear
  token-by-token.
- In-workout "Ask coach" streams real answers scoped to the current exercise;
  swap buttons still work.
- Messages persist: reload the Home coach and the previous exchange is there
  (Supabase when the migration is applied, localStorage otherwise).
- Terminal gateway errors surface a clear message and fall back to the
  heuristic coach instead of dead-ending.
- External Claude connector flow still works unchanged.
- `bunx tsgo --noEmit` passes; build is OK.
