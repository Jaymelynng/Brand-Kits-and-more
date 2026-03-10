

## Restore Missing Hero Videos

**Problem:** 4 gyms (CRR, EAG, MGC, PLG) have `NULL` `hero_video_url` values. The database was previously populated but these got cleared. There are 10 video files in the `campaign-assets` storage bucket but only 9 are assigned — 2 are unassigned.

**Current state:**
- 9 gyms have video URLs assigned
- 2 storage files are unassigned:
  - `...109534-0.2718539214063934.`
  - `...111800-0.09521350462731071.`
- 4 gyms missing: CRR, EAG, MGC, PLG
- Per memory, some gyms shared/duplicated videos originally

**Plan:**

1. **Run SQL UPDATE** to assign the 2 unassigned video URLs to 2 of the 4 missing gyms
2. **Duplicate existing video URLs** for the remaining 2 gyms (as was done originally — the memory notes CCP/SGT shared a video)
3. Since we can't know the exact original mapping, I'll assign the unassigned files to EAG and MGC, and duplicate existing videos for CRR and PLG

**SQL to execute:**
```sql
-- Assign unassigned video 1 to EAG
UPDATE gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013109534-0.2718539214063934.' WHERE code = 'EAG';

-- Assign unassigned video 2 to MGC
UPDATE gyms SET hero_video_url = 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/campaign-assets/5d5f7a40-d104-456e-b270-dd0ecfb91779-admin-1763013111800-0.09521350462731071.' WHERE code = 'MGC';

-- Duplicate CCP's video for CRR (same Capital Gymnastics brand)
UPDATE gyms SET hero_video_url = (SELECT hero_video_url FROM gyms WHERE code = 'CCP') WHERE code = 'CRR';

-- Duplicate SGT's video for PLG
UPDATE gyms SET hero_video_url = (SELECT hero_video_url FROM gyms WHERE code = 'SGT') WHERE code = 'PLG';
```

4. **Verify** all 13 gyms have non-null `hero_video_url` after the update

No code changes needed — the `GymProfile.tsx` rendering logic is correct and will show the video once the data is restored.

