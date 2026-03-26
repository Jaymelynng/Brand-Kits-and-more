

## Build QR Studio Inside Bulk Brand Center

Rebuild the QR Studio tool from the separate project directly into this project as a `/qr-studio` route, with improved UI and integration with the existing gym data.

### What Gets Built

**1. Database Tables** (migration)
- `qr_generated` -- stores generated QR codes (content, qr_type, qr_image_url, title, batch_id, batch_name, gym_id, destination_type, tags, notes, created_at)
- `qr_scans` -- stores scanned QR codes (file_name, qr_data, qr_type, is_url, preview_image, notes, tags, created_at)
- RLS: public read, admin insert/update/delete (same pattern as existing tables)

**2. New Package**
- Add `@zxing/library` for QR code scanning/decoding (project already has `qrcode` for generation)

**3. Pages & Components**

| File | Purpose |
|------|---------|
| `src/pages/QRStudio.tsx` | Main page with top nav (Scan / Generate / Library tabs) |
| `src/components/qr-studio/QRStudioLayout.tsx` | Layout wrapper with header nav, styled to match existing app aesthetic |
| `src/components/qr-studio/QRScanner.tsx` | Upload images, decode QR codes, show results with image preview |
| `src/components/qr-studio/QRGenerator.tsx` | Single + Bulk tabs, logo upload, label toggle, live preview, gym selector dropdown |
| `src/components/qr-studio/QRLibrary.tsx` | History with search, filters by gym/destination type/batch, batch grouping, collapsible batches |
| `src/utils/qrGenerator.ts` | QR generation with canvas rendering, logo overlay, label strips (ported from existing) |
| `src/utils/qrScanner.ts` | ZXing-based scanner with sub-region scanning (ported from existing) |
| `src/services/qrService.ts` | Supabase CRUD for qr_generated and qr_scans tables |

**4. Gym Integration (Enhancement Over V1)**
- Gym selector dropdown pulls from existing `gyms` table -- auto-populates logo from `gym_logos`
- Destination type selector: Classes, Waiver, Login, Trial, Camp, Event, Registration
- Bulk mode can auto-match gym logos by name (existing logic preserved)

**5. UI Enhancements Over V1**
- Soft blush/rose accent matching existing app style
- Parse preview table with green/yellow/red row states for URL validation
- QR cards show gym name, destination badge, URL, and quick actions
- Batch summary bar (title, count, date, status)
- Library: search bar, filter chips, batch grouping, download/copy actions

**6. Route + Navigation**
- Add `/qr-studio` route in `App.tsx`
- The page is standalone (has its own nav header) but accessible from the main app
- Back link to home page in the header

### Technical Notes
- Ports all core logic from the `qr-match-spot` project (QR generation, scanning, bulk parsing, history)
- Uses same Supabase instance -- no syncing needed, reads `gyms` and `gym_logos` directly
- Adds `gym_id` and `destination_type` fields to `qr_generated` for gym-aware QR management

