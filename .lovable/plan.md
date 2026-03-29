

## Rebuild Asset Hub: Section-Based Card Grid with Category Sidebar

### What's Wrong Now
The current layout is a flat thumbnail grid filtered by one asset type tab at a time. Your wireframe shows a completely different structure: **all asset type sections visible at once** on the main content area (like a scrollable page), with a left sidebar that has both a gym selector AND a collapsible category tree for quick-jumping.

### Target Layout

```text
┌────────────────────────────────────────────────────────────────────────┐
│  ASSET MANAGEMENT                    [+ Add Asset]  [All Gyms ▼]      │
│  12 total · 2 missing · 10 complete                                   │
├── [Logos] [Email] [Social] [Print] [All]          🔍 Search...  ──────┤
└────────────────────────────────────────────────────────────────────────┘

LEFT SIDEBAR                     │  MAIN CONTENT (scrollable)
─────────────────────────────────┤
GYMS                             │  ┌─ LOGOS ─────────── 3 assets · ⚠️ 1 missing ┐
  ● All Gyms                     │  │  ┌────────┐ ┌────────┐ ┌────────┐          │
  ● CCP  Capital Cedar Park      │  │  │ [IMG]  │ │ [IMG]  │ │ + ADD  │          │
  ● CPF  Capital Pflugerville    │  │  │Main Log│ │Holiday │ │White V │          │
  ● ...                          │  │  │13/13 ✓ │ │ 4/13 ⚠️│ │ 0/13   │          │
                                 │  │  │[Copy]  │ │[Copy]  │ │        │          │
CATEGORIES                       │  │  │[Downld]│ │[Downld]│ │        │          │
  ▼ Logos (3)                    │  │  └────────┘ └────────┘ └────────┘          │
  ▼ Email Assets (6)             │  └────────────────────────────────────────────┘
    · Hero Images                │
    · Dividers                   │  ┌─ EMAIL ASSETS ──────── 6 assets · ✓ all set ┐
    · Icons                      │  │  [same card grid pattern...]                 │
  ▼ Social Media (4)             │  └──────────────────────────────────────────────┘
    · Posts                      │
    · Stories                    │  ┌─ SOCIAL MEDIA ─────────────────────────────── ┐
  ▼ Print (2)                    │  │  [same card grid pattern...]                 │
    · Flyers                     │  └──────────────────────────────────────────────┘
    · Banners                    │
```

### Key Differences from Current

1. **Sections, not tabs**: All asset types render as collapsible sections on one scrollable page. Top bar tabs become quick-jump filters (click "Logos" scrolls to that section; click "All" shows everything).
2. **Category tree in sidebar**: Below gyms, a collapsible tree shows asset types with their sub-categories. Clicking a sub-category filters the main view to just that sub-category.
3. **Section headers with status**: Each section shows asset count + missing count + completion badge ("✓ all set" or "⚠️ 1 missing").
4. **Richer asset cards**: Each card shows thumbnail, asset name, coverage fraction (e.g. "13/13 ✓"), and inline Copy URL + Download buttons directly on the card.
5. **"+ ADD" card**: An add-asset placeholder card at the end of each section (admin only).
6. **Detail modal**: Clicking a card opens the existing Sheet drawer with full preview, gym coverage list, per-gym thumbnails, Copy/Download/Open per gym, MISSING badges, and bulk select checkboxes.
7. **Top summary bar**: "12 total assets · 2 missing · 10 complete" global stats.

### Plan

**File: `src/pages/AssetHub.tsx`** -- Full rebuild:

- Remove the tab-based single-type filtering. Replace with a scrollable page that renders one section per asset type.
- Each section: collapsible header (type name, count, status badge) + responsive card grid inside.
- Each card: square thumbnail, asset name below, coverage badge (X/13), warning icon if incomplete, Copy URL and Download buttons on hover or always visible.
- Admin "+" card at end of each section.
- Sidebar: keep gym list as-is, add a "CATEGORIES" section below with collapsible groups per asset type showing sub-categories. Clicking a sub-category sets a URL param filter.
- Top tabs become anchor links that scroll to sections, or filter to show only that section. "All" shows all sections.
- Top bar gets global stats (total/missing/complete counts).
- Detail drawer stays mostly the same but add Download button per gym row, and bulk select checkboxes at bottom.

**No database changes needed.** All data is already available through existing hooks.

### Technical Notes
- Use `useRef` per section for scroll-into-view when clicking top tabs
- Collapsible category tree uses existing `Collapsible` component
- Card grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
- Coverage calculation: count assignments per asset vs total gym count
- Missing count per section: assets where assignment count < total gyms
- Keep all existing URL param logic for gym/category/tag filtering
- Keep the Sheet detail drawer, enhance with download buttons and select-all checkbox

