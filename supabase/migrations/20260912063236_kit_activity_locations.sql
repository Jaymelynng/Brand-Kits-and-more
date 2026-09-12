create table public.kit_activity_locations (
  ip_address inet primary key,
  city text,
  region text,
  country text,
  country_code text,
  network text,
  checked_at timestamptz not null,
  retry_after timestamptz not null
);
alter table public.kit_activity_locations enable row level security;
revoke all on public.kit_activity_locations from public, anon, authenticated;
grant select on public.kit_activity_locations to authenticated;
grant all on public.kit_activity_locations to service_role;
create policy "Only administrators can read location estimates"
  on public.kit_activity_locations for select to authenticated
  using (public.has_role((select auth.uid()), 'admin') and checked_at >= now() - interval '30 days');

create index kit_activity_ip_created_idx on public.kit_activity(ip_address, created_at desc);
-- Only recorded addresses in the reporting window can be enriched.
create function public.get_kit_activity_location_ips(p_ips inet[])
returns table(ip_address text) language sql stable security invoker set search_path='' as $$
  select distinct host(a.ip_address) from public.kit_activity a
  where a.ip_address = any(p_ips) and a.created_at >= now() - interval '30 days'
    and cardinality(p_ips) between 1 and 20;
$$;
revoke all on function public.get_kit_activity_location_ips(inet[]) from public, anon, authenticated;
grant execute on function public.get_kit_activity_location_ips(inet[]) to service_role;

select cron.schedule('prune-kit-activity-locations', '35 3 * * *',
  $job$delete from public.kit_activity_locations l where checked_at < now() - interval '30 days'
  or not exists(select 1 from public.kit_activity a where a.ip_address=l.ip_address
    and a.created_at >= now() - interval '30 days');$job$);
