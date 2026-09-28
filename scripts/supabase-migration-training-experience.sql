-- Training experience (beginner/intermediate/advanced), derived once from
-- onboarding or the plan interview and reused by the muscle-gain pace check
-- in plan/guardrails.ts (see the Aragon/Helms rate-of-gain model comment
-- there) — without it, every user was treated as "intermediate" by default.
-- Run in the Supabase SQL editor. Safe to run more than once.

alter table public.profiles add column if not exists training_experience text;
