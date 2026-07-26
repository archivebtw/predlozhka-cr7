-- Постоянные административные отметки игр для публичного каталога.
-- Выполни один раз в Supabase SQL Editor до публикации обновлённого frontend.

alter table public.games
  add column if not exists library_status text not null default '',
  add column if not exists is_favorite boolean not null default false;

alter table public.games drop constraint if exists games_library_status_check;
alter table public.games
  add constraint games_library_status_check
  check (library_status in ('', 'completed', 'ignored'));

create index if not exists games_library_status_idx
  on public.games (library_status, is_favorite)
  where published = true;

-- Запись уже защищена существующими RLS-политиками games:
-- update разрешён только когда public.is_site_admin() возвращает true.
