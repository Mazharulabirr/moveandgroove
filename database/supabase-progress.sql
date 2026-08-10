-- Move & Groove: completed-workout progress used by dashboard totals and weekly load.
-- Run once in Supabase Dashboard -> SQL Editor for the production project.

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id bigint references public.routines(id) on delete set null,
  duration_minutes integer check (duration_minutes is null or (duration_minutes > 0 and duration_minutes <= 45)),
  completed_at timestamptz not null default now(),
  sport text,
  areas text[],
  goal text,
  created_at timestamptz not null default now()
);

create index if not exists progress_user_completed_at_idx
  on public.progress (user_id, completed_at desc);

alter table public.progress enable row level security;

drop policy if exists "Users can read their own progress" on public.progress;
create policy "Users can read their own progress"
  on public.progress for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create their own progress" on public.progress;
create policy "Users can create their own progress"
  on public.progress for insert to authenticated
  with check (user_id = auth.uid());

-- Refresh PostgREST so the new table is available to the API immediately.
notify pgrst, 'reload schema';
