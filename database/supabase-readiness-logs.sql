-- Move & Groove: pre- and post-session readiness persistence.
-- Run this once in Supabase Dashboard -> SQL Editor for the production project.

create table if not exists public.readiness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  session_type text not null check (session_type in ('pre', 'post')),
  sleep_quality integer,
  energy_level integer,
  soreness_level integer,
  niggled_region text,
  training_context text,
  intensity_modifier text,
  avoid_passive_holds boolean not null default false,
  reduce_region text,
  created_at timestamptz not null default now()
);

-- Keep an older, partially-created version of this table compatible with the app.
alter table public.readiness_logs
  add column if not exists session_type text,
  add column if not exists sleep_quality integer,
  add column if not exists energy_level integer,
  add column if not exists soreness_level integer,
  add column if not exists niggled_region text,
  add column if not exists training_context text,
  add column if not exists intensity_modifier text,
  add column if not exists avoid_passive_holds boolean not null default false,
  add column if not exists reduce_region text,
  add column if not exists created_at timestamptz not null default now();

-- Earlier environments used a numeric intensity modifier; the app stores named modes.
alter table public.readiness_logs
  alter column intensity_modifier type text using intensity_modifier::text;

create index if not exists readiness_logs_user_date_type_idx
  on public.readiness_logs (user_id, date desc, session_type);

alter table public.readiness_logs enable row level security;

drop policy if exists "Users can read their own readiness logs" on public.readiness_logs;
create policy "Users can read their own readiness logs"
  on public.readiness_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own readiness logs" on public.readiness_logs;
create policy "Users can create their own readiness logs"
  on public.readiness_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own readiness logs" on public.readiness_logs;
create policy "Users can update their own readiness logs"
  on public.readiness_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
