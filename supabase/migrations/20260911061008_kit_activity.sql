-- Private, rolling 30-day activity. Public writes go through the Edge Function.
create table public.kit_activity (
  id uuid primary key,
  created_at timestamptz not null default now(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  session_id uuid not null,
  event_kind text not null check (event_kind in ('visit','click','preview','download_ready')),
  label text not null check (length(label) between 1 and 240),
  page_path text not null check (length(page_path) <= 120),
  ip_address inet,
  device text not null check (device in ('Phone','Tablet','Desktop','Unknown'))
);
create index kit_activity_time on public.kit_activity (created_at desc);
create index kit_activity_gym_time on public.kit_activity (gym_id, created_at desc);
create index kit_activity_session on public.kit_activity (session_id, created_at desc);
alter table public.kit_activity enable row level security;
revoke all on public.kit_activity from anon, authenticated;
grant select on public.kit_activity to authenticated;
grant all on public.kit_activity to service_role;
create policy "Administrators read recent kit activity" on public.kit_activity
  for select to authenticated using (
    public.has_role((select auth.uid()), 'admin') and created_at >= now() - interval '30 days'
  );

create table public.kit_activity_limits (
  key text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table public.kit_activity_limits enable row level security;
revoke all on public.kit_activity_limits from public, anon, authenticated;
grant all on public.kit_activity_limits to service_role;

-- Only the service role can submit validated, server-enriched events.
create function public.record_kit_activity(
  p_id uuid, p_gym_id uuid, p_session_id uuid, p_event_kind text,
  p_label text, p_page_path text, p_ip inet, p_device text, p_network_key text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare k text; n integer; minute timestamptz := date_trunc('minute', now());
begin
  if p_network_key is null or length(p_network_key) != 64 then
    raise exception 'Invalid activity key';
  end if;
  foreach k in array array['global', p_network_key] loop
    insert into public.kit_activity_limits as lim (key, window_start, attempts)
    values (k, minute, 1)
    on conflict (key) do update set
      attempts = case when lim.window_start = minute then lim.attempts + 1 else 1 end,
      window_start = minute
    returning attempts into n;
    if n > (case when k = 'global' then 3000 else 120 end) then return false; end if;
  end loop;
  insert into public.kit_activity(id,gym_id,session_id,event_kind,label,page_path,ip_address,device)
    values(p_id,p_gym_id,p_session_id,p_event_kind,p_label,p_page_path,p_ip,p_device)
    on conflict (id) do nothing;
  return true;
end;
$$;
revoke all on function public.record_kit_activity(uuid,uuid,uuid,text,text,text,inet,text,text) from public, anon, authenticated;
grant execute on function public.record_kit_activity(uuid,uuid,uuid,text,text,text,inet,text,text) to service_role;

create function public.get_kit_activity(
  p_days integer default 7, p_gym_id uuid default null,
  p_kind text default null, p_session_id uuid default null, p_offset integer default 0
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not coalesce(public.has_role((select auth.uid()), 'admin'), false) then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  if p_days not in (1,7,30) or p_offset < 0 or p_offset > 100000 then
    raise exception 'Invalid activity filters';
  end if;
  with filtered as materialized (
    select a.*, g.code as gym_code from public.kit_activity a
      join public.gyms g on g.id=a.gym_id
    where a.created_at >= now() - make_interval(days=>p_days)
      and (p_gym_id is null or a.gym_id=p_gym_id)
      and (p_kind is null or a.event_kind=p_kind)
      and (p_session_id is null or a.session_id=p_session_id)
  ), page as (
    select id,created_at,gym_code,session_id,event_kind,label,page_path,
      host(ip_address) as ip_address,device from filtered
    order by created_at desc,id desc offset p_offset limit 100
  )
  select jsonb_build_object(
    'total',(select count(*) from filtered),
    'sessions',(select count(distinct session_id) from filtered),
    'visits',(select count(*) from filtered where event_kind='visit'),
    'previews',(select count(*) from filtered where event_kind='preview'),
    'downloads',(select count(*) from filtered where event_kind='download_ready'),
    'rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_kit_activity(integer,uuid,text,uuid,integer) from public, anon;
grant execute on function public.get_kit_activity(integer,uuid,text,uuid,integer) to authenticated;

create extension if not exists pg_cron;
select cron.schedule('prune-kit-activity', '25 3 * * *',
  $job$delete from public.kit_activity where created_at < now() - interval '30 days';
  delete from public.kit_activity_limits where window_start < now() - interval '1 day';$job$);
