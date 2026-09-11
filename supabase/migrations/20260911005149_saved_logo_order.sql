-- One saved order, shared by gallery, primary carousel and kit exports.
alter table public.gym_logos add column sort_order integer;

with ranked as (
  select id, row_number() over (
    partition by gym_id order by is_main_logo desc nulls last, created_at, id
  )::integer - 1 as position
  from public.gym_logos
)
update public.gym_logos l set sort_order = r.position from ranked r where l.id = r.id;

create index gym_logos_display_order on public.gym_logos (gym_id, sort_order, created_at, id);

create function public.reorder_gym_logos(p_gym_id uuid, p_ordered_ids uuid[], p_expected_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare
  current_ids uuid[];
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  -- Serialize saves for this gym, then check the caller's snapshot. An older
  -- tab must not silently overwrite a newer order or omit an upload.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_gym_id::text, 0));
  perform id from public.gym_logos where gym_id = p_gym_id order by id for update;
  select array_agg(id order by sort_order nulls last, created_at, id)
    into current_ids from public.gym_logos where gym_id = p_gym_id;

  if current_ids is null or p_expected_ids is distinct from current_ids then
    raise exception 'The logo library changed. Close this panel and try again.' using errcode = '40001';
  end if;
  if p_ordered_ids is null or cardinality(p_ordered_ids) <> cardinality(current_ids)
     or (select count(distinct id) from unnest(p_ordered_ids) as x(id)) <> cardinality(current_ids)
     or not (p_ordered_ids @> current_ids and p_ordered_ids <@ current_ids) then
    raise exception 'Logo order must contain every logo in this gym exactly once.' using errcode = '22023';
  end if;

  update public.gym_logos l set sort_order = x.position::integer - 1
    from unnest(p_ordered_ids) with ordinality as x(id, position)
    where l.id = x.id and l.gym_id = p_gym_id;
end;
$$;

revoke all on function public.reorder_gym_logos(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.reorder_gym_logos(uuid, uuid[], uuid[]) to authenticated;
