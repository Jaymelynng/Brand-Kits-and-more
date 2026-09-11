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

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Dashboard and bulk brand actions |
| `/kit/:gymCode` | Focused public share page |
| `/gym/:gymCode` | Gym profile and authorized editing |
| `/assets`, `/themes` | Cross-gym asset and theme library |
| `/themes/:categoryId` | Theme detail |
| `/admin` | Administration |
| `/review` | Asset review |
| `/my-brand` | Personal brand settings |
| `/auth` | Administrator sign-in |

The QR tables and components remain in the repository, but there is no current `/qr-studio` route.

## Kit activity

Settings → **Kit Activity** reports visits, labeled button clicks, opened logo/graphic/example previews and prepared downloads. Filters cover all gyms or one gym, 24 hours / 7 days / 30 days, action type and one browsing session. Results use server totals and 100-row pages, refresh every 30 seconds while the panel is open, and show an explicit empty or error state.

Collection starts when this feature is deployed; historical visits cannot be recovered. The public kit and working gym pages record anonymous activity, except signed-in administrators. A session ID lives in session storage, expires after 30 minutes of inactivity and is not a person identifier. No names, emails, input values, full user agents, query strings or referrer URLs are collected. Events record only gym, action/item label, server timestamp, temporary session ID, coarse device type and gateway IP. Direct Storage URLs, offline PDFs and actions blocked by privacy tools are outside coverage. A prepared download means a file was handed to the browser, not that it was saved or read.

`record-kit-activity` requires the project's JWT and accepts only the two production site origins. It validates each event, ignores client-supplied IP fields and reads only the managed Supabase Cloudflare gateway's `cf-connecting-ip`. Missing addresses stay unavailable. No events or IPs can be read through that endpoint. The database writer is service-role-only; reporting and table reads require the current admin role. Atomic limits allow 120 requests per network address per minute and 3,000 globally; duplicate event IDs cannot produce duplicate rows. Known preview bots, Do Not Track and Global Privacy Control are excluded. The collector also honors an existing browser opt-out. There is no activity notice or opt-out control in the public kit interface.

Activity reports cover the last 30 days. The `prune-kit-activity` database cron job deletes older rows and expired rate counters daily. IPs never appear on the public kit. The rate-counter table deliberately has RLS with no browser policies. `tests/kit-activity-access.sql` verifies role boundaries, pagination, date filters, rate limits and deduplication inside a transaction that rolls back all fixtures. The Edge Function and migration must be deployed before the frontend. Disabling the collector can never block previews or downloads; delivery is best effort.

## Database and access

This app uses Supabase project **`fwkiadhkxqnlnvmzpgnw` (BRAND KIT)**. It is separate from the canonical gym-data project used by other tools.

| Tables / view | Purpose |
| --- | --- |
| `gyms`, `brands`, `gym_colors` | Gym records, shared brand families and ordered palettes |
| `gym_logos`, `logo_categories`, `logo_tags`, `gym_logo_tags` | Logos, display selection, order, categories and tags |
| `gym_font_pairings` | Font choices, weights, samples, usage notes and preference |
| `gym_elements` | Supporting graphics and dividers |
| `asset_types`, `asset_categories`, `gym_assets`, `gym_asset_assignments` | Cross-gym asset library and assignments |
| `theme_tags`, `asset_theme_tags`, `asset_comments` | Themes and private comments |
| `qr_generated`, `qr_scans` | Generated QR artwork and private decoded QR notes |
| `user_roles`, `admin_pins`, `user_profiles` | Access roles, PIN hashes and user profiles |
| `personal_brand_info`, `personal_brand_colors`, `personal_brand_images` | Personal brand |
| `kit_auth_attempts` | Service-only PIN attempt counters, no raw PINs or IP addresses |
| `kit_activity`, `kit_activity_limits` | Private visitor activity and service-only collection limits |
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
