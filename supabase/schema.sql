-- =============================================================================
-- DreamCollege.ai — Supabase schema
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / drop-and-recreate policies).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holding their display name + role.
-- Keyed to auth.users so accounts work across any device.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text unique not null,
  name       text not null,
  role       text not null default 'student' check (role in ('student', 'counselor')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- quizzes / surveys. IDs are app-generated strings (e.g. "q_...") to match the
-- existing client id generator, so no id rewrite is needed.
-- ---------------------------------------------------------------------------
create table if not exists public.quizzes (
  id          text primary key,
  owner_email text not null,
  title       text not null default '',
  description text not null default '',
  kind        text not null default 'quiz' check (kind in ('quiz', 'survey')),
  outcomes    jsonb,
  questions   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.groups (
  id             text primary key,
  owner_email    text not null,
  name           text not null,
  student_emails text[] not null default '{}'
);

create table if not exists public.assignments (
  id             text primary key,
  quiz_id        text not null references public.quizzes (id) on delete cascade,
  assigned_by    text not null,
  student_emails text[] not null default '{}',
  group_id       text,
  assigned_at    timestamptz not null default now(),
  due_at         timestamptz
);

create table if not exists public.submissions (
  id            text primary key,
  assignment_id text not null references public.assignments (id) on delete cascade,
  quiz_id       text not null references public.quizzes (id) on delete cascade,
  student_email text not null,
  answers       jsonb not null default '[]'::jsonb,
  grades        jsonb not null default '[]'::jsonb,
  status        text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'graded')),
  score         integer not null default 0,
  max_score     integer not null default 0,
  feedback      text,
  result        jsonb,
  submitted_at  timestamptz,
  graded_at     timestamptz,
  unique (assignment_id, student_email)
);

-- ---------------------------------------------------------------------------
-- Row-level security. Everyone signed in can READ (a counselor must see the
-- full student roster and every submission); WRITES are constrained by email
-- ownership. auth.jwt()->>'email' is the signed-in user's email.
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.quizzes     enable row level security;
alter table public.groups      enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

-- profiles
drop policy if exists profiles_read     on public.profiles;
drop policy if exists profiles_insert   on public.profiles;
drop policy if exists profiles_update   on public.profiles;
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid());

-- quizzes
drop policy if exists quizzes_read  on public.quizzes;
drop policy if exists quizzes_write on public.quizzes;
create policy quizzes_read  on public.quizzes for select to authenticated using (true);
create policy quizzes_write on public.quizzes for all to authenticated
  using (owner_email = (auth.jwt() ->> 'email'))
  with check (owner_email = (auth.jwt() ->> 'email'));

-- groups
drop policy if exists groups_read  on public.groups;
drop policy if exists groups_write on public.groups;
create policy groups_read  on public.groups for select to authenticated using (true);
create policy groups_write on public.groups for all to authenticated
  using (owner_email = (auth.jwt() ->> 'email'))
  with check (owner_email = (auth.jwt() ->> 'email'));

-- assignments
drop policy if exists assignments_read  on public.assignments;
drop policy if exists assignments_write on public.assignments;
create policy assignments_read  on public.assignments for select to authenticated using (true);
create policy assignments_write on public.assignments for all to authenticated
  using (assigned_by = (auth.jwt() ->> 'email'))
  with check (assigned_by = (auth.jwt() ->> 'email'));

-- submissions: a student manages their own row; the owning counselor may grade it.
drop policy if exists submissions_read   on public.submissions;
drop policy if exists submissions_insert on public.submissions;
drop policy if exists submissions_update on public.submissions;
drop policy if exists submissions_delete on public.submissions;
create policy submissions_read   on public.submissions for select to authenticated using (true);
create policy submissions_insert on public.submissions for insert to authenticated
  with check (student_email = (auth.jwt() ->> 'email'));
create policy submissions_update on public.submissions for update to authenticated
  using (
    student_email = (auth.jwt() ->> 'email')
    or exists (select 1 from public.quizzes q where q.id = submissions.quiz_id and q.owner_email = (auth.jwt() ->> 'email'))
  );
create policy submissions_delete on public.submissions for delete to authenticated
  using (
    student_email = (auth.jwt() ->> 'email')
    or exists (select 1 from public.quizzes q where q.id = submissions.quiz_id and q.owner_email = (auth.jwt() ->> 'email'))
  );

-- ---------------------------------------------------------------------------
-- Realtime: let counselor/student views update live as data changes.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.quizzes;
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.assignments;
alter publication supabase_realtime add table public.submissions;
