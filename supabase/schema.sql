-- ============================================================================
-- Reading Journal - Supabase adatbazis sema
-- ============================================================================
-- Ezt a fajlt a Supabase Dashboard "SQL Editor" feluleten futtasd le egyben.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES tabla
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  theme_id text default 't4',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. BOOKS tabla
-- ----------------------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  pages integer default 0,
  status text not null default 'tervezem'
    check (status in ('olvasom','elolvasva','tervezem','eves_terv','kivansaglista')),
  rating integer default 0 check (rating between 0 and 5),
  date date,
  pages_read integer default 0,
  planned_month integer check (planned_month between 1 and 12),
  planned_year integer,
  genres text[] default '{}',
  note text,
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_user_id_idx on public.books(user_id);
create index if not exists books_status_idx on public.books(user_id, status);
create index if not exists books_genres_idx on public.books using gin(genres);

alter table public.books enable row level security;

drop policy if exists "books_select_own" on public.books;
create policy "books_select_own" on public.books
  for select using (auth.uid() = user_id);

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own" on public.books
  for insert with check (auth.uid() = user_id);

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own" on public.books
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own" on public.books
  for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
  before update on public.books
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. READING_LOG tabla
-- ----------------------------------------------------------------------------
create table if not exists public.reading_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  pages integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists reading_log_user_id_idx on public.reading_log(user_id);

alter table public.reading_log enable row level security;

drop policy if exists "reading_log_select_own" on public.reading_log;
create policy "reading_log_select_own" on public.reading_log
  for select using (auth.uid() = user_id);

drop policy if exists "reading_log_insert_own" on public.reading_log;
create policy "reading_log_insert_own" on public.reading_log
  for insert with check (auth.uid() = user_id);

drop policy if exists "reading_log_update_own" on public.reading_log;
create policy "reading_log_update_own" on public.reading_log
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reading_log_delete_own" on public.reading_log;
create policy "reading_log_delete_own" on public.reading_log
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. STORAGE bucket a konyvborito kepekhez
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('covers', 'covers', false)
on conflict (id) do nothing;

drop policy if exists "covers_select_own" on storage.objects;
create policy "covers_select_own" on storage.objects
  for select using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "covers_insert_own" on storage.objects;
create policy "covers_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "covers_update_own" on storage.objects;
create policy "covers_update_own" on storage.objects
  for update using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "covers_delete_own" on storage.objects;
create policy "covers_delete_own" on storage.objects
  for delete using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Kesz. Ha mindent lefuttattal, a Table Editor-ban latnod kell a profiles,
-- books es reading_log tablakat, a Storage fulon pedig a "covers" bucket-et.
-- ============================================================================
