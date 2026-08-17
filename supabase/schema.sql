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
-- AI Essay Tool.
--   essay_prompts : the growing, shared dataset of college/major/Common App
--                   prompts. A cache miss triggers live sourcing then inserts.
--   essays        : one student's essay (Tiptap JSON content + outline parts).
--   essay_comments: line-anchored comments (user + AI). Never deleted — only
--                   toggled resolved, so review notes can't disappear.
--   essay_chats / essay_messages : per-essay assistant chat threads + history.
-- ---------------------------------------------------------------------------
create table if not exists public.essay_prompts (
  id          text primary key,
  college     text not null default '',   -- '' = Common App / generic
  major       text,                        -- null = whole-school prompt
  year        text not null,               -- application cycle, e.g. '2026-2027'
  prompt_text text not null,
  word_limit  int,
  source      text not null default 'search' check (source in ('common_app','search','user')),
  source_url  text,
  status      text not null default 'unverified' check (status in ('verified','unverified')),
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists essay_prompts_lookup on public.essay_prompts (college, year);

create table if not exists public.essays (
  id              text primary key,
  owner_email     text not null,
  prompt_id       text references public.essay_prompts (id) on delete set null,
  prompt_snapshot jsonb not null default '{}'::jsonb,  -- frozen text/limit/college/major/year
  title           text not null default '',
  content         jsonb not null default '{}'::jsonb,  -- Tiptap document JSON
  parts           jsonb not null default '[]'::jsonb,  -- outline steps + completion
  word_count      int not null default 0,
  score           jsonb,                                -- overall + category bars + summary
  status          text not null default 'draft' check (status in ('draft','in_progress','final')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists essays_owner on public.essays (owner_email);

create table if not exists public.essay_comments (
  id          text primary key,
  essay_id    text not null references public.essays (id) on delete cascade,
  author      text not null,                             -- email or 'ai'
  kind        text not null default 'comment' check (kind in ('comment','ai_feedback')),
  quoted_text text not null default '',                  -- for re-anchoring after edits
  range_from  int,
  range_to    int,
  body        text not null default '',
  resolved    boolean not null default false,            -- toggled, never hard-deleted
  created_at  timestamptz not null default now()
);
create index if not exists essay_comments_essay on public.essay_comments (essay_id);

create table if not exists public.essay_chats (
  id          text primary key,
  essay_id    text not null references public.essays (id) on delete cascade,
  owner_email text not null,
  title       text not null default 'New chat',
  created_at  timestamptz not null default now()
);
create index if not exists essay_chats_essay on public.essay_chats (essay_id);

create table if not exists public.essay_messages (
  id         text primary key,
  chat_id    text not null references public.essay_chats (id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists essay_messages_chat on public.essay_messages (chat_id);

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
alter table public.essay_prompts  enable row level security;
alter table public.essays         enable row level security;
alter table public.essay_comments enable row level security;
alter table public.essay_chats    enable row level security;
alter table public.essay_messages enable row level security;

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

-- essay_prompts: shared dataset — everyone reads; any signed-in user can add
-- (contributing to the dataset). Updates limited to the contributor.
drop policy if exists essay_prompts_read   on public.essay_prompts;
drop policy if exists essay_prompts_insert on public.essay_prompts;
drop policy if exists essay_prompts_update on public.essay_prompts;
create policy essay_prompts_read   on public.essay_prompts for select to authenticated using (true);
create policy essay_prompts_insert on public.essay_prompts for insert to authenticated with check (true);
create policy essay_prompts_update on public.essay_prompts for update to authenticated
  using (created_by = (auth.jwt() ->> 'email'));

-- essays: fully private to the owner.
drop policy if exists essays_read  on public.essays;
drop policy if exists essays_write on public.essays;
create policy essays_read  on public.essays for select to authenticated using (owner_email = (auth.jwt() ->> 'email'));
create policy essays_write on public.essays for all to authenticated
  using (owner_email = (auth.jwt() ->> 'email'))
  with check (owner_email = (auth.jwt() ->> 'email'));

-- essay_comments / chats / messages: scoped through the owning essay.
drop policy if exists essay_comments_rw on public.essay_comments;
create policy essay_comments_rw on public.essay_comments for all to authenticated
  using (exists (select 1 from public.essays e where e.id = essay_comments.essay_id and e.owner_email = (auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.essays e where e.id = essay_comments.essay_id and e.owner_email = (auth.jwt() ->> 'email')));

drop policy if exists essay_chats_rw on public.essay_chats;
create policy essay_chats_rw on public.essay_chats for all to authenticated
  using (owner_email = (auth.jwt() ->> 'email'))
  with check (owner_email = (auth.jwt() ->> 'email'));

drop policy if exists essay_messages_rw on public.essay_messages;
create policy essay_messages_rw on public.essay_messages for all to authenticated
  using (exists (select 1 from public.essay_chats c where c.id = essay_messages.chat_id and c.owner_email = (auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.essay_chats c where c.id = essay_messages.chat_id and c.owner_email = (auth.jwt() ->> 'email')));

-- ---------------------------------------------------------------------------
-- Realtime: let counselor/student views update live as data changes.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.quizzes;
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.assignments;
alter publication supabase_realtime add table public.submissions;
