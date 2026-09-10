-- Weekly meal selection behind the shopping list ("this week on the menu").
-- Optional: the app works local-first without this table and starts syncing
-- automatically once it exists.

create table if not exists public.week_menu (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  meal_id text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start, meal_id)
);

create index if not exists week_menu_user_week_idx
  on public.week_menu (user_id, week_start);

grant select, insert, update, delete on public.week_menu to authenticated;
grant all on public.week_menu to service_role;

alter table public.week_menu enable row level security;

drop policy if exists "week_menu owner read" on public.week_menu;
create policy "week_menu owner read"
  on public.week_menu for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "week_menu owner write" on public.week_menu;
create policy "week_menu owner write"
  on public.week_menu for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "week_menu owner update" on public.week_menu;
create policy "week_menu owner update"
  on public.week_menu for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "week_menu owner delete" on public.week_menu;
create policy "week_menu owner delete"
  on public.week_menu for delete to authenticated
  using (auth.uid() = user_id);
