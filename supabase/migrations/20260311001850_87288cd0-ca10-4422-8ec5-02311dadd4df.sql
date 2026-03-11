-- Remove MGC duplicate (non-main Metro.jpg)
DELETE FROM public.gym_asset_assignments WHERE asset_id = 'a2315f23-657a-4d10-bd84-f878f41921b9';
DELETE FROM public.gym_assets WHERE id = 'a2315f23-657a-4d10-bd84-f878f41921b9';