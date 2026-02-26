

# Fix Color Swatches to Square Thumbnails

## Problem
The color swatch in `layout="cell"` mode is currently `w-full h-8` — a wide, flat rectangle. Your sample clearly shows **square** color thumbnails. The current implementation stretches them horizontally across the full cell width with barely any height.

## Fix

### `src/components/shared/ColorSwatch.tsx` (line 69)
Change the swatch from `w-full h-8` to `aspect-square w-full rounded-md`. This makes the color block a proper square that fills the cell width and matches its height to that width — exactly like your sample.

That's it. One class change. The rest of the cell layout (hex text, label, buttons below) stays the same.

### Technical detail
```text
Before: "rounded-md w-full h-8 cursor-pointer ..."
After:  "rounded-md w-full aspect-square cursor-pointer ..."
```
