-- Дропнутые игры и публичный тир-лист. Выполнить один раз в Supabase SQL Editor.
alter table public.games add column if not exists tier_rank text not null default '';
alter table public.games drop constraint if exists games_library_status_check;
alter table public.games add constraint games_library_status_check
  check (library_status in ('', 'completed', 'dropped', 'ignored'));
alter table public.games drop constraint if exists games_tier_rank_check;
alter table public.games add constraint games_tier_rank_check
  check (tier_rank in ('', 'S', 'A', 'B', 'C', 'D'));
create index if not exists games_tier_rank_idx on public.games (tier_rank)
  where published = true and library_status in ('completed', 'dropped');
notify pgrst, 'reload schema';
