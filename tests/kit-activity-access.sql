-- Run through the administrative SQL connection. Every fixture rolls back.
begin;
create temp table activity_checks(name text, passed boolean);
grant select,insert on activity_checks to anon,authenticated,service_role;
create temp table activity_fixture as select id,code,gen_random_uuid() as session_id from public.gyms order by id limit 1;
grant select on activity_fixture to anon,authenticated,service_role;

set local role anon;
do $$ begin
  begin perform * from public.kit_activity; raise exception 'Public activity access was allowed';
  exception when insufficient_privilege then null; end;
  begin perform public.get_kit_activity(); raise exception 'Public report access was allowed';
  exception when insufficient_privilege then null; end;
  begin perform * from public.kit_activity_preferences; raise exception 'Public preferences access was allowed';
  exception when insufficient_privilege then null; end;
  begin perform public.set_kit_activity_filter(true); raise exception 'Public filter write was allowed';
  exception when insufficient_privilege then null; end;
end $$;
insert into activity_checks values ('Public IPs and reports are inaccessible',true);
reset role;

do $$ begin perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true); end $$;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.kit_activity) then raise exception 'Non-admin activity access'; end if;
  if exists(select 1 from public.kit_activity_preferences) then raise exception 'Non-admin preference access'; end if;
  begin perform public.set_kit_activity_filter(true); raise exception 'Non-admin filter write';
  exception when insufficient_privilege then null; end;
  begin perform public.get_kit_activity(); raise exception 'Non-admin report access';
  exception when insufficient_privilege then null; end;
  begin insert into public.kit_activity select * from public.kit_activity limit 0;
    raise exception 'Browser insert permitted'; exception when insufficient_privilege then null; end;
end $$;
insert into activity_checks values('Signed-in non-admins cannot read or write activity',true);
reset role;

insert into public.kit_activity(id,gym_id,session_id,event_kind,label,page_path,ip_address,device)
 select gen_random_uuid(),f.id,f.session_id,'click','Verification fixture','/kit/'||f.code,'192.0.2.1','Desktop'
 from activity_fixture f cross join generate_series(1,205);
insert into public.kit_activity(id,created_at,gym_id,session_id,event_kind,label,page_path,ip_address,device)
 select gen_random_uuid(),now()-interval '40 days',id,session_id,'visit','Old fixture','/kit/'||code,'192.0.2.1','Desktop' from activity_fixture;
do $$ begin perform set_config('request.jwt.claim.sub',(select user_id::text from public.user_roles where role='admin' limit 1),true); end $$;
set local role authenticated;
do $$ declare r jsonb; s uuid; begin
  select session_id into s from activity_fixture;
  r:=public.get_kit_activity(30,null,null,s,0);
  if (r->>'total')::int<>205 or jsonb_array_length(r->'rows')<>100 then raise exception 'Bad report or retention filter'; end if;
  if not ((r->'rows'->0) ? 'ip_address') then raise exception 'Admin report missing IP'; end if;
  r:=public.get_kit_activity(30,null,null,s,200);
  if jsonb_array_length(r->'rows')<>5 then raise exception 'Pagination failed'; end if;
  r:=public.get_kit_activity(30,null,'preview',s,0);
  if (r->>'total')::int<>0 then raise exception 'Event filtering failed'; end if;
end $$;
insert into activity_checks values ('Admin reporting, session filters, pagination and age limits work',true);
reset role;

-- Keep unknown addresses and unrelated networks visible, with all totals filtered.
insert into public.kit_activity(id,gym_id,session_id,event_kind,label,page_path,ip_address,device)
 select gen_random_uuid(),f.id,f.session_id,v.kind,'Filter fixture','/kit/'||f.code,v.ip::inet,'Desktop'
 from activity_fixture f cross join (values
  ('visit',null),('preview','192.0.2.2'),('download_ready','2001:db8::1')) v(kind,ip);
insert into public.kit_activity_preferences(user_id,hide_own_activity,hidden_ips)
 values ((select auth.uid()),false,array['192.0.2.1'::inet,'2001:db8::1'::inet])
 on conflict (user_id) do update set hide_own_activity=false,hidden_ips=excluded.hidden_ips;
set local role authenticated;
do $$ declare r jsonb; s uuid; before_count int; begin
  select session_id into s from activity_fixture;
  before_count := (select count(*) from public.kit_activity where session_id=s);
  perform public.set_kit_activity_filter(true);
  r:=public.get_kit_activity(30,null,null,s,0);
  if (r->>'total')::int<>2 or (r->>'sessions')::int<>1
    or (r->>'visits')::int<>1 or (r->>'previews')::int<>1 or (r->>'downloads')::int<>0
    or jsonb_array_length(r->'rows')<>2 then raise exception 'Hidden report totals failed'; end if;
  if exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'ip_address' in ('192.0.2.1','2001:db8::1'))
    then raise exception 'Hidden IP leaked into report'; end if;
  if (r->'own_activity'->>'hidden')::boolean is distinct from true
    or jsonb_array_length(r->'own_activity'->'ips')<>2 then raise exception 'Saved preference not returned'; end if;
  if not exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'ip_address' is null)
    then raise exception 'Unknown address was hidden'; end if;
  r:=public.get_kit_activity(30,null,null,s,100);
  if jsonb_array_length(r->'rows')<>0 or (r->>'total')::int<>2 then raise exception 'Hidden pagination failed'; end if;
  perform public.set_kit_activity_filter(false);
  r:=public.get_kit_activity(30,null,null,s,200);
  if (r->>'total')::int<>208 or jsonb_array_length(r->'rows')<>8
    or (r->>'downloads')::int<>1 or (r->'own_activity'->>'hidden')::boolean is distinct from false
    then raise exception 'Turning filter off did not restore report'; end if;
  if before_count<>(select count(*) from public.kit_activity where session_id=s)
    then raise exception 'Filter modified activity history'; end if;
  if exists(select 1 from public.kit_activity_preferences where user_id<>(select auth.uid()))
    then raise exception 'Another account preference was visible'; end if;
end $$;
insert into activity_checks values('Saved IP filter updates totals and pagination, preserves unknown IPs and restores history',true);
reset role;

set local role service_role;
do $$ declare f record; i int; ok boolean; event_id uuid:=gen_random_uuid(); begin
  select * into f from activity_fixture;
  for i in 1..121 loop
    ok:=public.record_kit_activity(event_id,f.id,f.session_id,'click','Rate test','/kit/'||f.code,'192.0.2.1','Desktop',repeat('a',64));
    if ok is distinct from (i<=120) then raise exception 'Rate limit failed at %',i; end if;
  end loop;
  if (select count(*) from public.kit_activity where id=event_id)<>1 then raise exception 'Duplicate event was recorded'; end if;
end $$;
insert into activity_checks values('Retries deduplicate and atomic rate limits apply',true);
reset role;
do $$ begin
  if not exists(select 1 from cron.job where jobname='prune-kit-activity' and active) then raise exception 'Retention job not enabled'; end if;
end $$;
insert into activity_checks values('Daily data expiry is scheduled',true);
select * from activity_checks;
rollback;
