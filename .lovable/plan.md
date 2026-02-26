

# Switch Color Swatches to a 4-Column Grid Layout

## Problem
Colors are displayed as a vertical list where each row spans the full card width (swatch + hex text + buttons), wasting enormous horizontal space. Most gyms have 3-6 colors, so this eats up the majority of the card height unnecessarily.

## Solution
Display color swatches in a **4-column grid** of compact square tiles. Each tile shows the color swatch with the hex code below it. Copy actions happen on click (tap swatch to copy with `#`, or the hex text to copy without `#`). The `#` and `HEX` buttons move to a small overlay or tooltip on hover rather than being permanently visible inline.

## Changes

### 1. GymCard.tsx — Switch from vertical list to grid
- Change the colors container from `space-y-1.5` (vertical stack) to `grid grid-cols-4 gap-2` (4-column grid)
- Pass a new `compact` variant/size to ColorSwatch instead of `showControls`
- Remove the `min-h-[280px]` constraint since the grid will be much shorter
- Reduce the section height to something like `min-h-[160px]`

### 2. ColorSwatch.tsx — Add a compact grid mode
- Add a new `layout` prop: `'row'` (current) or `'tile'` (new grid mode)
- **Tile mode layout**:
  - Square swatch (e.g. `w-full aspect-square`, fills grid cell)
  - Hex code displayed below the swatch in small mono text, centered
  - Click the swatch to copy with `#`; click hex text to copy without `#`
  - On hover, show a subtle tooltip or highlight indicating it's copyable
  - Edit mode: clicking opens color picker as before
  - Delete button appears as a small X overlay in edit mode
- Row mode stays as-is for any other usage

### 3. Visual details
- Each tile: rounded-lg swatch with subtle border, hex code underneath in `text-[10px] font-mono font-bold`
- Hover effect: slight scale-up on the swatch, cursor pointer
- Copied feedback: brief green checkmark or color flash on the tile
- The "Add color" button in edit mode becomes a `+` tile in the grid matching the same size
