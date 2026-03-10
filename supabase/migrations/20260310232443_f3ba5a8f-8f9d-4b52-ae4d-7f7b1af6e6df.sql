
-- Restore hero videos for 4 gyms that lost their URLs
UPDATE gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013109534-0.2718539214063934.' WHERE code = 'EAG';

UPDATE gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013111800-0.09521350462731071.' WHERE code = 'MGC';

UPDATE gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013073269-0.761572028765122.' WHERE code = 'CRR';

UPDATE gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013092740-0.9026626806004932.' WHERE code = 'PLG';
