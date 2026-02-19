

## Simplified Asset Organization System

### The Problem You're Solving
You cross-use assets everywhere and lose track of what you already made. This system lets you label assets so you can always find them, no matter how you search.

### How It Works - Two Simple Labels

**Label 1 - "What is it?" (Asset Type)**
Pick ONE type when you upload:
- Email Header
- Divider
- Icon
- Shape
- Photo
- Graphic
- Video
- Logo
- Badge
- Button
- Background
- (Add more anytime)

**Label 2 - "Where do I use it?" (Channel)**
Check ALL that apply:
- Email
- Social Media
- In-Gym Signage
- (Add more anytime)

### What Gets Built

#### Phase 1: Database Tables
- `asset_types` table seeded with 11 starter types (expandable)
- `asset_channels` table seeded with 3 channels: Email, Social Media, In-Gym Signage (expandable)
- `asset_channel_tags` junction table to link assets to multiple channels
- Add `asset_type_id` column to existing `campaign_assets` table
- RLS policies: public read, admin write

#### Phase 2: New Hooks
- `useAssetTypes.ts` - fetch types, update asset type
- `useAssetChannels.ts` - fetch channels, add/remove channel tags for assets

#### Phase 3: Asset Library Page (`/assets`)
A new page to find ANY asset across all campaigns and gyms:
- Filter by: Asset Type, Channel, Campaign, Gym
- Search by filename
- Thumbnail grid with quick-copy URL button
- Click any asset to open detail modal
- Table view toggle for seeing all gym URLs at once

#### Phase 4: Update Upload Flow
When uploading assets in a campaign:
- Add "What is this?" dropdown (Asset Type)
- Add "Where will you use it?" checkboxes (Channels)

#### Phase 5: Update Asset Detail Modal
- Add Classification section (change type, toggle channels)
- Add Gym URLs section (see all gym URLs, one-click copy)

#### Phase 6: Navigation
- Add "Asset Library" link to main navigation

### Technical Details

**New database migration:**
```sql
CREATE TABLE asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO asset_types (name, icon, sort_order) VALUES
  ('Email Header', 'mail', 1),
  ('Divider', 'minus', 2),
  ('Icon', 'shapes', 3),
  ('Shape', 'circle', 4),
  ('Photo', 'image', 5),
  ('Graphic', 'palette', 6),
  ('Video', 'video', 7),
  ('Logo', 'crown', 8),
  ('Badge', 'award', 9),
  ('Button', 'square', 10),
  ('Background', 'layers', 11);

CREATE TABLE asset_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO asset_channels (name, icon, sort_order) VALUES
  ('Email', 'mail', 1),
  ('Social Media', 'share-2', 2),
  ('In-Gym Signage', 'monitor', 3);

CREATE TABLE asset_channel_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES campaign_assets(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES asset_channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_id, channel_id)
);

ALTER TABLE campaign_assets
ADD COLUMN asset_type_id UUID REFERENCES asset_types(id);
```

**RLS policies** on all 3 new tables: public SELECT, admin INSERT/UPDATE/DELETE.

**New files:**
| File | Purpose |
|------|---------|
| `src/pages/AssetLibrary.tsx` | Global asset browser with filters |
| `src/hooks/useAssetTypes.ts` | Fetch/manage asset types |
| `src/hooks/useAssetChannels.ts` | Fetch/manage channel tags |
| `src/components/AssetLibraryFilters.tsx` | Filter sidebar |
| `src/components/AssetLibraryGrid.tsx` | Asset grid display |
| `src/components/AssetTypeSelector.tsx` | Dropdown for type selection |
| `src/components/ChannelTagToggle.tsx` | Toggle buttons for channels |
| `src/components/GymUrlTable.tsx` | Per-gym URL list with copy buttons |

**Updated files:**
| File | Changes |
|------|---------|
| `src/components/AssetDetailModal.tsx` | Add type selector, channel toggles, gym URL table |
| `src/components/CampaignAssetUpload.tsx` | Add type/channel selection during upload |
| `src/App.tsx` | Add `/assets` route |

