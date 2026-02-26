

# Fix Color Swatches, Buttons, and Logo Sizing

## Problems Identified

1. **Color swatches too small** -- currently `w-12 h-12` (48px). Should be closer to 4x4rem (64px) to fill the space properly.
2. **Wasted horizontal space** -- large gap between the swatch and the `#`/`HEX` buttons with text sprawled in between. The layout is too spread out.
3. **`#` and `HEX` buttons are flat and invisible** -- tiny `h-7` outline buttons with no shadow, no contrast, no depth. They don't look clickable at all.
4. **Logos are too small** -- the logo container is `h-24` (96px) and the image max-height is `max-h-20` (80px), making logos appear tiny on the card.

## Changes

### 1. ColorSwatch component (`src/components/shared/ColorSwatch.tsx`)

- Increase swatch size from `w-12 h-12` to `w-14 h-14` (56px) for a more substantial presence
- Make the `#` and `HEX` buttons visually prominent with:
  - 3D box shadows (multi-layer: drop shadow + inset highlight)
  - Stronger border contrast
  - Slightly larger size (`h-8` instead of `h-7`, wider padding)
  - Bold font weight
  - Background gradient (white to light gray) so they look like real tactile buttons
- Tighten the gap between elements so there's less dead space in each color row

### 2. GymCard logo area (`src/components/GymCard.tsx`)

- Increase logo container height from `h-24` to `h-32` (128px)
- Increase max logo image height from `max-h-20` to `max-h-28` (112px)

### 3. GymCard color section (`src/components/GymCard.tsx`)

- Reduce spacing between color rows from `space-y-2` to `space-y-1.5` to keep the card compact while accommodating the larger swatches

## Technical Details

**ColorSwatch button styling** -- each `#` and `HEX` button will get:
```text
background: linear-gradient(to bottom, #ffffff, #ececec)
border: 1.5px solid rgba(0,0,0,0.2)
box-shadow: 0 2px 4px rgba(0,0,0,0.15),
            inset 0 1px 0 rgba(255,255,255,0.9),
            inset 0 -1px 0 rgba(0,0,0,0.08)
font-weight: 700
```

This gives the beveled 3D tactile look consistent with the rest of the app's button styling.

