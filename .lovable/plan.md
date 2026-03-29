

## Make Thumbnails Dominant + Auto-Rotate Through Gym Versions

### Problem
The asset cards currently show a small `aspect-square` thumbnail that's the same size as the text footer below it. The thumbnail needs to be the **dominant visual element** -- much larger, with minimal text. Additionally, each asset has multiple gym-specific versions (via assignments), but only one static image shows. The thumbnails should **auto-rotate** through the different gym versions like a slideshow.

### Changes

**File: `src/pages/AssetHub.tsx`** -- lines 534-627 (the card grid and individual cards)

1. **Bigger thumbnail ratio**: Change from `aspect-square` to `aspect-[3/4]` or taller -- the image takes up ~80% of the card height. The footer text shrinks to just the asset name in small type + coverage badge.

2. **Auto-rotating thumbnails**: Each card collects all unique image URLs for that asset (the base `file_url` + all `assignment.file_url` values). A `useEffect` with `setInterval` (every 3 seconds) cycles through the URLs, cross-fading between them. A small gym code badge in the corner updates to show which gym's version is currently displayed.

3. **Visual treatment**: 
   - Larger card min-width so images actually show detail
   - Reduce grid columns (e.g., `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) so each card is bigger
   - Subtle crossfade transition between rotated images
   - Current gym code pill overlaid on the thumbnail corner during rotation

4. **Card structure after change**:
```text
┌──────────────────┐
│                  │
│   [LARGE IMAGE]  │  ← 75-80% of card height
│                  │  ← auto-rotates every 3s
│          (CCP)   │  ← gym badge in corner
│                  │
├──────────────────┤
│ Main Logo  10/13 │  ← minimal footer
└──────────────────┘
```

### Technical Notes
- Extract a small `RotatingAssetCard` component to keep state per-card
- Each card gathers URLs: `[asset.file_url, ...assignments.filter(a => a.asset_id === id && a.file_url).map(a => ({ url: a.file_url, gymId: a.gym_id }))]`
- `useState` for current index, `useEffect` with `setInterval(3000)` to increment
- CSS `transition-opacity duration-500` for crossfade (stack two `<img>` absolutely, toggle opacity)
- Pause rotation on hover (clear interval), resume on mouse leave
- Grid changes from 6-col max to 4-col max so cards are visually dominant

