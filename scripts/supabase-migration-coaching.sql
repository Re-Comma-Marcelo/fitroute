-- Adaptive coaching layer: detection events, cross-training, in-session chat
-- and a per-set note for the coach.
-- Run this once in the SQL editor of your Supabase project.
--
-- All access happens through server functions using the service role key, so
-- the anon/authenticated roles get no direct privileges (same pattern as
-- body_weight_log and custom_meals).

-- Every adaptive coaching message the app produced, with the context it used.
create table if not exists public.coaching_events (
  id text primary key,
  user_id text not null,
  kind text not null,                 -- performance_drop | inactivity_checkin | post_workout | chat_swap
  exercise_id text,
  workout_id text,
  cause text,                         -- cross_training | pattern | none | ...
  detail jsonb not null default '{}',
  message text not null default '',
  user_reply text,
  created_at timestamptz not null default now()
);

create index if not exists coaching_events_user_id_idx
  on public.coaching_events (user_id, created_at desc);

grant all on public.coaching_events to service_role;
revoke all on public.coaching_events from anon, authenticated;
alter table public.coaching_events enable row level security;

-- Non-lifting activity (run, football, bike, walk) used as a plausible cause
-- for a performance drop.
create table if not exists public.cross_training_logs (
  id text primary key,
  user_id text not null,
  kind text not null,                 -- run | sport | bike | walk | other
  data text not null,                 -- ISO date (YYYY-MM-DD)
  duracao_min integer not null default 0,
  intensidade text not null default 'moderate',
  nota text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists cross_training_logs_user_idx
  on public.cross_training_logs (user_id, data desc);

grant all on public.cross_training_logs to service_role;
revoke all on public.cross_training_logs from anon, authenticated;
alter table public.cross_training_logs enable row level security;

-- Coach chat history (home check-ins and in-workout questions).
create table if not exists public.coach_chat_messages (
  id text primary key,
  user_id text not null,
  workout_id text,
  exercise_id text,
  role text not null,                 -- user | coach
  content text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists coach_chat_messages_user_idx
  on public.coach_chat_messages (user_id, created_at);

grant all on public.coach_chat_messages to service_role;
revoke all on public.coach_chat_messages from anon, authenticated;
alter table public.coach_chat_messages enable row level security;

-- Short free-text note the user attaches to a logged set.
alter table public.workout_sets
  add column if not exists coach_note text not null default '';
