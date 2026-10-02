# Bulk Brand Center

Brand libraries for independently branded gyms, with a shared dashboard for bulk work and a focused public kit for each gym. Gym names, counts, colors, categories and assets come from the database.

**Live:** [Gym Brand Kits](https://brandkits.mygymtools.com/)
**Repository:** [Jaymelynng/Brand-Kits-and-more](https://github.com/Jaymelynng/Brand-Kits-and-more)
**Original Lovable project:** [Project editor](https://lovable.dev/projects/4567f4e3-1d91-48bc-a40a-7900771efd38)

## Sharing and workflow

- **`/kit/:gymCode`** is the external share page. The top strip shows every gym's logo, with the current gym highlighted. The strip is display-only on share pages, so visitors stay on the linked gym's colors, primary-logo carousel, actual font specimens, gallery, graphics and downloads. Home and administrator tools remain on the working pages. TIGAR: [`/kit/TIG`](https://brandkits.mygymtools.com/kit/TIG). The original production hostname redirects to the branded domain and preserves the requested path.
- **`/`** is the dashboard: responsive gym cards, selection, bulk copying of colors or logo links, and per-gym profile, copy and download actions.
- **`/gym/:gymCode`** includes the gym navigation. Authorized administrators can upload, rename, categorize, tag, reorder, change the display logo and edit fonts or colors.
- The primary carousel supports thumbnails, arrows, dragging and pause/resume. Rotation pauses during inspection, while offscreen, behind a preview, and when the tab is hidden. Reduced-motion preference disables automatic rotation and depth animation.
- The gallery's Browse kit rail links directly to graphics, colors and fonts. Graphics provides return links to the other sections. Section jumps preserve the page and move keyboard focus to the destination; reduced-motion preference disables smooth scrolling.
- Preview opens the original image or animation and measures its dimensions, format and transparency. Graphics use the same viewer with email and phone preview widths, light/dark and palette backgrounds, original downloads and next/previous navigation. Previews scale down when the screen is narrower than the requested width. Preview choices do not change the downloaded file.
- The public gallery excludes Retired and Needs review artwork and hides empty categories. Administrators keep empty filing categories. Retired database rows are also hidden by RLS from non-admins. These visibility rules do not revoke previously shared public storage URLs.

## Downloads

### Named variation galleries

**Variation galleries** is a section inside each gym's kit and working profile. Each named collection has its own `/kit/:gymCode/variations/:gallerySlug` share link. A visitor can browse, filter by real transparency/background or reference role, select across pages, compare two to four images, preview original files and download one image or a selected/full ZIP. The page adapts to one, two or four images per page to keep browsing compact. Galleries are separate from `gym_logos`: inclusion does not approve artwork, change the featured logo, or add review options to the normal brand-kit PDF/ZIP.

Administrators use **New gallery** on a working gym page, name the collection, add multiple PNG/JPG/WebP files, edit its details and make it shareable. New collections start as drafts. Read-only kit routes hide editing even for an administrator. Draft collection records are admin-only, but files in public Storage or repository paths remain public by URL. Returning a gallery to draft does not revoke those original URLs.

`variation_galleries` owns gym, stable slug, title, description and visibility. `variation_assets` owns each original's URL, thumbnail URL, SHA-256, byte count, measured dimensions and alpha information, deduplicated per gym by checksum. `variation_gallery_items` owns membership, display title, order and reference role; composite foreign keys prevent cross-gym attachment. `add_variation_gallery_assets` saves the entire attachment batch atomically. Storage uploads precede this transaction; a failed save reports the failure, and retrying the same files reuses verified immutable bytes rather than replacing them. Uploads are limited to 100 files per batch and 30 MB per file. Gallery ZIPs are capped at 512 MB and reject a failed fetch or checksum mismatch without saving a partial archive.

TIGAR's **GYMNASTICS wordmark options** collection contains the 22 unique originals from the 25 supplied attachments: three exact duplicate copies were identified by SHA-256 and shown once. One comparison board is labeled as a reference. Originals total 28,697,070 bytes; prepared previews total 758,114 bytes. The transfer ledger preserves source provenance. `assets/generated/tig-gymnastics-wordmarks-gallery.json` records this preparation batch, not a live roster or substitute for current assignments. `scripts/stage-variation-gallery.py` stages declared sources with Pillow, preserves originals, refuses conflicting destinations and retains existing batch captions/order on reruns. It does not register or deploy assets. New in-app uploads use the existing `gym-logos` Storage bucket under immutable `variations/<gym-id>/<sha256>/` paths.

Implementation: `VariationGalleriesSection.tsx`, `pages/VariationGallery.tsx`, `hooks/useVariationGalleries.ts` and `lib/variationGalleryFiles.ts`. Access/atomicity verification lives in `tests/variation-gallery-access.sql` and rolls back every fixture. The local rendered gallery, comparison, filters, page selection and selected/full ZIPs were checked; all 22 downloaded original hashes matched the saved batch. Administrator batch-saving and role boundaries were tested through SQL; the browser upload/create controls still require a signed-in administrator smoke test. This addition leaves the separately disputed inventory-manager redesign open.

**Download brand kit** exports one ZIP with:

- Every active logo in its original format, grouped by its saved category, including email logos, variations, themed artwork and animation.
- Saved dividers and supporting graphics.
- Adapted campaign examples where supplied, with source dates and a clear distinction from current offers or send-ready emails.
- A visual PDF guide, actual font files where bundled, their licenses and source links.
- HEX/RGB palettes as text, JSON, CSS and GPL.
- A contents inventory with source URLs, measured file details and SHA-256 hashes.

**PDF guide** downloads the same guide separately. Logo-only and filtered downloads create separate ZIPs. Required-file failures stop the export with an error instead of silently returning an incomplete archive. Same-name files receive unique archive paths.

The guide presents logo placement, email treatments, color combinations, font specimens, selected graphics in context and adapted campaign compositions. It does not duplicate the complete asset catalog. The **Brand in use** panel opens examples in a compact viewer beside the existing download controls. Curated roles and example provenance live in `public/brand-examples/<gym-code>/manifest.json`; the app loads only the matching gym's presentation. Logo categories and approval remain database data. Example JPGs are design references, with editable presentation HTML alongside them; they are not email templates.

The panel, editor and PDF use the pairing's saved `sample_heading`, `sample_body` and `sample_source`. Empty fields use neutral type specimens. Bundled fonts are defined in `src/lib/brandKitFonts.ts`; their originals and licenses live in `public/fonts`. An unbundled font gets an explicit source link, not a claim that its file is included.

PNG/JPEG artwork remains raster artwork. Export never labels an embedded raster as a vector master. The guide flags a missing SVG master and does not invent Pantone, CMYK or manufacturing specifications.

### Artwork preparation for other kits

The icon library is organized in `public/brand-elements/<kit-code>/`. Separate Vault, Bars, Beam and Floor PNGs are deployed and registered as named icons in `gym_elements` for every current kit. The 52 additions were checked against their live file hashes, and database readback confirmed each kit has the four apparatus icons; TIGAR's existing set was preserved. Shared brand palettes use matching artwork with separate files for each kit. These raster icons feed the existing gallery, guide and download exports. Facebook, Instagram and Messenger badges are also deployed and registered for every current kit, with transparent 1024px PNGs and native SVGs. The social batch was checked against the live roster and canonical primary/secondary colors on 2026-09-30; all 84 file URLs matched the prepared artwork and all 42 requested assignments were confirmed. TIGAR's existing YouTube and TikTok remain live; those two platforms for other kits remain locally staged. `scripts/brand-element-batch.json` records gym identity, palette sources, generated-image provenance and per-file validation; it is a batch record, not a permanent gym roster.

`scripts/build-tigar-social-icons.mjs --manifest <manifest.json> --renderer <sharp-module-path>` creates the social files from the supplied inventory. `--social-batch` reads `socialBatch.gyms` and `socialBatch.platforms`, preserves existing artwork, and uses each gym's Facebook SVG as the badge template for additional glyphs. `--only <kit-code>` prepares one kit for inspection. `scripts/stage-brand-elements.mjs` checks the original apparatus batch and its expected file list; its older validation does not cover Messenger or the added TIGAR PNGs. Both refuse to replace different existing artwork. Neither script writes to Supabase or deploys the site. Refresh the live inventory and palettes before preparing a later batch; the manifest is a batch record, not a permanent gym roster.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Dashboard and bulk brand actions |
| `/kit/:gymCode` | Focused public share page |
| `/gym/:gymCode` | Gym profile and authorized editing |
| `/kit/:gymCode/variations`, `/gym/:gymCode/variations` | Named variation collections for this gym |
| `/kit/:gymCode/variations/:gallerySlug` | Read-only, shareable collection |
| `/gym/:gymCode/variations/:gallerySlug` | Collection with authorized editing |
| `/assets`, `/themes` | Redirect to dashboard |
| `/themes/:categoryId` | Theme detail |
| `/admin` | Administration |
| `/admin?tab=inventory` | Cross-gym logo and asset manager (administrator only) |
| `/review` | Asset review |
| `/my-brand` | Personal brand settings |
| `/auth` | Administrator sign-in |

The QR tables and components remain in the repository, but there is no current `/qr-studio` route.

## Logo and asset inventory

The signed-in dashboard's **Logo manager** button and administration's **Logo & asset inventory** open one paginated workspace for `gym_logos`, `gym_elements` and `gym_assets`, including distinct gym-specific assignment URLs. Counts distinguish saved records from distinct source URLs; they are loaded from the database, not from storage-object totals or locally staged artwork. The roster and category filters are data-driven. Grid/list views, live search, multiple gym/category filters, light/dark previews and a selected-only view share the same selection across pages. All matching records can be selected, with any selections outside current filters explicitly counted.

Copy URLs deduplicates hosted URLs. Inline SVG artwork has no hosted URL and is explicitly excluded from copying. CSV exports retain each record. ZIP exports preserve original bytes in one flat directory, include one file per distinct source URL, avoid filename collisions and include a CSV mapping all selected records to their downloaded files. A failed fetch or cancellation saves no partial archive. Browser ZIP preparation is capped at 512 MB; larger selections must be downloaded in smaller groups.

Individual names and source-specific metadata can be edited in place. Bulk edits offer literal find/replace for names, logo category/treatment/colorway, graphic type, or library category/description. The preview shows each before/after value. `edit_inventory_items` checks the current administrator role, existing RLS policies and expected field values before committing the entire batch. Files, URLs, gym assignments and featured-logo choices cannot be edited through this function. Undo restores only the last batch's touched fields and rejects intervening changes; it is available while this manager remains open. `tests/inventory-access.sql` validates atomic edits, rollback, undo and access denial inside a transaction that retains no test data.

## Kit activity

Settings → **Kit Activity** reports visits, labeled button clicks, opened logo/graphic/example previews and prepared downloads. Filters cover all gyms or one gym, 24 hours / 7 days / 30 days, action type and one browsing session. **Hide my activity** excludes the administrator's privately saved IP addresses from both rows and totals; turning it off restores their inclusion without deleting events. The preference is saved per administrator account and applies across devices. Results use server totals and 100-row pages, refresh every 30 seconds while the panel is open, and show an explicit empty or error state.

Collection starts when this feature is deployed; historical visits cannot be recovered. The public kit and working gym pages record anonymous activity, except signed-in administrators. A session ID lives in session storage, expires after 30 minutes of inactivity and is not a person identifier. No names, emails, input values, full user agents, query strings or referrer URLs are collected. Events record only gym, action/item label, server timestamp, temporary session ID, coarse device type and gateway IP. Direct Storage URLs, offline PDFs and actions blocked by privacy tools are outside coverage. A prepared download means a file was handed to the browser, not that it was saved or read.

`record-kit-activity` requires the project's JWT and accepts only the two production site origins. It validates each event, ignores client-supplied IP fields and reads only the managed Supabase Cloudflare gateway's `cf-connecting-ip`. Missing addresses stay unavailable. No events or IPs can be read through that endpoint. The database writer is service-role-only; reporting and table reads require the current admin role. Atomic limits allow 120 requests per network address per minute and 3,000 globally; duplicate event IDs cannot produce duplicate rows. Known preview bots, Do Not Track and Global Privacy Control are excluded. The collector also honors an existing browser opt-out. There is no activity notice or opt-out control in the public kit interface.

Activity reports cover the last 30 days. The `prune-kit-activity` database cron job deletes older rows and expired rate counters daily. IPs never appear on the public kit. The rate-counter table deliberately has RLS with no browser policies. `tests/kit-activity-access.sql` verifies role boundaries, pagination, date filters, rate limits and deduplication inside a transaction that rolls back all fixtures. The Edge Function and migration must be deployed before the frontend. Disabling the collector can never block previews or downloads; delivery is best effort.

**Approx. location** appears beside each IP on desktop and within each mobile record. The administrator-only `kit-activity-locations` Edge Function looks up only addresses already recorded within the reporting window, using [IPWho.is](https://ipwhois.io/documentation). Only the IP is sent to that provider; city, region, country and network are retained, without coordinates or the complete provider response. These are current network estimates, not historical proof of a visitor's location. Successful results are cached for seven days; unavailable results retry after an hour, and provider rate limits extend that cooldown. The provider's free endpoint currently permits commercial use and 1,000 requests daily per source IP, with no SLA. Batches contain up to 20 addresses and use four concurrent requests with 3.5-second timeouts. Lookup failures do not prevent loading activity. The daily `prune-kit-activity-locations` job removes estimates older than 30 days or no longer associated with retained events.

## Database and access

This app uses Supabase project **`fwkiadhkxqnlnvmzpgnw` (BRAND KIT)**. It is separate from the canonical gym-data project used by other tools.

| Tables / view | Purpose |
| --- | --- |
| `gyms`, `brands`, `gym_colors` | Gym records, shared brand families and ordered palettes |
| `gym_logos`, `logo_categories`, `logo_tags`, `gym_logo_tags` | Logos, display selection, order, categories and tags |
| `gym_font_pairings` | Font choices, weights, samples, usage notes and preference |
| `variation_galleries`, `variation_assets`, `variation_gallery_items` | Named variation collections, original-file facts and same-gym membership |
| `gym_elements` | Supporting graphics and dividers |
| `asset_types`, `asset_categories`, `gym_assets`, `gym_asset_assignments` | Cross-gym asset library and assignments |
| `theme_tags`, `asset_theme_tags`, `asset_comments` | Themes and private comments |
| `qr_generated`, `qr_scans` | Generated QR artwork and private decoded QR notes |
| `user_roles`, `admin_pins`, `user_profiles` | Access roles, PIN hashes and user profiles |
| `personal_brand_info`, `personal_brand_colors`, `personal_brand_images` | Personal brand |
| `kit_auth_attempts` | Service-only PIN attempt counters, no raw PINs or IP addresses |
| `kit_activity`, `kit_activity_limits`, `kit_activity_preferences` | Private visitor activity, service-only collection limits and per-administrator report filters |
| `kit_activity_locations` | Private, temporary IP location estimates; server writes only |
| `gym_icon_urls` | View of gym icon URLs, evaluated with caller permissions |

Public brand downloads are intentional. Anonymous users cannot write application tables or upload/update/delete storage objects. Administrator mutations require the current authenticated role. Comments are visible to their author or an administrator; decoded QR notes are administrator-only. Role checks operate with caller permissions.

`set_featured_gym_logo` validates and changes the display logo atomically. A partial change cannot clear the old display selection. A unique index enforces at most one display logo per gym. Replacing a display image preserves the previous artwork.

Edge functions:

- **`verify-pin`** validates four digits, consumes atomic database rate limits, verifies the current administrator role, and returns only the session token required by the client. Limits are five attempts per hashed address per 15 minutes and 20 attempts globally per hour; a distributed caller cannot bypass the global cap. Counter failure denies sign-in. Existing PIN sign-in remains a limited-strength credential; rate limiting is not MFA.
- **`set-pin`** validates the session, administrator role, target identity and four-digit format; it reports success only when a PIN row was updated.
- **`analyze-image`** validates the session and administrator role before making a paid AI request.

Changes live in `supabase/migrations`; function sources live in `supabase/functions`. Do not grant browser clients access to rate counters. RLS with no client policy on that table is intentional. Public storage URLs are not private document access controls.

Leaked-password protection is enabled and verified through the dashboard and security advisor. Auth connections use a 17% allocation, currently 10 of 60 connections, so the cap scales with compute. The Supabase account has no authenticator app enrolled; enrollment needs the account owner's device. The application's four-digit PIN is a separate login and is not MFA.

### Recovery

The dashboard lists seven daily physical database backups with restore controls. A destructive production restore has not been performed. **Those database backups exclude Storage file contents.** Restore the matching object files as well as database metadata when recovering deleted artwork.

An independently verified local copy of all 762 objects (399,951,650 bytes at capture) is stored in `.backups/storage`, outside Git and the public website. `latest.json` points to the complete manifest. The manifest preserves bucket names, exact source paths, source metadata and file checksums; each file is stored by SHA-256 so earlier content is preserved when a source changes. This is a local recovery copy, not a scheduled offsite backup.

To refresh it, run `scripts/storage-backup-inventory.sql` through the authorized database connection and save the returned inventory JSON to `.backups/storage-inventory.json`, then:

```sh
npm run backup:storage -- --inventory .backups/storage-inventory.json --project https://fwkiadhkxqnlnvmzpgnw.supabase.co --out .backups/storage
npm run backup:storage -- --verify .backups/storage/manifests/FILE.json
```

Add `--resume .backups/storage/manifests/FILE.json` to reuse verified unchanged files from a prior complete or interrupted run. The tool uses two downloads at a time, honors rate-limit retry delays, rejects incomplete files, re-reads every completed file, and never deletes source objects. A failed run cannot become the latest complete backup. It refuses private buckets rather than silently omitting them. Restoration uses the manifest's bucket/name mapping and the corresponding file from `objects/<first-two-hash-characters>/<sha256>`; no automated restore command is provided because replacing live objects needs an explicit recovery decision.

## Development and deployment

Node 22, React 18, TypeScript, Vite 7, React Router 7, Tailwind, shadcn/ui, TanStack Query and Supabase.

The public kit is available in the initial bundle. Working routes and editing dialogs load on demand; closed administrative dialogs do not fetch data on the share page. ZIP and PDF libraries load when exporting. `PageBoundary` catches rendering and lazy-import failures and provides an explicit reload action instead of leaving an empty page. Database types in `src/integrations/supabase/types.ts` are generated from the BRAND KIT schema; regenerate them after schema changes instead of bypassing checks with `any`.

```sh
npm ci
npm run dev
npm run audit:dependencies
npm run check
```

Vite serves port 8080. Commit and push reviewed changes to `main`; Vercel deploys the connected repository. Confirm the resulting deployment is ready for that exact commit and recheck the public share route. Supabase migrations and Edge Functions are separate deployments and must be applied before dependent frontend code.

`npm run check` runs ESLint, TypeScript, automated download/security/backup tests and the production build. GitHub runs the same checks plus a dependency audit on pushes to `main` and pull requests, with read-only repository permissions and actions pinned to commit hashes. Lint errors and high or critical dependency advisories fail the checks. These checks report failures; they do not currently block a Vercel deployment or require pull requests.

Use the administrative SQL connection to run `tests/brandKit-access.sql` and `tests/brandKit-rate-limit.sql` after migrations. They exercise public/non-admin/admin boundaries, atomic display selection and PIN throttling inside transactions that roll back all fixtures.

Before sharing, visually check the dashboard and bulk actions plus a focused kit at desktop, laptop and phone widths. Verify pause/drag/navigation, original-file preview, copy, complete and filtered ZIPs, error/retry paths, font loading and at least three contrasting gym palettes. Unit tests and an HTTP 200 response alone do not establish that the page works.
