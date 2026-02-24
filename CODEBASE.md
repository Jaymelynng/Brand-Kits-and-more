# Gym Brand Kit Database — Complete Codebase Guide

> **Who this is for:** This guide is written for non-coders who want to understand every aspect of this app, and for AI assistants who need full context before providing advice or making changes.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema (Supabase)](#4-database-schema-supabase)
5. [Authentication & Admin System](#5-authentication--admin-system)
6. [Pages](#6-pages)
7. [Components](#7-components)
8. [Hooks (Data Layer)](#8-hooks-data-layer)
9. [Design System & Styling](#9-design-system--styling)
10. [Key Workflows](#10-key-workflows)
11. [Supabase Edge Functions](#11-supabase-edge-functions)
12. [Asset Naming Convention](#12-asset-naming-convention)
13. [Known Limitations & Notes](#13-known-limitations--notes)

---

## 1. What This App Does

This is a **Gym Brand Kit Database** — a private internal tool for managing and accessing brand assets (logos, colors, brand elements) for multiple gym locations.

**Core capabilities:**

| Feature | What it means for you |
|---|---|
| View all gyms on a dashboard | See every gym's logo and brand colors at a glance |
| Copy brand colors | Click a button to instantly copy hex color codes |
| Upload logos & elements | Drag-and-drop or click to upload PNG/JPG/SVG files |
| Download logos | Download the main logo or bulk-download a ZIP of all assets |
| Remove background from logos | AI-powered background removal — click Erase BG |
| Rename assets | Batch-rename logos with AI suggestions |
| Gym profiles | Each gym has its own detailed page with full asset library |
| **Campaigns Hub** | Organize marketing assets (videos, PDFs, graphics) by campaign |
| **Asset Library** | Search all campaign assets across all gyms and campaigns |
| **Bulk Upload** | Drop many files at once; auto-routed by filename to the right gym |
| Admin tools | Admins can add gyms, edit colors, delete logos, and more |
| PIN-based login | Secure access via a 4-digit PIN (no email/password) |
| Search | Filter gyms by name or code |
| Select & copy multiple | Use diamond buttons to select specific gyms and copy their colors together |

---

## 2. Technology Stack

| Technology | Purpose | Non-coder explanation |
|---|---|---|
| **React** | Frontend UI library | The tool that builds the visual interface |
| **TypeScript** | Programming language | JavaScript with type safety — catches errors before they happen |
| **Vite** | Build tool | Packages the app for deployment, runs the dev server |
| **Tailwind CSS** | Styling | Utility-first CSS — apply styles directly in component code |
| **shadcn/ui** | UI component library | Pre-built buttons, dialogs, inputs, etc. |
| **Supabase** | Backend-as-a-service | Database, file storage, authentication, edge functions (serverless code) |
| **TanStack Query** | Data fetching & caching | Automatically fetches data from Supabase and keeps it up to date |
| **React Router** | Navigation | Handles page routing (e.g., `/gym/CRR` goes to that gym's profile) |

---

## 3. Project Structure

```
Brand-Kits-and-more/
├── src/
│   ├── pages/               # Full page components (routes)
│   │   ├── Index.tsx        # Dashboard — main page showing all gyms
│   │   ├── GymProfile.tsx   # Individual gym brand page (/gym/:gymCode)
│   │   ├── Auth.tsx         # PIN login page (/auth)
│   │   └── NotFound.tsx     # 404 page
│   ├── components/          # Reusable UI pieces
│   │   ├── shared/          # Shared across many components
│   │   │   ├── BrandCard.tsx         # Styled card container
│   │   │   ├── ColorSwatch.tsx       # Displays a single color with copy buttons
│   │   │   └── GymColorProvider.tsx  # Sets CSS variables from gym's colors
│   │   ├── ui/              # shadcn/ui components (don't edit these)
│   │   ├── GymCard.tsx           # Gym card shown on dashboard
│   │   ├── GymNavigation.tsx     # Top sticky navigation bar
│   │   ├── AdminToolkit.tsx      # Admin side panel
│   │   ├── AddGymModal.tsx       # Dialog to add a new gym
│   │   ├── AssetRenamer.tsx      # Batch-rename logos with AI
│   │   ├── DiamondSelector.tsx   # Diamond-shaped gym selection toggle
│   │   ├── HeroVideoBackground.tsx # Hero video banner on gym profiles
│   │   ├── GymSearchBar.tsx      # Search box on dashboard
│   │   └── SecretAdminButton.tsx # Hidden admin icon (shield/lock)
│   ├── hooks/               # Data fetching and business logic
│   │   ├── useGyms.ts       # All gym CRUD operations
│   │   ├── useAuth.ts       # Authentication state
│   │   ├── useBackgroundRemoval.ts  # AI background removal
│   │   └── use-toast.ts     # Toast notification helpers
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Supabase client setup
│   │       └── types.ts     # TypeScript types auto-generated from database
│   ├── lib/
│   │   ├── utils.ts         # Utility functions (cn = class merger)
│   │   └── assetNaming.ts   # Filename parsing & generation
│   ├── App.tsx              # App root — router setup
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles & CSS variables
├── supabase/
│   ├── functions/           # Edge functions (serverless backend code)
│   ├── migrations/          # Database schema history
│   └── config.toml          # Supabase CLI config
├── public/                  # Static assets
├── .env                     # Environment variables (Supabase URL & keys)
├── .lovable/plan.md         # Pending feature plan from Lovable AI
├── package.json             # Dependencies
├── tailwind.config.ts       # Tailwind CSS configuration
└── vite.config.ts           # Vite build configuration
```

---

## 4. Database Schema (Supabase)

All data lives in a **Supabase PostgreSQL database**. Here is every table and what it stores:

### `gyms` — Core gym records

| Column | Type | Description |
|---|---|---|
| `id` | UUID (auto) | Unique identifier |
| `code` | text | Short gym code (e.g., `CRR`, `AUS`) — used in URLs |
| `name` | text | Full gym name (e.g., "Club Red Rockwall") |
| `hero_video_url` | text (optional) | URL of a background video for the gym's profile hero section |
| `address` | text (optional) | Physical address |
| `phone` | text (optional) | Phone number |
| `email` | text (optional) | Contact email |
| `website` | text (optional) | Website URL |
| `created_at` | timestamp | When the record was created |
| `updated_at` | timestamp | When it was last updated |

### `gym_colors` — Brand colors

| Column | Type | Description |
|---|---|---|
| `id` | UUID (auto) | Unique identifier |
| `gym_id` | UUID | Links to the `gyms` table |
| `color_hex` | text | Hex color code (e.g., `#C4A4A4`) |
| `order_index` | integer | Sort order (0 = primary color, 1 = secondary, etc.) |
| `created_at` | timestamp | When added |

### `gym_logos` — Uploaded logo files

| Column | Type | Description |
|---|---|---|
| `id` | UUID (auto) | Unique identifier |
| `gym_id` | UUID | Links to the `gyms` table |
| `filename` | text | Original file name (e.g., `CRR-logo-horizontal-v1.png`) |
| `file_url` | text | Full public URL to the file in Supabase Storage |
| `is_main_logo` | boolean | `true` for the logo shown prominently; only one per gym |
| `created_at` | timestamp | When uploaded |

### `gym_elements` — Brand elements (banners, icons, etc.)

| Column | Type | Description |
|---|---|---|
| `id` | UUID (auto) | Unique identifier |
| `gym_id` | UUID | Links to the `gyms` table |
| `element_type` | text | Category: `banner`, `icon`, `pattern`, etc. |
| `svg_data` | text | Either SVG code content OR a public URL to the file |
| `element_color` | text | Dominant color of the element (default: `#000000`) |
| `element_variant` | integer | Variant number (1, 2, 3, ...) |
| `created_at` | timestamp | When uploaded |

### `user_roles` — Admin authorization

| Column | Type | Description |
|---|---|---|
| `id` | UUID (auto) | Unique identifier |
| `user_id` | UUID | Links to Supabase Auth user |
| `role` | enum | Either `admin` or `user` |
| `created_at` | timestamp | When granted |

### `admin_pins` — PIN-based login credentials

| Column | Type | Description |
|---|---|---|
| `id` | UUID (auto) | Unique identifier |
| `email` | text | Email address for this PIN account |
| `pin_hash` | text | Hashed version of the PIN (not stored in plain text) |
| `role` | enum | The role to grant when this PIN is used |
| `user_id` | UUID | Links to Supabase Auth user |
| `created_at` | timestamp | When created |

### Campaign tables (planned feature — not yet wired up in the UI)

These tables exist in the database but the full campaign UI is not yet built. See [Known Limitations](#13-known-limitations--notes) for details.

- **`campaigns`** — Marketing campaigns (name, description, status, thumbnail)
- **`campaign_assets`** — Files attached to campaigns (logos, images, videos)
- **`campaign_tags`** — Tags linking assets to campaigns
- **`asset_types`** — Categories of assets (poster, social, video, etc.)
- **`asset_channels`** — Distribution channels (email, social, print, etc.)
- **`asset_channel_tags`** — Links assets to channels
- **`flyer_templates`** — Flyer template definitions with customizable zones
- **`user_profiles`** — Basic user info (email, id)

### `gym_icon_urls` — Database View (read-only)

A computed view that shows pre-built icon URLs for each gym:
- `calendar_url` — URL to a calendar icon element
- `chat_url` — URL to a chat icon element
- `star_url` — URL to a star icon element

---

## 5. Authentication & Admin System

### How login works

1. User goes to `/auth`
2. Enters a **4-digit PIN**
3. App calls the `verify-pin` Supabase Edge Function
4. If the PIN matches a record in `admin_pins`, Supabase sends a magic link token
5. App uses that token to sign in the user silently (`verifyOtp`)
6. User is now logged in and gets redirected to the dashboard

### How admin status is checked

- The `useAuth` hook checks the `user_roles` table on every login
- If the user has a row with `role = 'admin'`, `isAdmin` is set to `true`
- Without admin status, users can view everything but **cannot** upload, edit, or delete

### Admin capabilities

| Action | Requires admin |
|---|---|
| View gym profiles and colors | ❌ No (public) |
| Copy colors | ❌ No (public) |
| Upload logos | ✅ Yes |
| Delete logos | ✅ Yes |
| Edit brand colors | ✅ Yes |
| Add new colors | ✅ Yes |
| Add new gym | ✅ Yes |
| Delete elements | ✅ Yes |
| AI background removal | ✅ Yes |
| AI file renaming | ✅ Yes |
| Access Admin Toolkit panel | ✅ Yes |

### `make_me_admin` database function

There is a SQL function `make_me_admin()` that grants admin access to the currently logged-in user. It's callable from the Admin Toolkit panel. **Use with caution** — only for initial setup or trust-based access.

---

## 6. Pages

### `src/pages/Index.tsx` — Dashboard (route: `/`)

The main landing page. What it does:

- Fetches all gyms using `useGyms()`
- Renders a sticky `<GymNavigation>` bar at the top
- Shows a `<GymSearchBar>` to filter gyms
- Renders a grid of `<GymCard>` components (one per gym)
- Manages **gym selection** state (which gyms are selected for batch copying)
- Shows a **Back to Top** button when scrolled down
- Shows an **Admin Access** button for non-admins to log in
- Opens `<AddGymModal>` when admin clicks "Add New Gym"
- Opens `<AdminToolkit>` side panel when admin clicks the admin icon

**Key state:**
- `editMode` — When true, gym cards show orange borders and colors become clickable to edit
- `selectedGyms` — A Set of gym codes currently selected (all selected by default)
- `searchQuery` — The current search filter text

### `src/pages/GymProfile.tsx` — Gym Brand Hub (route: `/gym/:gymCode`)

The most complex page in the app. Each gym has its own profile URL (e.g., `/gym/CRR`).

**Sections:**
1. **Hero** — Shows gym code badge + name; if `hero_video_url` is set, plays the video as background
2. **Main Logo** — Displays the main logo with a download button
3. **Brand Assets Stats** — Shows counts of logos, colors, and elements
4. **Brand Colors** — All hex colors with copy buttons; admins can click "Edit Colors" to change them
5. **Logo Library** — Grid/list/carousel of all uploaded logos with:
   - Download individual logo
   - Set as main logo (star icon)
   - Copy file URL
   - Delete logo
   - Remove background (AI)
   - Bulk select and rename
   - Download all as ZIP
6. **Brand Elements** — Separate section for banners, icons, etc. with type filter and grid/list view
7. **Upload Interfaces** — Drag-and-drop areas for logos and elements (admin only)

**Key state:**
- `viewMode` — How logos are displayed: `carousel | grid | list | masonry`
- `elementViewMode` — Same for elements
- `selectionMode` — Whether logos are in multi-select mode
- `selectedLogos` — Set of selected logo IDs for batch operations
- `logoBgMode` — Light or dark background behind logos in the display
- `isEditingColors` — Whether color editing is enabled
- `showUpload / showElementUpload` — Whether upload panels are visible

### `src/pages/Campaigns.tsx` — Campaigns Hub (route: `/campaigns`)

Lists all marketing campaigns. Features:
- Search campaigns by name or description
- Filter by status (Active, Upcoming, Archived)
- Thumbnail cards for each campaign — click to open the campaign detail
- Admin: Create new campaigns with name, description, status, and optional thumbnail image
- Admin: Delete campaigns (hover over card to reveal delete button)
- Links to Asset Library and back to the main gym dashboard

### `src/pages/CampaignDetail.tsx` — Campaign Detail (route: `/campaigns/:campaignName`)

The most complex campaign page. Contains all assets for a single campaign.

**Sections:**
1. **Header** — Campaign name, status badge, download-all-as-ZIP button, upload assets button
2. **Asset Sidebar** — Filter panel: by file type (All, Videos, Images, Documents, Other) and by gym
3. **Asset Status Cards** — Quick-click summary cards showing counts of all/videos/images/documents
4. **Asset Filter Bar** — Search by filename, group by gym or file type, select-all for batch operations
5. **Asset Grid** — Thumbnail grid of all uploaded files with preview and action buttons
6. **Modals** — Asset detail (full-screen preview + metadata), edit (rename, reassign gym), share (URL + QR code + email)
7. **Bulk operations** — Select multiple assets to download as ZIP, assign to gym, or delete

### `src/pages/AssetLibrary.tsx` — Asset Library (route: `/assets`)

A global search across ALL campaign assets, regardless of which campaign they belong to.

**Filters:** Search by filename, asset type, channel, campaign, gym — all can be combined.
**Views:** Grid (thumbnail) or List
**Actions:** Click any asset to open the detail modal with edit/share/delete options

### `src/pages/BulkUpload.tsx` — Bulk Asset Upload (route: `/bulk-upload`, admin only)

A drag-and-drop upload tool for adding multiple files to the gym logos/elements system at once. Files are automatically routed to the right gym and table based on filename parsing (e.g., `CRR-logo-horizontal-v1.png` → CRR gym, `gym_logos` table).

### `src/pages/Auth.tsx` — PIN Login (route: `/auth`)

A simple centered card with 4 PIN input boxes. Auto-submits when all 4 digits are entered.

### `src/pages/NotFound.tsx` — 404 Page (route: `*`)

Shown for any unmatched URL.

---

## 7. Components

### Navigation & Layout

#### `GymNavigation.tsx`
The sticky top bar that stays visible while scrolling. Contains:
- **Title bar** — "🏆 Gym Brand Kit Database"
- **Action bar** — Clear selection, Copy (X selected) / Copy All button, Admin icon, Sign Out
- **Gym nav grid** — One card per gym showing the gym code and a diamond selector
- **Selection counter** — Shows "X of Y gyms selected"

**Props:** `gyms`, `selectedGyms`, `onScrollToGym`, `onCopySelected`, `onCopyAll`, `onToggleGymSelection`, `onSelectAllGyms`, `onDeselectAllGyms`, `user`, `isAdmin`, `onAdminClick`, `onSignOut`

#### `GymSearchBar.tsx`
A search input that filters the gym grid. Shows result count when filtering.

#### `SecretAdminButton.tsx`
A small icon button (shield/lock) that only appears for admins. Clicking it opens the Admin Toolkit.

### Gym Display

#### `GymCard.tsx`
Shown on the dashboard for each gym. Contains:
- Gym name + code badge at the top
- Main logo display (click or drag to upload)
- Upload progress bar (for multi-file uploads)
- Brand colors list with copy buttons
- Copy #HEX / Copy HEX buttons
- Download main logo button
- "View [GYM] Profile" link button
- Full logo gallery (when `showAllLogos={true}`)
- Hidden file input for uploads

**Important behavior:** Color picker opens a native browser color picker when you click "Edit" in edit mode.

#### `DiamondSelector.tsx`
The rotated square (diamond) buttons in the navigation. Shows a glowing ring and checkmark when selected. Click to toggle a gym's selection state.

### Modals & Overlays

#### `AddGymModal.tsx`
A dialog for adding a new gym. Fields:
- Gym Name (required)
- Gym Code (required, max 5 characters, auto-uppercased)
- Brand Colors (1 or more, with native color picker + hex text input)

Submits via `useAddGym()` mutation.

#### `AdminToolkit.tsx`
A slide-in side panel (Sheet component) for admin actions:
1. **Grant Admin Access** — Calls `make_me_admin()` database function
2. **Add New Gym** — Opens `AddGymModal`
3. **Edit Mode** — Toggle switch; when on, gym cards get orange borders and colors are editable

#### `AssetRenamer.tsx`
A large dialog for batch-renaming logos. Features:
- Shows current filename and a preview image for each asset
- "AI Suggest Names" button — calls `analyze-image` edge function to get AI-suggested filenames
- Editable text input for each new name
- Validation indicator (green check / red X) per name
- "Apply Changes" updates filenames in the database

#### `HeroVideoBackground.tsx`
If a gym has a `hero_video_url`, this component renders a full-width video as the background of the gym profile hero section. Overlay opacity is configurable.

### Shared UI Components

#### `shared/BrandCard.tsx`
A styled card wrapper with three variants: `default`, `hero`, `compact`. Exports:
- `BrandCard` — Main card container
- `BrandCardHeader` — Padded header area
- `BrandCardContent` — Padded content area
- `BrandCardTitle` — Bold title text

#### `shared/ColorSwatch.tsx`
Displays a single color. Shows the hex value and two copy buttons (`#` and `HEX`). In edit mode, clicking the color opens a native color picker.

Props: `color`, `label`, `size`, `showControls`, `onEdit`, `onDelete`, `editMode`

#### `shared/GymColorProvider.tsx`
Sets CSS custom properties (`--gym-primary`, `--gym-secondary`, etc.) on the document root based on a gym's brand colors. This makes the entire page theme adapt to each gym's colors. Resets on unmount.

---

## 8. Hooks (Data Layer)

All data fetching and mutations are in `src/hooks/useGyms.ts` using **TanStack Query**.

### `useGyms()`
Fetches all gyms, colors, logos, and elements from Supabase in one call. Returns a combined `GymWithColors[]` array. Data is cached and shared across all components.

**What `GymWithColors` contains:**
```typescript
{
  id, name, code, hero_video_url, address, phone, email, website,
  colors: GymColor[],   // sorted by order_index
  logos: GymLogo[],     // sorted by created_at
  elements: GymElement[]
}
```

### `useAddGym()`
Creates a new gym record plus its initial colors.

### `useUpdateGymColor()`
Changes a color's hex value.

### `useAddGymColor()`
Appends a new color to a gym (gets the next `order_index` automatically).

### `useDeleteGymColor()`
Removes a color from a gym.

### `useUploadLogo(gymId, file, isMain?)`
Uploads a logo file to Supabase Storage (`gym-logos` bucket) and creates a record in `gym_logos`. If `isMain` is true, all other logos for that gym are first set to `is_main_logo: false`.

### `useSetMainLogo(gymId, logoId)`
Makes a specific logo the main logo. Clears the `is_main_logo` flag on all other logos first.

### `useDeleteLogo(logoId)`
Removes the file from Supabase Storage and deletes the database record.

### `useUploadElement(gymId, file, elementType)`
Uploads a brand element (banner, icon, etc.) to storage and creates a record in `gym_elements`. If the file is SVG, it reads the raw SVG code; otherwise stores the public URL.

### `useDeleteElement(elementId)`
Deletes an element record from the database.

### `useUpdateElementType(elementId, elementType)`
Changes the type label of an element.

---

### `useAuth.ts`

Manages authentication state across the app.

**Returns:** `{ user, session, isAdmin, loading, signOut }`

- Listens to Supabase auth state changes via `onAuthStateChange`
- Checks `user_roles` table to determine admin status
- `signOut()` calls `supabase.auth.signOut()`

### `useBackgroundRemoval.ts`

Wraps the `@imgly/background-removal` library (runs entirely in the browser using AI/WebAssembly — no server required).

**Returns:** `{ removeBg, isProcessing, progress, statusMessage }`

- First run is slow (~30–60 seconds) because the AI model must be downloaded
- Subsequent runs on the same session are faster (model cached)

---

## 9. Design System & Styling

All global colors are defined as CSS custom properties in `src/index.css`:

### Brand Color Variables

| Variable | Value | Use |
|---|---|---|
| `--brand-rose-gold` | `#b48f8f` | Main accent — buttons, borders, highlights |
| `--brand-blue-gray` | `#adb2c6` | Secondary accent — periwinkle blue |
| `--brand-text-primary` | `#737373` | Default body text |
| `--brand-white` | `#ffffff` | Clean white backgrounds |
| `--brand-gold` | `#D4AF37` | Gold for "perfect 10/10 state" visual |
| `--brand-navy` | Deep navy | Text/borders in nav |

### Dynamic Gym Color Variables

These change per gym (set by `GymColorProvider`):

| Variable | Default | Description |
|---|---|---|
| `--gym-primary` | Navy blue | Gym's primary brand color |
| `--gym-secondary` | Medium gray | Gym's secondary brand color |
| `--gym-primary-light` | Very light primary | Used for subtle backgrounds |
| `--gym-secondary-light` | Very light secondary | Used for subtle backgrounds |

### Tailwind CSS classes specific to this app

- `text-gym-primary` — Uses the gym's primary color
- `bg-gym-primary` — Background in gym's primary color
- `border-gym-primary` — Border in gym's primary color
- `shadow-elegant` — A subtle gym-colored shadow
- `shadow-glow` — A glowing gym-colored shadow
- `transition-smooth` — Custom smooth transition

### Fonts

The app uses **Inter** (loaded from Google Fonts) at weights 400, 500, 600, 700.

---

## 10. Key Workflows

### Adding a new gym (Admin)

1. Click the admin icon (shield) in the navigation → Admin Toolkit opens
2. Click "Add New Gym" → `AddGymModal` opens
3. Enter gym name (e.g., "Club Red Austin") and code (e.g., `AUS`, max 5 letters)
4. Add brand colors using the color picker
5. Click "Add Gym" → `useAddGym()` creates the gym + colors in Supabase
6. Dashboard refreshes automatically

### Uploading a logo (Admin)

**From dashboard:**
- Drag a file onto a gym card, or click the logo area → uploads and sets as main if none exists

**From gym profile page:**
- Click "Upload New Logos" button, or drag files into the upload zone
- Multiple files can be uploaded at once

**File requirements:** Must be an image file (PNG, JPG, SVG, etc.)

### Setting the main logo

- On the gym profile page, click the ⭐ (star) icon next to any logo to make it the main
- The main logo appears prominently on both the dashboard card and the profile hero

### Editing a color (Admin)

**From dashboard (edit mode):**
1. Open Admin Toolkit → enable "Edit Mode"
2. Click any color swatch → native browser color picker opens
3. Choose new color → updates immediately

**From gym profile page:**
1. Click "Edit Colors" button (only visible to admins)
2. Click any color swatch → native color picker opens

### Bulk-copying colors

1. Use diamond buttons in the navigation to select specific gyms
2. Click "Copy (X)" to copy selected gyms' colors
3. Or click "Copy All" (when nothing is selected) to copy all gyms' colors
4. Paste into any text editor or spreadsheet

### AI Background Removal

1. On a gym's profile page, find the logo in the gallery
2. Click the "Erase BG" (eraser) button on a logo
3. Wait for the AI model to download and process (first time is slow)
4. A new logo file named `[original]-nobg.png` is automatically uploaded

### AI Asset Renaming

1. On a gym's profile page, click the selection checkbox icon to enter selection mode
2. Select one or more logos using the checkboxes
3. Click "Rename" to open the `AssetRenamer` dialog
4. Optionally click "AI Suggest Names" to get naming suggestions
5. Edit the names manually if needed
6. Click "Apply Changes"

### Downloading all assets as ZIP

On any gym profile page, click the "Download All (ZIP)" button in the logo section toolbar. This packages all logos and a brand-colors.txt file into a single ZIP download.

---

## 11. Supabase Edge Functions

These are small serverless functions deployed to Supabase. They run on Supabase's servers (not in the user's browser).

### `verify-pin`
- **Called by:** `Auth.tsx`
- **Purpose:** Validates a 4-digit PIN against the `admin_pins` table (hash comparison) and returns a Supabase session token
- **Security:** PINs are stored hashed — the raw PIN is never stored

### `analyze-image`
- **Called by:** `AssetRenamer.tsx`
- **Purpose:** Takes an image URL + gym info, uses AI to analyze the image and suggest a standardized filename following the naming convention

---

## 12. Asset Naming Convention

Filenames follow a structured format defined in `src/lib/assetNaming.ts`:

**Pattern:** `{GYM_CODE}-{asset_type}-{descriptor}-v{variant}.{extension}`

**Examples:**
- `CRR-logo-horizontal-dark-v1.png`
- `AUS-banner-summer-promo-v2.jpg`
- `GYM-icon-diamond-v1.svg`

**Parts:**
- `GYM_CODE` — Uppercase gym code (e.g., `CRR`)
- `asset_type` — Lowercase type (`logo`, `banner`, `icon`, `pattern`)
- `descriptor` — Lowercase hyphenated description (`horizontal-dark`, `summer-promo`)
- `variant` — Version number (`v1`, `v2`, ...)
- `extension` — Lowercase file extension (`png`, `jpg`, `svg`)

The `validateFilename()` function returns `true` if a name follows this pattern. The AI renaming feature generates names following this convention.

---

## 13. Known Limitations & Notes

### The `.lovable/plan.md` File
This file described a pending change: removing a "Contact & Location" section from the gym profile. **This work is now complete** — the `GymContactInfo` component mentioned in the plan no longer exists in the codebase. The plan.md entry can be considered done and its plan.md file has been updated accordingly.

### Two Asset Storage Systems Exist Side by Side

The app has two separate asset systems:
1. **Gym-direct assets** (`gym_logos` + `gym_elements` tables, `gym-logos` storage bucket) — images attached directly to a gym. Used on the dashboard and gym profile pages.
2. **Campaign assets** (`campaign_assets` table, `campaign-assets` storage bucket) — files uploaded into a campaign, optionally linked to a gym. Used on the Campaigns and Asset Library pages.

Both systems are fully functional. The key distinction: gym-direct assets are brand assets (logos, brand elements). Campaign assets are marketing deliverables (posters, videos, PDFs, email graphics, etc.).

### Old Campaign Tag System is Partially Unused

`useCampaigns.ts` contains `useTagAsset`, `useUntagAsset`, and `useAssetCampaigns` which reference an older `campaign_tags` table (linking campaigns to gym_logos/gym_elements). This approach was replaced by the `campaign_assets` table. The old functions remain in the codebase but are not used by any current UI.

### Background Removal Performance
The `@imgly/background-removal` library downloads a WebAssembly AI model (~50–100MB) on first use. This makes the first background removal slow. Subsequent uses in the same browser session reuse the cached model.

### Admin PIN Setup
Admins must be set up in the `admin_pins` table through Supabase directly. There is no UI for creating new PIN accounts — this must be done via the Supabase dashboard or SQL.

### Gym Code Must Be Unique
The `code` field in the `gyms` table is used in URLs (`/gym/CRR`) and for display. If two gyms have the same code, only one will be found.

### Colors Display Order
Colors are sorted by `order_index`. The first color (index 0) is treated as the "primary" color and drives all the dynamic theming. The second color (index 1) is the "secondary" color.

### Storage Bucket
All logos and elements are stored in a single Supabase Storage bucket named `gym-logos`. Files are named `{gymId}-{random}.{ext}` or `{gymId}-{elementType}-{random}.{ext}`.

### Edit Mode Is Session-Only
The `editMode` toggle on the dashboard is a React state — it resets when the page is refreshed. It is not persisted.
