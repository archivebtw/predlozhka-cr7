-- Разрешает зрителям, вошедшим через Twitch, продолжать видеть публичный каталог.
-- Административные insert/update/delete политики этот файл не меняет.

drop policy if exists "Public can read published games" on public.games;
create policy "Public can read published games"
on public.games
for select
to anon, authenticated
using (published = true);

notify pgrst, 'reload schema';
