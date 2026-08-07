-- Move & Groove: persist mobility-screening answers for cross-device profiles.
-- Run once in Supabase Dashboard > SQL Editor.

create table if not exists public.screening_questionnaires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null default 'mobility_screen_v2',
  activity_level integer not null default 1,
  desk_hours_per_day integer not null default 8,
  average_sleep_quality integer not null default 3,
  stress_level integer not null default 3,
  responses jsonb,
  created_at timestamptz not null default now()
);

-- Keep this safe for a project that already has the legacy table.
alter table public.screening_questionnaires
  add column if not exists responses jsonb;

create index if not exists screening_questionnaires_user_created_at_idx
  on public.screening_questionnaires (user_id, created_at desc);

alter table public.screening_questionnaires enable row level security;

-- Add the minimum user-scoped policies only when they do not already exist.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'screening_questionnaires'
      and policyname = 'Users can read their own screening questionnaires'
  ) then
    create policy "Users can read their own screening questionnaires"
      on public.screening_questionnaires
      for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'screening_questionnaires'
      and policyname = 'Users can create their own screening questionnaires'
  ) then
    create policy "Users can create their own screening questionnaires"
      on public.screening_questionnaires
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;
