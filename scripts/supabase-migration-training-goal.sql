-- Training-style goal (hypertrophy/strength/conditioning) on the profile.
--
-- Asked once in the first onboarding quiz and reused by the weekly plan
-- generator's evidence-based training-frequency guideline. Nullable: empty
-- means the user skipped that question, and the plan generator falls back
-- to today's behaviour (no goal-based day cap).
-- Run in the Supabase SQL editor. Safe to run more than once.

alter table public.profiles add column if not exists training_goal text;
