-- Preserve public downloads; all asset mutations require an administrator.
-- User roles are protected by their existing self-read policy, so this helper
-- needs no privilege elevation and cannot inspect another person's role.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security invoker set search_path = ''
as $function$
 select _user_id = (select auth.uid()) and exists (
   select 1 from public.user_roles where user_id = _user_id and role = _role
 );
$function$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update, delete on public.user_roles from authenticated;
alter policy "Admins can delete admin_pins" on public."admin_pins" to authenticated using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert admin_pins" on public."admin_pins" to authenticated with check (has_role((select auth.uid()), 'admin'::app_role));
drop policy "Users can view own admin_pins" on public."admin_pins";
drop policy "Admins can view all admin_pins" on public."admin_pins";
alter policy "Admins can update admin_pins" on public."admin_pins" to authenticated using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can delete asset_categories" on public."asset_categories" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert asset_categories" on public."asset_categories" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read asset_categories" on public."asset_categories" using (true);
alter policy "Admins can update asset_categories" on public."asset_categories" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Users can delete own asset_comments" on public."asset_comments" using ((((select auth.uid()) = user_id) OR has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Authenticated can insert asset_comments" on public."asset_comments" with check (((select auth.uid()) = user_id));
alter policy "Allow public read asset_comments" on public."asset_comments" to authenticated using (public.has_role((select auth.uid()), 'admin'::public.app_role));
alter policy "Admins can delete asset_theme_tags" on public."asset_theme_tags" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert asset_theme_tags" on public."asset_theme_tags" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read asset_theme_tags" on public."asset_theme_tags" using (true);
alter policy "Admins can delete asset_types" on public."asset_types" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert asset_types" on public."asset_types" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read asset_types" on public."asset_types" using (true);
alter policy "Admins can update asset_types" on public."asset_types" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
drop policy "Admins can manage brand records" on public."brands";
alter policy "Public can read brand records" on public."brands" using (true);
alter policy "Admins can delete gym_asset_assignments" on public."gym_asset_assignments" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert gym_asset_assignments" on public."gym_asset_assignments" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read gym_asset_assignments" on public."gym_asset_assignments" using (true);
alter policy "Admins can update gym_asset_assignments" on public."gym_asset_assignments" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can delete gym_assets" on public."gym_assets" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert gym_assets" on public."gym_assets" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read gym_assets" on public."gym_assets" using (true);
alter policy "Admins can update gym_assets" on public."gym_assets" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can delete gym_colors" on public."gym_colors" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert gym_colors" on public."gym_colors" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read gym_colors" on public."gym_colors" using (true);
alter policy "Admins can update gym_colors" on public."gym_colors" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can delete gym_elements" on public."gym_elements" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert gym_elements" on public."gym_elements" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read gym_elements" on public."gym_elements" using (true);
alter policy "Admins can update gym_elements" on public."gym_elements" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins delete gym_font_pairings" on public."gym_font_pairings" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins insert gym_font_pairings" on public."gym_font_pairings" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read gym_font_pairings" on public."gym_font_pairings" using (true);
alter policy "Admins update gym_font_pairings" on public."gym_font_pairings" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins write gym_logo_tags" on public."gym_logo_tags" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read gym_logo_tags" on public."gym_logo_tags" using (true);
alter policy "Admins can delete gym_logos" on public."gym_logos" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert gym_logos" on public."gym_logos" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read gym_logos" on public."gym_logos" using ((lower(coalesce(variant, '')) <> 'retired' OR public.has_role((select auth.uid()), 'admin'::public.app_role)));
alter policy "Admins can update gym_logos" on public."gym_logos" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can delete gyms" on public."gyms" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert gyms" on public."gyms" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read gyms" on public."gyms" using (true);
alter policy "Admins can update gyms" on public."gyms" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can delete logo_categories" on public."logo_categories" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert logo_categories" on public."logo_categories" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read logo_categories" on public."logo_categories" using (true);
alter policy "Admins can update logo_categories" on public."logo_categories" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins write logo_tags" on public."logo_tags" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read logo_tags" on public."logo_tags" using (true);
alter policy "Admins can do everything with personal_brand_colors" on public."personal_brand_colors" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can manage brand images" on public."personal_brand_images" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can do everything with personal_brand_info" on public."personal_brand_info" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can delete qr_generated" on public."qr_generated" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert qr_generated" on public."qr_generated" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read qr_generated" on public."qr_generated" using (true);
alter policy "Admins can update qr_generated" on public."qr_generated" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can delete qr_scans" on public."qr_scans" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert qr_scans" on public."qr_scans" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read qr_scans" on public."qr_scans" to authenticated using (public.has_role((select auth.uid()), 'admin'::public.app_role));
alter policy "Admins can update qr_scans" on public."qr_scans" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can delete theme_tags" on public."theme_tags" using (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can insert theme_tags" on public."theme_tags" with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Allow public read theme_tags" on public."theme_tags" using (true);
alter policy "Admins can update theme_tags" on public."theme_tags" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Admins can access logo recovery snapshot" on public."tig_variant_snapshot_20260910" using (has_role((select auth.uid()), 'admin'::app_role)) with check (has_role((select auth.uid()), 'admin'::app_role));
alter policy "Users can view own profile" on public."user_profiles" to authenticated using (((select auth.uid()) = id));
alter policy "Users can update own profile" on public."user_profiles" to authenticated using (((select auth.uid()) = id)) with check (((select auth.uid()) = id));
alter policy "Users can view own roles" on public."user_roles" to authenticated using (((select auth.uid()) = user_id));
alter policy "Admins can delete flyer templates" on storage."objects" to authenticated using (((bucket_id = 'flyer-templates'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
drop policy "Authenticated users can delete gym logos" on storage."objects";
alter policy "Admins can delete campaign-assets" on storage."objects" using (((bucket_id = 'campaign-assets'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Admin delete personal-brand" on storage."objects" using (((bucket_id = 'personal-brand'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Admins can delete email icons" on storage."objects" using (((bucket_id = 'email-icons'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Admins can delete gym logos" on storage."objects" using (((bucket_id = 'gym-logos'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
drop policy "Allow public uploads to gym-logos" on storage."objects";
drop policy "Allow all users to upload gym logos" on storage."objects";
alter policy "Admins can upload flyer templates" on storage."objects" to authenticated with check (((bucket_id = 'flyer-templates'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Admins can upload email icons" on storage."objects" with check (((bucket_id = 'email-icons'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Admins can upload gym logos" on storage."objects" with check (((bucket_id = 'gym-logos'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Admins can upload campaign-assets" on storage."objects" with check (((bucket_id = 'campaign-assets'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
drop policy "Allow public uploads to campaign-assets" on storage."objects";
alter policy "Admin upload personal-brand" on storage."objects" with check (((bucket_id = 'personal-brand'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Allow public read campaign-assets" on storage."objects" using ((bucket_id = 'campaign-assets'::text));
alter policy "Public can view flyer templates" on storage."objects" using ((bucket_id = 'flyer-templates'::text));
alter policy "Public can view gym logos" on storage."objects" using ((bucket_id = 'gym-logos'::text));
alter policy "Public read personal-brand" on storage."objects" using ((bucket_id = 'personal-brand'::text));
alter policy "Public can view email icons" on storage."objects" using ((bucket_id = 'email-icons'::text));
drop policy "Anyone can view gym logos" on storage."objects";
alter policy "Admins can update gym logos" on storage."objects" using (((bucket_id = 'gym-logos'::text) AND has_role((select auth.uid()), 'admin'::app_role))) with check (((bucket_id = 'gym-logos'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Admins can update campaign-assets" on storage."objects" using (((bucket_id = 'campaign-assets'::text) AND has_role((select auth.uid()), 'admin'::app_role))) with check (((bucket_id = 'campaign-assets'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Admins can update flyer templates" on storage."objects" to authenticated using (((bucket_id = 'flyer-templates'::text) AND has_role((select auth.uid()), 'admin'::app_role))) with check (((bucket_id = 'flyer-templates'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
alter policy "Admins can update email icons" on storage."objects" using (((bucket_id = 'email-icons'::text) AND has_role((select auth.uid()), 'admin'::app_role))) with check (((bucket_id = 'email-icons'::text) AND has_role((select auth.uid()), 'admin'::app_role)));
drop policy "Authenticated users can update gym logos" on storage."objects";
create policy "Read own pin or administer pins" on public.admin_pins for select to authenticated using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));
create policy "Admins insert brands" on public.brands for insert to authenticated with check (public.has_role((select auth.uid()), 'admin'));
create policy "Admins update brands" on public.brands for update to authenticated using (public.has_role((select auth.uid()), 'admin')) with check (public.has_role((select auth.uid()), 'admin'));
create policy "Admins delete brands" on public.brands for delete to authenticated using (public.has_role((select auth.uid()), 'admin'));
create index if not exists asset_categories_asset_type_id_idx on public.asset_categories(asset_type_id);
create index if not exists asset_comments_asset_id_idx on public.asset_comments(asset_id);
create index if not exists asset_comments_gym_mention_id_idx on public.asset_comments(gym_mention_id);
create index if not exists asset_comments_user_id_idx on public.asset_comments(user_id);
create index if not exists asset_theme_tags_theme_tag_id_idx on public.asset_theme_tags(theme_tag_id);
create index if not exists gym_asset_assignments_gym_id_idx on public.gym_asset_assignments(gym_id);
create index if not exists gym_assets_asset_type_id_idx on public.gym_assets(asset_type_id);
create index if not exists gym_assets_category_id_idx on public.gym_assets(category_id);
create index if not exists qr_generated_gym_id_idx on public.qr_generated(gym_id);
alter table public.tig_variant_snapshot_20260910 add primary key(id);
create unique index if not exists gym_logos_one_featured_per_gym on public.gym_logos(gym_id) where is_main_logo;

-- Choosing a display logo is one transaction: failure cannot blank the old logo.
create or replace function public.set_featured_gym_logo(p_gym_id uuid, p_logo_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_gym_id::text, 0));
  perform id from public.gym_logos where gym_id = p_gym_id order by id for update;
  if not exists(select 1 from public.gym_logos where id = p_logo_id and gym_id = p_gym_id) then
    raise exception 'This logo does not belong to this gym.' using errcode = '22023';
  end if;
  update public.gym_logos set is_main_logo = false where gym_id = p_gym_id and is_main_logo;
  update public.gym_logos set is_main_logo = true, variant = 'Primary logos' where id = p_logo_id and gym_id = p_gym_id;
end;
$function$;
revoke all on function public.set_featured_gym_logo(uuid,uuid) from public, anon;
grant execute on function public.set_featured_gym_logo(uuid,uuid) to authenticated, service_role;

