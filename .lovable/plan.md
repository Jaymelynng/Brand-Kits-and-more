

## Fix Asset Hub: Compact Cards with Clear Sections

### Problems Visible in Screenshot
1. **Cards are absurdly tall** -- `aspect-[3/4]` creates massive white boxes with tiny images floating in the middle
2. **Only 4 columns** on a wide screen means each card is ~350px wide with a ~470px tall image area -- way too much empty space
3. **No visual section separation** -- the "Logo 81 assets" header is tiny and doesn't feel like a real section boundary
4. **Image `object-contain`** leaves huge gaps around non-square images

### Changes

**File: `src/pages/AssetHub.tsx`**

1. **Shrink card aspect ratio**: Change from `aspect-[3/4]` to `aspect-square` or `aspect-[4/3]` (landscape) so cards are compact, not towering
2. **More columns**: Change grid to `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6` -- pack more cards per row, less wasted space
3. **Use `object-cover`** instead of `object-contain` so images fill their frame without floating in whitespace. Add a subtle dark background behind the image area for contrast
4. **Stronger section headers**: Bigger font, background color fill, left border accent, more padding -- make each section feel like a real distinct group
5. **Tighter card gaps**: Reduce from `gap-4` to `gap-3` for density
6. **Smaller + ADD card**: Match the new compact aspect ratio

### Card After Fix
```text
┌────────────┐
│  [IMAGE]   │  ← aspect-square, object-cover
│  fills box │  ← dark bg behind for contrast
│       (CCP)│  ← gym badge
│  V13       │  ← coverage badge
├────────────┤
│ filename   │  ← 1-line footer, tight
└────────────┘
```

### Section Header After Fix
```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▼  LOGOS    81 assets                 ✓ all set
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [card] [card] [card] [card] [card] [card]
  [card] [card] [card] [card] [card] [+ADD]
```

### Technical Notes
- Only changes to `src/pages/AssetHub.tsx`
- `RotatingAssetCard`: change `aspect-[3/4]` → `aspect-square`, `object-contain` → `object-cover`, add `bg-slate-900` behind image
- Grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3`
- Section header: uppercase type name, larger text, filled background bar, left accent border
- `+ ADD` card: match `aspect-square`

