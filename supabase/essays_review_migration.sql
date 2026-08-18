-- ===========================================================================
-- AI Essay Tool — review-pipeline status migration.
-- Adds the draft -> review workflow statuses to public.essays.
-- Safe to run once on an existing project (idempotent). Paste into the
-- Supabase SQL editor (Dashboard -> SQL Editor -> New query) and Run.
-- ===========================================================================

-- The original constraint only allowed draft / in_progress / final. Widen it
-- so drafts can move into review and be marked reviewed or archived.
alter table public.essays drop constraint if exists essays_status_check;

alter table public.essays
  add constraint essays_status_check
  check (status in ('draft','in_progress','in_review','reviewed','final','archived'));
