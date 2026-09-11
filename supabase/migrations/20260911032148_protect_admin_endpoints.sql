-- Shared counters prevent parallel Edge isolates from bypassing PIN limits.
create table public.kit_auth_attempts (
  key text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts >= 0)
);
alter table public.kit_auth_attempts enable row level security;
revoke all on public.kit_auth_attempts from public, anon, authenticated;
grant all on public.kit_auth_attempts to service_role;

create function public.consume_pin_attempt(p_client_key text)
returns integer language plpgsql security invoker set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_key text;
  v_start timestamptz;
  v_count integer;
  v_limit integer;
  v_window interval;
begin
  if p_client_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid attempt key' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(82503317);
  delete from public.kit_auth_attempts where window_start < v_now - interval '1 day';
  foreach v_key in array array['global', p_client_key] loop
    v_limit := case when v_key = 'global' then 20 else 5 end;
    v_window := case when v_key = 'global' then interval '1 hour' else interval '15 minutes' end;
    select window_start, attempts into v_start, v_count from public.kit_auth_attempts where key = v_key;
    if found and v_start + v_window > v_now and v_count >= v_limit then
      return greatest(1, ceil(extract(epoch from v_start + v_window - v_now))::integer);
    end if;
  end loop;
  foreach v_key in array array['global', p_client_key] loop
    v_window := case when v_key = 'global' then interval '1 hour' else interval '15 minutes' end;
    insert into public.kit_auth_attempts(key,window_start,attempts) values(v_key,v_now,1)
    on conflict(key) do update set
      attempts = case when kit_auth_attempts.window_start + v_window <= v_now then 1 else kit_auth_attempts.attempts + 1 end,
      window_start = case when kit_auth_attempts.window_start + v_window <= v_now then v_now else kit_auth_attempts.window_start end;
  end loop;
  return 0;
end;
$function$;
revoke all on function public.consume_pin_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_pin_attempt(text) to service_role;
alter policy "Allow public read asset_comments" on public.asset_comments to authenticated
  using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));

-- Keep public reads and admin mutations as separate, non-overlapping policies.
drop policy "Admins write gym_logo_tags" on public.gym_logo_tags;
create policy "Admins insert gym_logo_tags" on public.gym_logo_tags for insert to authenticated with check (public.has_role((select auth.uid()),'admin'));
create policy "Admins update gym_logo_tags" on public.gym_logo_tags for update to authenticated using (public.has_role((select auth.uid()),'admin')) with check (public.has_role((select auth.uid()),'admin'));
create policy "Admins delete gym_logo_tags" on public.gym_logo_tags for delete to authenticated using (public.has_role((select auth.uid()),'admin'));
drop policy "Admins write logo_tags" on public.logo_tags;
create policy "Admins insert logo_tags" on public.logo_tags for insert to authenticated with check (public.has_role((select auth.uid()),'admin'));
create policy "Admins update logo_tags" on public.logo_tags for update to authenticated using (public.has_role((select auth.uid()),'admin')) with check (public.has_role((select auth.uid()),'admin'));
create policy "Admins delete logo_tags" on public.logo_tags for delete to authenticated using (public.has_role((select auth.uid()),'admin'));
