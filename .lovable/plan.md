

## Rebuild Asset Hub: Category + Sub-Category Structure

### Current State
- 4 asset types exist: **Logo** (81 assets), **Email Asset** (0), **Social Media** (0), **Marketing** (0)
- 4 theme tags: Standard (80), Holiday (1), Halloween (0), Summer Camp (0)
- Current page shows theme tags as cards -- not useful. You want to browse by **what the asset IS** (logo, email hero, icon), not by campaign tag

### What You Want
Main categories = asset types. Sub-categories = specific kinds within each type. Theme tags (Holiday, Summer Camp) become cross-cutting filters you can apply on top.

```text
┌─────────┬──────────────────────────────────────────────┐
│  GYM    │  [Logos] [Email] [Social] [Marketing]  ← tabs│
│  LIST   ├──────────────────────────────────────────────┤
│         │  Sub-tabs: [All] [Standard] [Holiday] [Dark] │
│ ● CCP   ├──────────────────────────────────────────────┤
│ ● CPF   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ ● CRR   │  │ img  │ │ img  │ │ img  │ │ img  │       │
│ ● EST   │  │ CCP  │ │ CPF  │ │ CRR  │ │ EST  │       │
│ ...     │  └──────┘ └──────┘ └──────┘ └──────┘       │
│         │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│         │  │ img  │ │ img  │ │ img  │ │ img  │       │
│ [All]   │  └──────┘ └──────┘ └──────┘ └──────┘       │
└─────────┴──────────────────────────────────────────────┘
```

### The Plan

**1. Add email sub-categories to the database**

Currently `asset_categories` has only universal theme-style entries (Standard, Holiday). We need asset-type-specific sub-categories. New migration to seed:

| Category | Scoped to Asset Type |
|----------|---------------------|
| Hero Images | Email Asset |
| Icons | Email Asset |
| Dividers | Email Asset |
| In-Gym Shots | Marketing |
| Flyers | Marketing |
| Posts | Social Media |
| Stories | Social Media |

These use the existing `asset_categories.asset_type_id` foreign key that's already built for this purpose.

**2. Rebuild `AssetHub.tsx` layout**

Replace the current theme-tag-card grid with:

- **Top tabs**: One tab per asset type (Logos, Email, Social, Marketing). Dynamically generated from `asset_types` table. Shows count badge per type.
- **Sub-filter row**: Below the main tabs, show pill chips for sub-categories scoped to the selected asset type, plus universal theme tags (Holiday, etc.). Click to filter.
- **Thumbnail grid**: Dense gallery of actual asset images. Each thumbnail shows the gym code badge, asset name on hover. Click opens the detail drawer (already built).
- **Gym sidebar**: Stays as-is -- click a gym to filter the grid to only that gym's assets.

**3. Detail drawer upgrade**

When clicking an asset thumbnail, the existing Sheet drawer opens showing:
- Full-size preview
- Which gyms have this asset (thumbnail strip with gym code badges)
- Coverage status (e.g., "10/13 gyms")
- Copy URL / Download actions
- Theme tag pills (editable by admin)

**4. Admin management**

- Admin can add/edit/delete sub-categories from a small management section (gear icon or inline)
- Admin can create new asset types if needed
- All manageable from frontend, no SQL needed

### Files to Change

| File | Change |
|------|--------|
| `supabase/migrations/[new].sql` | Seed email/social/marketing sub-categories |
| `src/pages/AssetHub.tsx` | Full rebuild -- tabs + sub-filters + thumbnail grid |
| `src/hooks/useAssets.ts` | Add `useAssetCategoriesByType` hook for scoped queries |

### Technical Notes
- Asset types = main tabs (already in DB)
- `asset_categories.asset_type_id` = sub-category scoping (column already exists, just needs data)
- Theme tags (Holiday, Summer Camp) = cross-cutting filters shown as additional pills alongside sub-categories
- Gym sidebar filtering unchanged
- URL state: `?type=logo&category=standard&gym=xyz` for bookmarkable views
- No breaking changes to gym profile pages

