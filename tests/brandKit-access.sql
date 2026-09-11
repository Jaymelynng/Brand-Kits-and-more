-- Run with an administrative SQL connection after migrations. All fixtures roll back.
begin;
create temp table kit_access_checks(check_name text, passed boolean);
grant select,insert on kit_access_checks to anon,authenticated;
set local role anon;
insert into kit_access_checks select 'public active logos readable',count(*)>0 from public.gym_logos;
insert into kit_access_checks select 'public retired logos hidden',count(*)=0 from public.gym_logos where lower(variant)='retired';
insert into kit_access_checks select 'public notes hidden',count(*)=0 from public.qr_scans;
insert into kit_access_checks select 'public cannot mutate tables',not has_table_privilege('anon','public.gym_logos','INSERT') and not has_table_privilege('anon','public.gym_logos','UPDATE');
do $test$ begin
 begin
  insert into storage.objects(bucket_id,name) values('gym-logos','__codex_permission_probe__');
  raise exception 'Public storage upload was permitted';
 exception when insufficient_privilege then null; end;
end $test$;
insert into kit_access_checks values('public storage upload denied',true);
reset role;
do $test$ begin perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true); end $test$;
set local role authenticated;
do $test$ declare n integer; begin
 begin
  insert into storage.objects(bucket_id,name) values('gym-logos','__codex_permission_probe__');
  raise exception 'Non-admin storage upload was permitted';
 exception when insufficient_privilege then null; end;
 update storage.objects set name=name where bucket_id='gym-logos';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Non-admin could replace storage metadata'; end if;
 begin
  insert into public.gym_logos(gym_id,filename,file_url)
  select id,'__permission_probe__','https://example.invalid/test.png' from public.gyms limit 1;
  raise exception 'Non-admin database write was permitted';
 exception when insufficient_privilege then null; end;
end $test$;
insert into kit_access_checks values('non-admin storage and logo writes denied',true);
reset role;
do $test$ begin perform set_config('request.jwt.claim.sub',(select user_id::text from public.user_roles where role='admin' limit 1),true); end $test$;
set local role authenticated;
insert into kit_access_checks select 'admin retains role',public.has_role(auth.uid(),'admin');
do $test$ declare g uuid; l uuid; before_l uuid; begin
 select gym_id,id into g,l from public.gym_logos where is_main_logo order by id limit 1;
 if l is null then raise exception 'Admin could not read featured logo'; end if;
 perform public.set_featured_gym_logo(g,l);
 begin
   perform public.set_featured_gym_logo(g,gen_random_uuid());
   raise exception 'Invalid featured logo was accepted';
 exception when invalid_parameter_value then null; end;
 select id into before_l from public.gym_logos where gym_id=g and is_main_logo;
 if before_l is distinct from l then raise exception 'Failed operation changed featured logo'; end if;
 insert into storage.objects(bucket_id,name) values('gym-logos','__codex_admin_permission_probe__');
 update storage.objects set name='__codex_admin_permission_probe_renamed__' where bucket_id='gym-logos' and name='__codex_admin_permission_probe__';
end $test$;
insert into kit_access_checks values('admin upload and replace allowed',true),('featured change atomic and invalid target preserves previous logo',true);
select * from kit_access_checks;
rollback;
