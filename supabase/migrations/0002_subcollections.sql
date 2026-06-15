-- Subcollections ("styles")
create table public.subcollections (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, slug)
);

alter table public.subcollections enable row level security;
create policy "auth read subcollections" on public.subcollections for select to authenticated using (true);
create policy "auth write subcollections" on public.subcollections for all to authenticated using (true) with check (true);

-- Card -> subcollection link (nullable during migration)
alter table public.cards add column subcollection_id uuid references public.subcollections(id) on delete cascade;

-- One "Padrão" style per existing collection
insert into public.subcollections (collection_id, slug, name, sort_order)
select id, 'padrao', 'Padrão', 0 from public.collections;

-- Attach every existing card to its collection's "Padrão" style
update public.cards c
set subcollection_id = s.id
from public.subcollections s
where s.collection_id = c.collection_id and s.slug = 'padrao';

-- Now enforce NOT NULL
alter table public.cards alter column subcollection_id set not null;

create index cards_subcollection_idx on public.cards(subcollection_id, sort_order);
