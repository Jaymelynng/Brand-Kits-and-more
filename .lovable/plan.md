

# Asset Management System Rebuild

## Current State vs. New Model

The current schema stores one `file_url` per asset (`gym_assets`), with `gym_asset_assignments` just linking an asset to a gym. The new model fundamentally changes this: each gym gets its **own independent image URL** for the same asset record. This requires schema changes.

**Current**: `gym_assets.file_url` (one URL per asset) → `gym_asset_assignments` (just links gym to asset)
**New**: `gym_assets` (no file_url, just metadata) → `gym_asset_assignments.file_url` (per-gym URL)

Additionally, "themes" become tags (many-to-many), not a single category. The current `asset_categories` table (Standard, Holiday, etc.) becomes a `theme_tags` table, and assets can have multiple tags.

---

## Database Changes (Migration)

1. **Rename/repurpose tables**:
   - Create `theme_tags` table (id, name, created_at) — replaces `asset_categories` as the theme concept
   - Create `asset_theme_tags` join table (asset_id, theme_tag_id) — many-to-many
   - Add columns to `gym_assets`: `description text`, `is_all_gyms boolean default false`
   - Add column to `gym_asset_assignments`: `file_url text` (per-gym image URL)
   - Keep `asset_categories` for now (backward compat) but the UI will use `theme_tags`

2. **Migrate existing data**: Move current `asset_categories` entries into `theme_tags`. For existing `gym_assets` with a `category_id`, create corresponding `asset_theme_tags` rows. Copy `gym_assets.file_url` into each related `gym_asset_assignments.file_url`.

3. **RLS**: Public read on `theme_tags` and `asset_theme_tags`. Admin write on both.

4. **Comments table**: `asset_comments` (id, asset_id, user_id, gym_mention_id nullable, content text, created_at)

---

## New Components

### 1. AssetModal (`src/components/AssetModal.tsx`)
Full-screen dialog with two panels:

**Left Panel — "Asset Info"**:
- Lists all 13 gyms as rows
- Each row: checkbox, color badge with gym code, image URL input, thumbnail preview, COMPLETE/MISSING badge, copy URL button, trash button
- Unchecking removes gym from assignments
- Bottom bulk actions: Copy All URLs, Download All, Delete All Gyms

**Right Panel — "Details & Actions"**:
- Name input field
- Description textarea
- Category dropdown (Logos, Email Assets, Social Media, Marketing) — reads from `asset_types`
- Theme Tags multi-select with checkboxes + "+ Create" input for new tags — reads/writes `theme_tags` and `asset_theme_tags`
- "All Gyms" toggle switch — sets `is_all_gyms` flag
- Communication section with comments thread (reads `asset_comments`)

### 2. Themes Page rebuild (`src/pages/Themes.tsx`)
- Grid of theme tag cards (from `theme_tags`)
- Each card: tag name, asset count, gym coverage "8/13 gyms", progress bar, gold border at 100%
- "+ New Theme" button to create tags on the fly

### 3. Theme Detail rebuild (`src/pages/ThemeDetail.tsx`)
Three-panel layout:
- **Left**: Vertical gym list with badges, thumbnails, COMPLETE/MISSING status. Clicking selects a gym.
- **Center**: Large preview of selected gym's asset. Action buttons (Download, Copy URL, Replace/Upload, Delete). Upload drop zone for missing gyms.
- **Right**: Asset details, theme tags, shared-file info, comments thread.
- **Top bar**: Download All ZIP, Copy All URLs, Add to More Gyms.

### 4. GymProfile updates (`src/pages/GymProfile.tsx`)
- Keep existing layout and category filter tabs
- Asset cards get a theme tag badge in corner + pencil edit icon
- Clicking any asset card or pencil icon opens `AssetModal`

### 5. Navigation (`src/components/GymNavigation.tsx`)
- Already has Themes link — no changes needed

---

## New Hooks

- `useAssetModal` — CRUD for asset metadata, gym assignments with per-gym URLs, theme tags
- `useThemeTags` — fetch/create theme tags
- `useAssetComments` — fetch/post comments with @gym mentions

---

## Implementation Order

1. **Database migration** — new tables, columns, data migration
2. **Theme tags hooks** — `useThemeTags`, updated `useAssets`
3. **AssetModal component** — the central management UI
4. **Themes page + ThemeDetail rebuild** — three-panel layout
5. **GymProfile integration** — wire asset cards to open modal
6. **Comments system** — asset_comments table + UI thread

This is a large rebuild spanning ~6-8 files with one migration. Shall I proceed?

