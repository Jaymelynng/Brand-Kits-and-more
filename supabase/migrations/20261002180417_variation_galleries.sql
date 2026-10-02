-- Named review collections are separate from approved kit logos and exports.
create table public.variation_galleries (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id),
  title text not null check (length(btrim(title)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (length(description) <= 2000),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (gym_id, slug), unique (id, gym_id)
);
create table public.variation_assets (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id),
  filename text not null check (length(btrim(filename)) between 1 and 240),
  file_url text not null check (file_url ~ '^(https://|/brand-variations/)'),
  thumbnail_url text not null check (thumbnail_url ~ '^(https://|/brand-variations/)'),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  bytes bigint not null check (bytes > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  has_alpha boolean not null,
  created_at timestamptz not null default now(),
  unique (gym_id, sha256), unique (id, gym_id)
);
create table public.variation_gallery_items (
  gallery_id uuid not null,
  asset_id uuid not null,
  gym_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 240),
  sort_order integer not null default 0,
  is_reference boolean not null default false,
  primary key (gallery_id, asset_id),
  foreign key (gallery_id, gym_id) references public.variation_galleries(id, gym_id) on delete cascade,
  foreign key (asset_id, gym_id) references public.variation_assets(id, gym_id)
);
create index variation_assets_gym on public.variation_assets(gym_id);
create index variation_items_asset on public.variation_gallery_items(asset_id);
create index variation_items_order on public.variation_gallery_items(gallery_id, sort_order, asset_id);

alter table public.variation_galleries enable row level security;
alter table public.variation_assets enable row level security;
alter table public.variation_gallery_items enable row level security;
revoke all on public.variation_galleries, public.variation_assets, public.variation_gallery_items from anon, authenticated;
grant select on public.variation_galleries, public.variation_assets, public.variation_gallery_items to anon, authenticated;
grant insert, update, delete on public.variation_galleries, public.variation_assets, public.variation_gallery_items to authenticated;
create policy galleries_public_read on public.variation_galleries for select to anon, authenticated using (is_published);
create policy galleries_admin on public.variation_galleries for all to authenticated
 using (public.has_role((select auth.uid()), 'admin')) with check (public.has_role((select auth.uid()), 'admin'));
create policy items_public_read on public.variation_gallery_items for select to anon, authenticated using (
 exists (select 1 from public.variation_galleries g where g.id = gallery_id and g.is_published));
create policy items_admin on public.variation_gallery_items for all to authenticated
 using (public.has_role((select auth.uid()), 'admin')) with check (public.has_role((select auth.uid()), 'admin'));
create policy assets_public_read on public.variation_assets for select to anon, authenticated using (
 exists (select 1 from public.variation_gallery_items i join public.variation_galleries g on g.id=i.gallery_id
 where i.asset_id=variation_assets.id and g.is_published));
create policy assets_admin on public.variation_assets for all to authenticated
 using (public.has_role((select auth.uid()), 'admin')) with check (public.has_role((select auth.uid()), 'admin'));

-- Uploaded bytes are immutable by content hash. Save the whole attachment batch atomically.
create function public.add_variation_gallery_assets(p_gallery_id uuid, p_assets jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare target_gym uuid; entry jsonb; saved_id uuid; position integer; added integer := 0;
begin
 if not public.has_role((select auth.uid()), 'admin') then
   raise exception 'Admin access required' using errcode='42501';
 end if;
 select gym_id into target_gym from public.variation_galleries where id=p_gallery_id for update;
 if target_gym is null then raise exception 'Gallery not found'; end if;
 if jsonb_typeof(p_assets) <> 'array' or jsonb_array_length(p_assets) not between 1 and 100 then
   raise exception 'Choose between 1 and 100 files';
 end if;
 select coalesce(max(sort_order)+1,0) into position from public.variation_gallery_items where gallery_id=p_gallery_id;
 for entry in select value from jsonb_array_elements(p_assets) loop
   insert into public.variation_assets(gym_id,filename,file_url,thumbnail_url,sha256,bytes,width,height,has_alpha)
   values(target_gym,entry->>'filename',entry->>'file_url',entry->>'thumbnail_url',entry->>'sha256',
     (entry->>'bytes')::bigint,(entry->>'width')::integer,(entry->>'height')::integer,(entry->>'has_alpha')::boolean)
   on conflict (gym_id,sha256) do nothing;
   select id into saved_id from public.variation_assets where gym_id=target_gym and sha256=entry->>'sha256';
   insert into public.variation_gallery_items(gallery_id,asset_id,gym_id,title,sort_order,is_reference)
   values(p_gallery_id,saved_id,target_gym,entry->>'title',position,coalesce((entry->>'is_reference')::boolean,false))
   on conflict (gallery_id,asset_id) do nothing;
   if found then added := added+1; position := position+1; end if;
 end loop;
 return added;
end $$;
revoke all on function public.add_variation_gallery_assets(uuid,jsonb) from public, anon;
grant execute on function public.add_variation_gallery_assets(uuid,jsonb) to authenticated;
