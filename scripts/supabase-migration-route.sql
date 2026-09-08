-- Route feature: checkpoints between today and the user's main goal, plus
-- progress photos. Run this in the Supabase SQL editor of your own project.
-- Until it runs, the app keeps the route on the device (localStorage).

create table if not exists public.route_checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date date not null,
  order_index int not null default 0,
  status text not null default 'upcoming',
  source text not null default 'user_created',
  adjustment_reason text,
  achieved_at date,
  metric jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.route_checkpoints to authenticated;
grant all on public.route_checkpoints to service_role;

alter table public.route_checkpoints enable row level security;

drop policy if exists "own checkpoints" on public.route_checkpoints;
create policy "own checkpoints" on public.route_checkpoints
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists route_checkpoints_user_date_idx
  on public.route_checkpoints (user_id, target_date);

create table if not exists public.route_progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkpoint_id uuid references public.route_checkpoints(id) on delete set null,
  storage_path text not null,
  taken_at timestamptz not null default now(),
  visible_to_ai boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.route_progress_photos to authenticated;
grant all on public.route_progress_photos to service_role;

alter table public.route_progress_photos enable row level security;

drop policy if exists "own progress photos" on public.route_progress_photos;
create policy "own progress photos" on public.route_progress_photos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Private bucket for the photos. Files are stored under <user_id>/<file>.
insert into storage.buckets (id, name, public)
values ('route-photos', 'route-photos', false)
on conflict (id) do nothing;

drop policy if exists "own route photo files" on storage.objects;
create policy "own route photo files" on storage.objects
  for all to authenticated
  using (bucket_id = 'route-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'route-photos' and (storage.foldername(name))[1] = auth.uid()::text);
