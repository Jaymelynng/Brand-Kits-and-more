

## Asset Organization System Implementation Plan

### Phase 1: Database Setup

**Create new tables with RLS policies:**

1. **`asset_types` table**
   - Columns: id, name, icon, sort_order, created_at
   - Seed with: Email Header, Divider, Icon, Shape, Photo, Graphic, Video, Logo, Badge, Button, Background
   - RLS: Public read, Admin write

2. **`asset_channels` table**
   - Columns: id, name, icon, sort_order, created_at
   - Seed with: Email, Social Media, Print, Website, Internal
   - RLS: Public read, Admin write

3. **`asset_channel_tags` junction table**
   - Columns: id, asset_id, channel_id, created_at
   - Foreign keys to campaign_assets and asset_channels
   - Unique constraint on (asset_id, channel_id)
   - RLS: Public read, Admin write

4. **Update `campaign_assets` table**
   - Add `asset_type_id` column (UUID, nullable, FK to asset_types)

### Phase 2: New Hooks

1. **`src/hooks/useAssetTypes.ts`**
   - Fetch all asset types
   - Update asset type for an asset

2. **`src/hooks/useAssetChannels.ts`**
   - Fetch all channels
   - Fetch channels for an asset
   - Add/remove channel tags

### Phase 3: Asset Library Page

1. **Create `src/pages/AssetLibrary.tsx`**
   - Filter sidebar with type chips, channel toggles, campaign dropdown, gym selector
   - Search by filename
   - Asset grid with thumbnails and quick actions
   - Table view toggle option

2. **Create supporting components:**
   - `src/components/AssetLibraryFilters.tsx` - Filter sidebar
   - `src/components/AssetLibraryGrid.tsx` - Asset grid display
   - `src/components/AssetTypeSelector.tsx` - Dropdown for type selection
   - `src/components/ChannelTagToggle.tsx` - Toggle buttons for channels
   - `src/components/GymUrlTable.tsx` - Per-gym URL list with copy buttons

3. **Add route in `src/App.tsx`**
   - `/assets` route pointing to AssetLibrary page

### Phase 4: Enhance Existing Components

1. **Update `src/components/AssetDetailModal.tsx`**
   - Add "Classification" section with type selector and channel toggles
   - Add "Gym URLs" section with table showing all gyms and copy buttons
   - Add "Copy All URLs" button for bulk copying

2. **Update `src/components/CampaignAssetUpload.tsx`**
   - Add asset type dropdown (required field)
   - Add channel checkboxes (optional)
   - Save type and channels with asset on upload

### Phase 5: Navigation Update

1. **Add Asset Library link to navigation**
   - Add to main nav or campaigns section
   - Icon: Library or Grid icon

### Files Created
- `src/pages/AssetLibrary.tsx`
- `src/hooks/useAssetTypes.ts`
- `src/hooks/useAssetChannels.ts`
- `src/components/AssetLibraryFilters.tsx`
- `src/components/AssetLibraryGrid.tsx`
- `src/components/AssetTypeSelector.tsx`
- `src/components/ChannelTagToggle.tsx`
- `src/components/GymUrlTable.tsx`

### Files Updated
- `src/components/AssetDetailModal.tsx`
- `src/components/CampaignAssetUpload.tsx`
- `src/App.tsx`
- `src/integrations/supabase/types.ts` (auto-updated after migration)

