begin;
create temp table rate_checks(name text,passed boolean);
grant insert,select on rate_checks to anon,authenticated,service_role;
set local role anon;
do $$ begin
  begin perform public.consume_pin_attempt(repeat('b',64)); raise exception 'anonymous call accepted';
  exception when insufficient_privilege then insert into rate_checks values('public cannot call limiter',true); end;
end $$;
reset role;
set local role service_role;
-- Test counters only; the transaction rolls back any existing counter state.
delete from public.kit_auth_attempts;
do $$ begin
  for i in 1..5 loop
    if public.consume_pin_attempt(repeat('b',64)) <> 0 then raise exception 'early lockout'; end if;
  end loop;
  insert into rate_checks values('first five permitted',true);
  if public.consume_pin_attempt(repeat('b',64)) < 890 then raise exception 'sixth not blocked'; end if;
  insert into rate_checks values('sixth blocked with retry interval',true);
  update public.kit_auth_attempts set window_start=clock_timestamp()-interval '16 minutes' where key=repeat('b',64);
  if public.consume_pin_attempt(repeat('b',64)) <> 0 then raise exception 'expired counter not reset'; end if;
  insert into rate_checks values('expired client window resets',true);
  update public.kit_auth_attempts set attempts=20 where key='global';
  if public.consume_pin_attempt(repeat('c',64)) < 3590 then raise exception 'global limit bypass'; end if;
  insert into rate_checks values('global cap cannot be bypassed by another address',true);
end $$;
reset role;
select * from rate_checks;
rollback;
