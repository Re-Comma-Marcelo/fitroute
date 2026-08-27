# AI Coaching Interview & Plan Generator

An optional "Get a plan" flow that interviews you, translates vague goals into numbers you confirm, and generates a weekly training routine plus diet guidance. It sits next to manual logging and scheduling — nothing existing gets blocked, replaced, or restructured.

## Entry points

- A dismissible "Get a plan" card on Home (Início), below the weekly goal card, above the routine list. Dismissing hides it for 14 days, then it comes back once — never nagging.
- A permanent "Get a plan" row in Profile, in a new "AI coach" section next to the existing Claude section.
- No route gate, no onboarding wall. Everything else in the app works exactly as today.

## The interview (5 steps)

A multi-step form at `/plano`, prefilled from your existing profile so most fields are already filled:

1. **You** — age, sex, height, current weight, and a more specific activity picture: daily activity outside sport (desk job / on your feet / physical work) instead of one vague slider.
2. **Goal** — either a target weight/body-comp number, or a free-text goal ("get lean", "look more athletic"), plus a timeline. Goals can also be sport-driven ("be faster in the pool", "last 3 boxing rounds").
3. **Training** — gym context (equipment from your profile picker, gym days per week, session length, experience level, injuries/limitations) **plus your other sports**: add each sport you do (boxing, football, swimming, running, climbing, anything else), with sessions per week, typical duration and intensity, and which weekdays they usually fall on.
4. **Your life & time** — how much time you actually have, so the plan fits your week instead of an ideal one:
   - total time you can give to training per week, and/or realistic minutes per day
   - per-weekday availability: which days are free, tight or blocked, and roughly which part of the day (morning / midday / evening)
   - life context that shapes recovery and eating: work or study pattern (shifts, nights, travel), commute, kids/care duties, typical sleep hours and wake/bed time, stress level right now
   - cooking reality: how much time you have to cook, how often you eat out or on the go, and your budget comfort
   - a free-text "anything else about my week" field
5. **Food** — allergies/restrictions, disliked foods, preferred foods.



Progress bar, back/next, answers kept in a draft so leaving and returning doesn't lose work.

## Goal translation and safety

For free-text goals the AI returns a concrete target weight range, a rough body-comp estimate, and a timeline in weeks. These are shown on a confirmation screen where you can accept or edit them — nothing is locked in silently.

If the requested pace is aggressive (roughly beyond 0.5–1% bodyweight per week), the screen shows the safer suggested pace as the default, explains why in one line, and lets you proceed knowingly. Requests that read as medically risky or as disordered-eating patterns get a short "talk to a professional" note instead of a compliant plan; that note also appears once, quietly, at the bottom of every generated diet plan.

## Generated plan

Two tabs on one review screen:

- **Training** — a weekly split that plans *around* your life and your other sports, not just the gym: your sport sessions and blocked days are fixed blocks in the week, gym days land only on days you said you have time, each session is sized to the minutes you actually have (short days get a compact session, not a skipped one), and total weekly load (gym + sport + work/sleep/stress) drives volume and rest days. Exercises come only from Iron Logger's existing library (so they start, log and progress like any other routine), with sets, rep ranges and rest times following standard strength / hypertrophy / endurance guidance for your goal. Where your sport implies it, the plan leans toward supporting work (e.g. rotational and shoulder work for boxing, single-leg and hip work for football) using mainstream guidance only. Each day carries a one-line "why" ("35 min on Tuesday because that's your tight evening — full session Saturday").
- **Diet** — daily calorie and macro guidance in general framing, sized to your *total* weekly activity including sports rather than gym sessions alone, plus meal suggestions per slot pulled from the existing meal library and matched to your preferred foods, your meal-timing template, and your real cooking time (quick or no-cook options on busy days, batch-friendly ideas when you said you have little time, on-the-go options when you eat out). Sport days get slightly higher carb guidance than rest days. Allergies and dislikes are hard filters applied in code after generation, not just prompt instructions.



## Approve, feedback, edit

- **Approve** — the training plan is saved as a real routine (same tables the manual editor uses, so it appears in Train/Rotina and can be edited there), and the diet plan writes into the existing week meal plan and meal schedule.
- **Feedback** — a text box ("too many gym days", "I hate this meal", "make it easier") regenerates a new version with the feedback applied.
- **Edit** — before approving, you can change sets/reps/rest and swap exercises or meals inline; after approving, the normal routine editor and diet week screens take over at full parity.
- **Version history** — a compact list of versions with a one-line diff summary ("v2: 4 days → 3 days, dropped overhead press").

## Generic data import

A "Paste from another app" panel inside the plan section: paste text or notes from a previous app, and the AI parses what it recognizes (past sessions, routines, bodyweights) into Iron Logger's format. A review table shows every parsed row with the ability to drop or fix individual rows before anything is written. No Apple Health / MyFitnessPal integrations.

## Storage

Goals, generated plan versions, feedback and imports are kept locally on the device for now, per your choice. Approved plans are written through the existing Supabase-backed routine, meal-plan and workout paths — a generated plan and a hand-built one are stored identically. When you want the goal/plan history in the database later, it is one migration script plus swapping one storage module.

## Technical notes

- Enable Lovable AI and add server functions in `src/lib/plan-ai.functions.ts`: `translateGoal`, `generatePlan`, `regeneratePlan`, `parseImport`. Model: `google/gemini-3.7-flash` via `/v1/chat/completions` with strict JSON-schema structured output; `LOVABLE_API_KEY` read inside each handler. Gateway errors (402/403/429) surface as real messages in the UI.
- Prompts receive the exercise and meal libraries as allowed ids (same approach as `src/lib/mcp/tools/get-training-context.ts`); any id outside the library is dropped in validation.
- New zod contracts in `src/lib/plan/schema.ts` reusing `routinePayloadSchema` / `dietPayloadSchema` shapes from `src/lib/claude-bridge.ts`, so approval can reuse `applyImport` in `src/lib/data/claude-import.ts`.
- New files: `src/routes/_authenticated/plano.tsx` (interview + review), `src/lib/plan/store.ts` (localStorage: goals, versions, feedback, imports), `src/lib/plan/sports.ts` (sport catalogue with weekly load/intensity weights used for volume and calorie sizing), `src/lib/plan/life.ts` (per-weekday time budget, sleep/stress/work pattern and cooking-time model that constrains session length, weekly volume and meal complexity), `src/lib/plan/guardrails.ts` (pace sanity check, allergy/dislike filtering, time-budget feasibility check), `src/components/GetAPlanCard.tsx`, `src/components/SportsPicker.tsx`, `src/components/WeeklyTimePicker.tsx`, `src/components/PlanReview.tsx`, `src/components/PlanImportPanel.tsx`.
- Touched files: `src/routes/_authenticated/inicio.tsx` (dismissible card), `src/routes/_authenticated/perfil.tsx` (AI coach section), `src/lib/i18n/dict/` (new fragment for EN/PT/NL copy).
- No changes to Supabase schema, existing server functions, or navigation structure.
