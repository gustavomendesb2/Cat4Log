-- Collections
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Cards
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  number text not null,
  name text not null,
  image_path text,
  aspect_ratio text not null default '3:4' check (aspect_ratio in ('1:1','9:16','3:4')),
  tags text[] not null default '{}',
  status text not null default 'empty' check (status in ('empty','filled')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_collection_idx on public.cards(collection_id, sort_order);

-- Keep status + updated_at in sync with image_path
create or replace function public.cards_sync() returns trigger as $$
begin
  new.status := case when new.image_path is null or new.image_path = '' then 'empty' else 'filled' end;
  new.updated_at := now();
  return new;
end; $$ language plpgsql;

create trigger cards_sync_trg before insert or update on public.cards
  for each row execute function public.cards_sync();

-- RLS: only authenticated users (the owner) can read/write
alter table public.collections enable row level security;
alter table public.cards enable row level security;

create policy "auth read collections" on public.collections for select to authenticated using (true);
create policy "auth write collections" on public.collections for all to authenticated using (true) with check (true);
create policy "auth read cards" on public.cards for select to authenticated using (true);
create policy "auth write cards" on public.cards for all to authenticated using (true) with check (true);

-- Seed collections
insert into public.collections (slug, name, sort_order) values
  ('pokemon', 'Pokémon', 0),
  ('naruto', 'Naruto', 1);

-- Public storage bucket for images (read public, write via authenticated session)
insert into storage.buckets (id, name, public) values ('card-images', 'card-images', true)
  on conflict (id) do nothing;

create policy "public read card-images" on storage.objects for select using (bucket_id = 'card-images');
create policy "auth write card-images" on storage.objects for insert to authenticated with check (bucket_id = 'card-images');
create policy "auth update card-images" on storage.objects for update to authenticated using (bucket_id = 'card-images');
create policy "auth delete card-images" on storage.objects for delete to authenticated using (bucket_id = 'card-images');
