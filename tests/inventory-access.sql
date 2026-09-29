-- Run as the maintenance connection. All fixtures and changes roll back.
begin;
select set_config('request.jwt.claim.sub', (select user_id::text from public.user_roles where role = 'admin' limit 1), true);
set local role authenticated;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); changes jsonb; result integer; element_row jsonb; asset_row jsonb;
begin
  insert into public.gym_logos(id,filename,file_url,variant) values
    (a,'Inventory test A.png','https://example.test/a.png','Uncategorized'),
    (b,'Inventory test B.png','https://example.test/b.png','Uncategorized');
  changes := jsonb_build_array(jsonb_build_object('source','gym_logos','id',a,'before',jsonb_build_object('filename','Inventory test A.png'),'after',jsonb_build_object('filename','Renamed A.png')),
    jsonb_build_object('source','gym_logos','id',b,'before',jsonb_build_object('filename','Inventory test B.png'),'after',jsonb_build_object('filename','Renamed B.png')));
  result := public.edit_inventory_items(changes);
  if result <> 2 or (select count(*) from public.gym_logos where id in (a,b) and filename like 'Renamed%') <> 2 then raise exception 'Batch save failed'; end if;
  begin
    perform public.edit_inventory_items(changes);
    raise exception 'Stale batch was accepted';
  exception when serialization_failure then null; end;
  -- A later stale record must roll back earlier writes in that same request.
  changes := (select jsonb_agg(jsonb_build_object('source',e->>'source','id',e->>'id','before',e->'after','after',e->'before')) from jsonb_array_elements(changes)e);
  result := public.edit_inventory_items(changes);
  if result <> 2 or (select count(*) from public.gym_logos where id in (a,b) and filename like 'Inventory test%') <> 2 then raise exception 'Undo failed'; end if;
  begin
    perform public.edit_inventory_items(jsonb_build_array(
      jsonb_build_object('source','gym_logos','id',least(a,b),'before',jsonb_build_object('treatment',null),'after',jsonb_build_object('treatment','must rollback')),
      jsonb_build_object('source','gym_logos','id',greatest(a,b),'before',jsonb_build_object('treatment','wrong expected value'),'after',jsonb_build_object('treatment','must rollback'))));
    raise exception 'Conflicting batch was accepted';
  exception when serialization_failure then null; end;
  if exists(select 1 from public.gym_logos where id in(a,b) and treatment is not null) then raise exception 'Partial write escaped rollback'; end if;
  begin
    perform public.edit_inventory_items(jsonb_build_array(jsonb_build_object('source','gym_logos','id',a,'before',jsonb_build_object('file_url','https://example.test/a.png'),'after',jsonb_build_object('file_url','https://example.test/replacement.png'))));
    raise exception 'URL edit was accepted';
  exception when raise_exception then if sqlerrm <> 'Unsupported field' then raise; end if; end;
  select to_jsonb(e) into element_row from public.gym_elements e order by id limit 1;
  select to_jsonb(s) into asset_row from public.gym_assets s order by id limit 1;
  if element_row is not null and asset_row is not null then
    result := public.edit_inventory_items(jsonb_build_array(
      jsonb_build_object('source','gym_elements','id',element_row->>'id','before',jsonb_build_object('display_name',element_row->'display_name'),'after',jsonb_build_object('display_name','Transaction-only verification')),
      jsonb_build_object('source','gym_assets','id',asset_row->>'id','before',jsonb_build_object('category_id',asset_row->'category_id'),'after',jsonb_build_object('category_id',asset_row->'category_id'))));
    if result <> 2 or (select display_name from public.gym_elements where id=(element_row->>'id')::uuid) <> 'Transaction-only verification' then raise exception 'Mixed source update failed'; end if;
  end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.edit_inventory_items(changes);
    raise exception 'Non-admin edit was accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform public.edit_inventory_items('[]'::jsonb);
    raise exception 'Anonymous execution was accepted';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: atomic save, undo, conflict rollback, immutable URLs, non-admin and anonymous denial; no fixtures retained' as result;
