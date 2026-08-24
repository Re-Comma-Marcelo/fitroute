# Connect Claude to Forja (MCP) + Profile settings

Goal: you open your own Claude chat, ask it to build a training routine or a week of meals, and the result lands in Forja. No backend, no database — the app keeps using the local mock/localStorage layer.

## How the bridge works

The MCP server runs on the app's server side, so it cannot see your browser's local data directly. So the flow is two short copies:

```text
Forja Profile → "Copy my training context"  →  paste into Claude
Claude (uses Forja MCP tools) → returns a Forja code  →  paste into Profile → Import
```

Claude gets the app's real exercise library and meal library through MCP tools, so what it builds is always made of items Forja already knows how to render, with sets, reps, rest, and macros validated before it comes back.

## 1. Profile → new "Claude / AI assistant" section

- Connection card: the MCP server URL plus short instructions for adding it in Claude (Settings → Connectors → add custom connector). Copy button.
- "Copy my training context": copies a compact text block of your profile — equipment, exercises to avoid and why, session length, preferred time, weekly target, goal, recent sessions and recent coach notes — to paste into Claude so it plans with real context.
- "Import from Claude": a paste box + Import button. It accepts the code Claude returns, shows a preview (routine name and exercises, or the week's meals), and applies it on confirm. Invalid or unknown items are reported instead of silently dropped.
- Imports write through the existing `src/lib/data/` functions (routines, nutrition plan, coach notes) so everything shows up on Train, Diet and Home immediately, and survives reloads the same way the rest of the app does.

## 2. MCP tools Claude gets

- `get_training_context` — explains what Forja tracks and how to read the pasted context block; returns the exercise library (name, muscle group, equipment) and the meal library (name, slot, macros, tags) so Claude only picks real items.
- `create_routine` — Claude proposes a routine (name, description, ordered exercises with target sets, rep range, rest, notes). Validated against the library and returned as an import code plus a human-readable summary.
- `create_week_diet` — Claude fills the week's meal slots (respecting your active meal timing template and training-day tags). Same output shape: import code plus summary.
- `log_coach_note` — Claude turns "my shoulder has been sore" into a check-in/observation note code you import; the existing coach grounding then references it on Train.

Each tool returns both the code and a plain-language summary, so Claude can explain its plan in chat and you decide before importing.

## 3. Access

The MCP server holds no personal data — its tools only read the app's built-in exercise/meal libraries and validate plans, and nothing writes to your account. So it can ship without login. Before building, I'll confirm that choice with you explicitly, since a no-login server means anyone with the URL can call those tools.

## Technical notes

- `@lovable.dev/mcp-js` with `mcpPlugin()` in `vite.config.ts`; tools in `src/lib/mcp/tools/`, registered in `src/lib/mcp/index.ts`. Generated routes are left alone.
- Import codes are versioned, zod-validated JSON (base64) — one schema shared by the MCP tools and the Profile importer, so a malformed paste fails cleanly with a reason.
- New files: `src/lib/mcp/*`, `src/lib/claude-bridge.ts` (encode/decode + context export), `src/components/ClaudeBridgeSection.tsx`. Touched: `src/routes/perfil.tsx`, `vite.config.ts`, and a small applier in `src/lib/data/`.
- Claude can reach the server only after the app is published; I'll point that out at the end.

## Not in this pass

No in-app chat with Claude, no live two-way sync, no auto-apply without your confirmation.
