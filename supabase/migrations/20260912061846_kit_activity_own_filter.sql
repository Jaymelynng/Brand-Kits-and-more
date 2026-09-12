-- Personal report filters are private to their administrator. Activity is retained.
create table public.kit_activity_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hide_own_activity boolean not null default false,
  hidden_ips inet[] not null default '{}'::inet[],
  check (cardinality(hidden_ips) <= 20 and array_position(hidden_ips, null) is null)
);
alter table public.kit_activity_preferences enable row level security;
revoke all on public.kit_activity_preferences from public, anon, authenticated;
grant select, insert, update on public.kit_activity_preferences to authenticated;
grant all on public.kit_activity_preferences to service_role;
create policy "Administrators manage their own activity filters"
  on public.kit_activity_preferences for all to authenticated
  using (user_id = (select auth.uid()) and public.has_role((select auth.uid()), 'admin'))
  with check (user_id = (select auth.uid()) and public.has_role((select auth.uid()), 'admin'));

create function public.set_kit_activity_filter(p_hide_own boolean)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if not coalesce(public.has_role((select auth.uid()), 'admin'), false) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_hide_own is null then raise exception 'A filter choice is required'; end if;
  insert into public.kit_activity_preferences (user_id, hide_own_activity)
    values ((select auth.uid()), p_hide_own)
    on conflict (user_id) do update set hide_own_activity = excluded.hide_own_activity;
  return p_hide_own;
end;
$$;
revoke all on function public.set_kit_activity_filter(boolean) from public, anon;
grant execute on function public.set_kit_activity_filter(boolean) to authenticated;

-- Same signature keeps existing clients compatible during deployment.
create or replace function public.get_kit_activity(
  p_days integer default 7, p_gym_id uuid default null,
  p_kind text default null, p_session_id uuid default null, p_offset integer default 0
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; hide_own boolean; own_ips inet[];
begin
  if not coalesce(public.has_role((select auth.uid()), 'admin'), false) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_days is null or p_days not in (1,7,30) or p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception 'Invalid activity filters';
  end if;
  select p.hide_own_activity, p.hidden_ips into hide_own, own_ips
    from public.kit_activity_preferences p where p.user_id = (select auth.uid());
  hide_own := coalesce(hide_own, false);
  own_ips := coalesce(own_ips, '{}'::inet[]);
  with filtered as materialized (
    select a.*, g.code as gym_code from public.kit_activity a
      join public.gyms g on g.id = a.gym_id
    where a.created_at >= now() - make_interval(days => p_days)
      and (p_gym_id is null or a.gym_id = p_gym_id)
      and (p_kind is null or a.event_kind = p_kind)
      and (p_session_id is null or a.session_id = p_session_id)
      and (not hide_own or a.ip_address is null or not (a.ip_address = any(own_ips)))
  ), page as (
    select id, created_at, gym_code, session_id, event_kind, label, page_path,
      host(ip_address) as ip_address, device from filtered
    order by created_at desc, id desc offset p_offset limit 100
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'sessions', (select count(distinct session_id) from filtered),
    'visits', (select count(*) from filtered where event_kind = 'visit'),
    'previews', (select count(*) from filtered where event_kind = 'preview'),
    'downloads', (select count(*) from filtered where event_kind = 'download_ready'),
    'rows', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'own_activity', jsonb_build_object('hidden', hide_own,
      'ips', coalesce((select jsonb_agg(host(ip)) from unnest(own_ips) ip), '[]'::jsonb))
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_kit_activity(integer,uuid,text,uuid,integer) from public, anon;
grant execute on function public.get_kit_activity(integer,uuid,text,uuid,integer) to authenticated;
