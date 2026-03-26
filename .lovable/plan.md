

## Redesign: Asset Command Center (Replace Themes)

### The Core Problem
The current Themes system is a rigid 3-panel layout where the left panel is a giant list of URL inputs per gym, the center is metadata, and the right is comments. You need to flip-flop instantly between **"show me everything for CCP"** and **"show me all gyms' March Events heroes"** -- the two axes you constantly work across. Your other tool nails this with a gym sidebar + category filters + thumbnail grid.

### What to Build

**Replace `/themes` and `/themes/:id` with a single unified `/assets` route** that has three view modes accessible via instant toggle -- no page navigation needed to switch contexts.

#### Layout Structure

```text
┌──────────────────────────────────────────────────────────┐
│  HEADER: Asset Command Center    [+ New Theme]  [Back]   │
├────────┬─────────────────────────────────────────────────┤
│        │  FILTER BAR: [All] [Monthly Events] [VIP]       │
│  GYM   │  [Summer Camp] [Showcase] ...   Search  Sort    │
│  LIST   ├─────────────────────────────────────────────────┤
│        │                                                  │
│ ● CCP  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│ ● CPF  │  │ thumb   │ │ thumb   │ │ thumb   │          │
│ ● CRR  │  │ CCP     │ │ CPF     │ │ CRR     │          │
│ ● EST  │  │ 9/10    │ │ 8/10    │ │ 10/10   │          │
│ ● HGA  │  └─────────┘ └─────────┘ └─────────┘          │
│ ● OAS  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│ ...    │  │ thumb   │ │ thumb   │ │ thumb   │          │
│        │  │ ...     │ │ ...     │ │ ...     │          │
│[Select] │  └─────────┘ └─────────┘ └─────────┘          │
│[All]   │                                                  │
└────────┴─────────────────────────────────────────────────┘
```

#### Three Instant View Modes (toggle in filter bar)

1. **By Theme (default)**: Grid of theme cards (like your campaign grid screenshots). Each card shows a representative thumbnail, theme name, date, coverage bar with gym color dots, and stats. Click a card to expand it inline or open a detail drawer.

2. **By Gym**: Select a gym from the left sidebar. The main area shows all themes/assets for that gym only, grouped by asset type (Email Heroes, Social, Icons, etc.). This is what a gym manager would see on their own page.

3. **All Assets**: Flat filterable grid of every asset across all gyms, sortable by date, type, gym, theme. Power-user mode for bulk operations.

#### Left Sidebar (~180px, collapsible)
- Compact gym list with logo thumbnails (same pattern as homepage/QR Studio)
- Click = filter main grid to that gym only
- Checkbox = include/exclude from bulk actions
- "All Gyms" option at top to reset filter
- Select All / Clear All buttons
- Count badge per gym showing how many assets they have

#### Filter Bar (top of main area)
- Theme tag chips (Monthly Events, VIP, Summer Camp, etc.) -- click to filter
- Search box
- Sort options: Newest, Oldest, Most Assets, A-Z
- View mode toggle: Grid / List
- Active filter count with clear button

#### Main Grid (center)
- **Theme view**: Cards showing thumbnail, title, date, coverage dots, gym count badge
- **Gym view**: Assets grouped by type with section headers
- **Asset detail**: Click any card to open a slide-over panel (right side) showing:
  - Full preview
  - All gym versions (thumbnail strip)
  - Coverage status
  - Copy URL / Download / Delete actions
  - Comments thread

#### What This Replaces
- Kill the current rigid 3-panel ThemeDetail layout
- Kill the URL-input-per-row pattern
- Keep all existing data (theme_tags, asset_theme_tags, gym_assets, gym_asset_assignments)
- The gym profile page (`/gym/:code`) continues to work independently -- same underlying data, different view

### Phase 1 Scope (This Implementation)

1. **New page**: `src/pages/AssetHub.tsx` at route `/assets`
2. **Redirect**: `/themes` redirects to `/assets`, `/themes/:id` redirects to `/assets?theme=:id`
3. **Left sidebar**: Gym list with logos, click-to-filter, checkboxes for bulk
4. **Filter bar**: Theme tag chips, search, sort
5. **Main grid**: Theme cards in grid layout with thumbnails and coverage indicators
6. **Detail drawer**: Right-side sheet that opens when clicking a theme card, showing all gym versions as a thumbnail grid with status badges and bulk actions
7. **Manageable from frontend**: Create/delete themes, upload assets, assign to gyms -- all admin-gated

### Future Phases (Not Now)
- Phase 2: Asset type sub-categories (Email Icons, Dividers, Shapes, Heroes)
- Phase 3: External links (Canva, Active Campaign source URLs)
- Phase 4: Multi-user with gym-level permissions (managers see only their gym)

### Files to Change
| File | Change |
|------|--------|
| `src/pages/AssetHub.tsx` | New -- main Asset Command Center page |
| `src/App.tsx` | Add `/assets` route, redirect `/themes` |
| `src/components/GymNavigation.tsx` | Update nav link from "Themes" to "Assets" |
| `src/pages/Themes.tsx` | Replace with redirect to `/assets` |
| `src/pages/ThemeDetail.tsx` | Replace with redirect to `/assets?theme=:id` |

### Technical Notes
- No database changes needed -- existing tables support everything
- Reuse `useGyms`, `useThemeTags`, `useAllAssetsWithAssignments`, `useAllAssetThemeTags` hooks
- Gym sidebar uses same logo thumbnail pattern from QR Studio and homepage
- Detail drawer uses Sheet component for slide-over behavior
- URL state (`?theme=X&gym=Y`) so views are bookmarkable and shareable

