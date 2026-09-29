-- Atomic, administrator-only metadata edits with optimistic conflict checking.
-- Existing files, URLs, gym assignments and featured selections are never changed here.
create or replace function public.edit_inventory_items(p_changes jsonb)
returns integer language plpgsql security invoker set search_path = public
as $$
declare entry jsonb; current_row jsonb; k text; permitted text[]; assignments text; n integer := 0;
begin
  if not coalesce(public.has_role(auth.uid(), 'admin'), false) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) not between 1 and 2000 then
    raise exception 'Select between 1 and 2000 records per edit';
  end if;
  if (select count(*) from jsonb_array_elements(p_changes)) <> (select count(distinct (x->>'source', x->>'id')) from jsonb_array_elements(p_changes) x) then
    raise exception 'Duplicate records in edit';
  end if;
  for entry in select value from jsonb_array_elements(p_changes) order by value->>'source', value->>'id' loop
    permitted := case entry->>'source'
      when 'gym_logos' then array['filename','variant','treatment','colorway']
      when 'gym_elements' then array['display_name','element_type']
      when 'gym_assets' then array['filename','description','category_id']
      else null end;
    if permitted is null or jsonb_typeof(entry->'before') is distinct from 'object' or jsonb_typeof(entry->'after') is distinct from 'object' or entry->'after' = '{}'::jsonb then
      raise exception 'Unsupported inventory edit';
    end if;
    if (select array_agg(key order by key) from jsonb_object_keys(entry->'before') key) is distinct from
       (select array_agg(key order by key) from jsonb_object_keys(entry->'after') key) then
      raise exception 'Every edit must include its previous value';
    end if;
    execute format('select to_jsonb(t) from public.%I t where id = $1 for update', entry->>'source') into current_row using (entry->>'id')::uuid;
    if current_row is null then raise exception 'An item is missing or unavailable. Refresh inventory.'; end if;
    assignments := '';
    for k in select jsonb_object_keys(entry->'after') loop
      if not (k = any(permitted)) or jsonb_typeof(entry->'after'->k) not in ('string','null') then raise exception 'Unsupported field'; end if;
      if (current_row->k) is distinct from (entry->'before'->k) then
        raise exception 'An item changed since you opened it. Refresh inventory and try again.' using errcode = '40001';
      end if;
      if length(entry->'after'->>k) > 2000 or (k in ('filename','variant','element_type') and coalesce(btrim(entry->'after'->>k),'') = '') then raise exception 'Invalid or empty value'; end if;
      assignments := assignments || case when assignments = '' then '' else ', ' end || format('%I = ($1->>%L)%s', k, k, case when k = 'category_id' then '::uuid' else '' end);
    end loop;
    execute format('update public.%I set %s where id = $2', entry->>'source', assignments) using entry->'after', (entry->>'id')::uuid;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.edit_inventory_items(jsonb) from public, anon;
grant execute on function public.edit_inventory_items(jsonb) to authenticated;
