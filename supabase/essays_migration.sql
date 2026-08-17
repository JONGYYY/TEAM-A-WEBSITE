-- ===========================================================================
-- AI Essay Tool — standalone migration.
-- Safe to run on an existing project (idempotent). Paste this whole file into
-- the Supabase SQL editor (Dashboard → SQL Editor → New query) and Run.
-- ===========================================================================

create table if not exists public.essay_prompts (
  id          text primary key,
  college     text not null default '',
  major       text,
  year        text not null,
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
  prompt_snapshot jsonb not null default '{}'::jsonb,
  title           text not null default '',
  content         jsonb not null default '{}'::jsonb,
  parts           jsonb not null default '[]'::jsonb,
  word_count      int not null default 0,
  score           jsonb,
  status          text not null default 'draft' check (status in ('draft','in_progress','final')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists essays_owner on public.essays (owner_email);

create table if not exists public.essay_comments (
  id          text primary key,
  essay_id    text not null references public.essays (id) on delete cascade,
  author      text not null,
  kind        text not null default 'comment' check (kind in ('comment','ai_feedback')),
  quoted_text text not null default '',
  range_from  int,
  range_to    int,
  body        text not null default '',
  resolved    boolean not null default false,
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

-- Row-level security -------------------------------------------------------
alter table public.essay_prompts  enable row level security;
alter table public.essays         enable row level security;
alter table public.essay_comments enable row level security;
alter table public.essay_chats    enable row level security;
alter table public.essay_messages enable row level security;

drop policy if exists essay_prompts_read   on public.essay_prompts;
drop policy if exists essay_prompts_insert on public.essay_prompts;
drop policy if exists essay_prompts_update on public.essay_prompts;
create policy essay_prompts_read   on public.essay_prompts for select to authenticated using (true);
create policy essay_prompts_insert on public.essay_prompts for insert to authenticated with check (true);
create policy essay_prompts_update on public.essay_prompts for update to authenticated
  using (created_by = (auth.jwt() ->> 'email'));

drop policy if exists essays_read  on public.essays;
drop policy if exists essays_write on public.essays;
create policy essays_read  on public.essays for select to authenticated using (owner_email = (auth.jwt() ->> 'email'));
create policy essays_write on public.essays for all to authenticated
  using (owner_email = (auth.jwt() ->> 'email'))
  with check (owner_email = (auth.jwt() ->> 'email'));

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

-- Realtime (guarded so re-runs don't error) --------------------------------
do $$
declare t text;
begin
  foreach t in array array['essay_prompts','essays','essay_comments','essay_chats','essay_messages']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
