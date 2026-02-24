
## Completed: Uniform Gym Cards with Enhanced Shadows and Color Management

**Status: DONE**

### Problem (resolved)
- Gym cards with 3 colors were shorter than those with 4 colors, creating an uneven grid
- Cards needed more dramatic box shadows to "pop" more
- There was no way to add or remove colors from the main dashboard (only editing existing colors worked in edit mode)

### Changes Made

**1. Forced all gym cards to the same height**
- In `GymCard.tsx`, the Brand Colors section uses `min-h-[280px]` so all cards are uniform regardless of color count
- Cards use `flex flex-col h-full min-h-[480px]` for consistent sizing

**2. Enhanced box shadows**
- Multi-layer box shadows on each card for dramatic 3D "pop" effect
- Hover shadows increase for clear lift effect with rose-gold accents
- Beveled inset highlights for depth

**3. Add/Edit/Remove colors (in edit mode)**
- `useDeleteGymColor` hook added in `useGyms.ts`
- "+" button in Brand Colors section (edit mode only) to add a new color via color picker
- "x" delete button on each color swatch (edit mode only) via `onDelete` prop on `ColorSwatch`

### Files Modified
- `src/hooks/useGyms.ts` — Added `useDeleteGymColor` mutation
- `src/components/GymCard.tsx` — Increased min-h, enhanced shadows, add/delete color controls
- `src/components/shared/ColorSwatch.tsx` — Added optional `onDelete` prop for edit mode
