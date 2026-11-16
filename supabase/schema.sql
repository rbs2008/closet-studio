create table if not exists public.closet_studio_sync (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.closet_studio_sync enable row level security;

revoke all on table public.closet_studio_sync from anon, authenticated;
grant select, insert, update, delete on table public.closet_studio_sync to authenticated;

drop policy if exists "Users can read their own closet sync" on public.closet_studio_sync;
create policy "Users can read their own closet sync"
  on public.closet_studio_sync for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own closet sync" on public.closet_studio_sync;
create policy "Users can create their own closet sync"
  on public.closet_studio_sync for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own closet sync" on public.closet_studio_sync;
create policy "Users can update their own closet sync"
  on public.closet_studio_sync for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own closet sync" on public.closet_studio_sync;
create policy "Users can delete their own closet sync"
  on public.closet_studio_sync for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'closet-studio-photos',
  'closet-studio-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own closet photos" on storage.objects;
create policy "Users can read their own closet photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'closet-studio-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own closet photos" on storage.objects;
create policy "Users can upload their own closet photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'closet-studio-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own closet photos" on storage.objects;
create policy "Users can update their own closet photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'closet-studio-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'closet-studio-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own closet photos" on storage.objects;
create policy "Users can delete their own closet photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'closet-studio-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
