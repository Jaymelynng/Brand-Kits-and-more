alter table public.brands enable row level security;
revoke all on public.brands from anon, authenticated;
grant select on public.brands to anon, authenticated;
grant insert, update, delete on public.brands to authenticated;
create policy "Public can read brand records" on public.brands for select to anon, authenticated using (true);
create policy "Admins can manage brand records" on public.brands for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

alter table public.tig_variant_snapshot_20260910 enable row level security;
revoke all on public.tig_variant_snapshot_20260910 from anon, authenticated;
grant select, insert, update, delete on public.tig_variant_snapshot_20260910 to authenticated;
create policy "Admins can access logo recovery snapshot" on public.tig_variant_snapshot_20260910 for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
