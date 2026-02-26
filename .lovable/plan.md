

# Fix Color Layout to 2x2 Grid and Stop Logo/OTP Overlap

## Problems

1. **Colors in a single column** -- each color takes a full-width row with swatch + text + buttons side by side. This eats massive vertical space, causing the card to overflow and logos to overlap with the OTP/other elements.
2. **The "4x4" request** -- your screenshot shows a 2-column grid where each color gets its own bordered cell with the swatch, hex code, label, and copy buttons stacked vertically inside. This is much more compact.
3. **`min-h-[280px]`** on the brand colors section is forcing unnecessary height even when colors fit in less space with a grid layout.

## Solution

### 1. Redesign ColorSwatch layout (vertical cell mode)

Change `ColorSwatch` to support a `layout` prop (`"row"` | `"cell"`). In `"cell"` mode:
- Stack vertically: swatch on top, hex code below, label below that, then `#` and `HEX` buttons side by side at the bottom
- The swatch stays `w-16 h-16`
- Everything fits in a compact bordered box
- Matches your screenshot exactly

### 2. Switch GymCard colors to a 2-column grid

In `GymCard.tsx`, replace:
```text
<div className="space-y-1.5">
  {gym.colors.map(...)}
</div>
```
With:
```text
<div className="grid grid-cols-2 gap-2">
  {gym.colors.map(...)}
</div>
```

Each `ColorSwatch` renders in cell mode inside the grid.

### 3. Remove the forced `min-h-[280px]`

Change `min-h-[280px]` to `min-h-0` or remove it entirely. The 2-column grid will naturally be shorter -- 4 colors in 2 rows instead of 4 stacked rows. This eliminates the overflow that causes the logo/OTP overlap.

## Technical Details

**ColorSwatch cell layout structure:**
```text
+------------------+
|   [color swatch]  |
|     #1f53a3       |
|  Primary Color 1  |
|   [#]  [HEX]     |
+------------------+
```

**Files changed:**
- `src/components/shared/ColorSwatch.tsx` -- add `layout="cell"` prop, render vertical stack when cell mode
- `src/components/GymCard.tsx` -- switch colors container to `grid grid-cols-2 gap-2`, pass `layout="cell"` to each swatch, remove `min-h-[280px]`

This saves roughly 50% of vertical space in the colors section, fixing the overlap issue and matching your reference screenshot.
