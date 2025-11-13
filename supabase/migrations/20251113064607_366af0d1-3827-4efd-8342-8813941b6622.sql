-- Add hero_video_url column to gyms table
ALTER TABLE public.gyms 
ADD COLUMN hero_video_url TEXT;

-- Map videos to gyms
UPDATE public.gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013073269-0.761572028765122.'
WHERE code = 'CCP';

UPDATE public.gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013100495-0.15141621282145346.'
WHERE code = 'CPF';

UPDATE public.gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013087027-0.2112281657121564.'
WHERE code = 'EST';

UPDATE public.gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013119522-0.08986602195813587.'
WHERE code = 'HGA';

UPDATE public.gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013096737-0.5030000590543175.'
WHERE code = 'OAS';

UPDATE public.gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013104430-0.599704056748673.'
WHERE code = 'RBA';

UPDATE public.gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013083316-0.7000800229696601.'
WHERE code = 'RBK';

UPDATE public.gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013092740-0.9026626806004932.'
WHERE code = 'SGT';

UPDATE public.gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013115663-0.8591998248365768.'
WHERE code = 'TIG';