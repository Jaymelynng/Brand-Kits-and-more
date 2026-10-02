-- Maintenance connection only. All fixtures roll back.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.user_roles where role='admin' limit 1),true);
set local role authenticated;
do $$
declare g uuid; d uuid; gym uuid; other_gym uuid; a uuid; n integer; batch jsonb;
begin
 select id into gym from public.gyms order by id limit 1;
 select id into other_gym from public.gyms where id<>gym order by id limit 1;
 insert into public.variation_galleries(gym_id,title,slug,is_published) values(gym,'Permission test',gen_random_uuid()::text,true) returning id into g;
 insert into public.variation_galleries(gym_id,title,slug) values(gym,'Draft test',gen_random_uuid()::text) returning id into d;
 perform set_config('test.gallery',g::text,true); perform set_config('test.draft',d::text,true);
 batch := jsonb_build_array(jsonb_build_object('title','Test image','filename','test.png','file_url','https://example.invalid/test.png','thumbnail_url','https://example.invalid/preview.webp','sha256',repeat('a',64),'bytes',10,'width',10,'height',10,'has_alpha',true));
 n:=public.add_variation_gallery_assets(g,batch);
 if n<>1 or public.add_variation_gallery_assets(g,batch)<>0 then raise exception 'Attachment deduplication failed'; end if;
 select asset_id into a from public.variation_gallery_items where gallery_id=g;
 perform set_config('test.asset',a::text,true);
 perform public.add_variation_gallery_assets(d,batch);
 -- A bad second item must roll back the first item in its batch.
 batch:=jsonb_build_array((batch->0)||jsonb_build_object('sha256',repeat('b',64)),(batch->0)||jsonb_build_object('sha256',repeat('c',64),'width',-1));
 begin
   perform public.add_variation_gallery_assets(g,batch);
   raise exception 'Invalid batch was accepted';
 exception when check_violation then null; end;
 if exists(select 1 from public.variation_assets where gym_id=gym and sha256=repeat('b',64)) then raise exception 'Partial batch retained'; end if;
 begin
   insert into public.variation_gallery_items(gallery_id,asset_id,gym_id,title) values(g,a,other_gym,'Wrong gym');
   raise exception 'Cross-gym attachment was accepted';
 exception when foreign_key_violation then null; when unique_violation then
   -- Use a second gallery to test the composite FK without primary-key conflict.
   insert into public.variation_galleries(gym_id,title,slug) values(other_gym,'Other gym',gen_random_uuid()::text) returning id into d;
   begin
    insert into public.variation_gallery_items(gallery_id,asset_id,gym_id,title) values(d,a,other_gym,'Wrong gym');
    raise exception 'Cross-gym attachment was accepted';
   exception when foreign_key_violation then null; end;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 if (select count(*) from public.variation_galleries where id=current_setting('test.gallery')::uuid)<>1 then raise exception 'Public gallery unreadable'; end if;
 if exists(select 1 from public.variation_galleries where id=current_setting('test.draft')::uuid) then raise exception 'Draft exposed'; end if;
 if (select count(*) from public.variation_gallery_items where gallery_id=current_setting('test.gallery')::uuid)<>1 then raise exception 'Published membership unreadable'; end if;
 if exists(select 1 from public.variation_gallery_items where gallery_id=current_setting('test.draft')::uuid) then raise exception 'Draft membership exposed'; end if;
 if (select count(*) from public.variation_assets where id=current_setting('test.asset')::uuid)<>1 then raise exception 'Published file unreadable'; end if;
 begin
  update public.variation_galleries set title='Forbidden' where id=current_setting('test.gallery')::uuid;
  raise exception 'Anonymous write accepted';
 exception when insufficient_privilege then null; end;
 begin
  perform public.add_variation_gallery_assets(current_setting('test.gallery')::uuid,'[]');
  raise exception 'Anonymous RPC accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ declare n integer; begin
 update public.variation_galleries set title='Forbidden' where id=current_setting('test.gallery')::uuid;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Non-admin update accepted'; end if;
 begin
  perform public.add_variation_gallery_assets(current_setting('test.gallery')::uuid,'[]');
  raise exception 'Non-admin RPC accepted';
 exception when insufficient_privilege then null; end;
 if exists(select 1 from public.variation_galleries where id=current_setting('test.draft')::uuid) then raise exception 'Non-admin draft exposed'; end if;
end $$;
rollback;
select 'PASS: admin save, duplicates, atomic rollback, gym isolation, public read, private drafts, anonymous and non-admin write denial; no fixtures retained' as result;
