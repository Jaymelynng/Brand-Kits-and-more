
Objective
- Fix the proportion system so the layout feels intentional:
  1) logo is clearly larger and more dominant than color swatches,
  2) swatches are large enough to read and click comfortably,
  3) each swatch’s “# / HEX” controls stay within swatch width,
  4) the 4 bottom action buttons stop looking overly long compared to swatches.

What is currently causing the frustration
- In `GymCard.tsx`, the bottom action buttons are full card-width, so they visually overpower swatches.
- Card width is unconstrained in the grid, so button rows become very long on larger columns.
- In `ColorSwatch.tsx`, swatches are currently 72x72 with compact text/buttons; they are proportionally too small versus card actions.
- Logo stage depth exists but is too subtle relative to surrounding elements, so the “pop” effect is getting lost.

Implementation plan

1) Establish strict visual ratio tokens (single source of truth)
- File: `src/components/shared/ColorSwatch.tsx`
- In `layout === 'cell'`, define a fixed tile geometry and use it everywhere in that block:
  - swatch size: 88x88
  - control row width: 88 (exactly same as swatch)
  - mini-button height: 28
- Keep `#` and `HEX` buttons locked inside that 88px footprint using a 2-column grid.
- This guarantees controls are never wider than the color square and improves clickability.

2) Increase swatch readability without breaking compact grid
- File: `src/components/shared/ColorSwatch.tsx`
- Increase typographic legibility in cell mode:
  - HEX text one step larger and heavier
  - button text one step larger (still compact)
- Keep spacing tight so 2-column color layout remains content-dense.
- Preserve existing edit/delete behavior and copy behavior (no logic changes).

3) Rebuild gym card hierarchy so logo clearly wins
- File: `src/components/GymCard.tsx`
- Increase logo stage size and depth:
  - stage height from current compact setting to a visibly larger one (target ~136–148px)
  - logo max height increased proportionally
  - strengthen multi-layer shadows (contact + lift + ambient glow) and keep subtle hover lift
- This restores “3D pop off the page” and makes logo unmistakably larger than swatch modules.

4) Stop bottom 4 actions from feeling massive
- File: `src/components/GymCard.tsx`
- Convert action area to a compact 2x2 rhythm with consistent button heights and shorter labels.
- Reduce perceived length by:
  - shortening labels (for example: “Copy #”, “Copy HEX”, “Download”, “Profile”)
  - slightly reducing height and font size while preserving accessibility
  - tightening vertical spacing between action rows
- Keep all existing actions and behavior unchanged, only presentation/label sizing.

5) Narrow each gym card to fix overall proportion
- File: `src/components/GymCard.tsx` (preferred) or `src/pages/Index.tsx` (if needed)
- Apply a max-width to each card and center it in its grid cell (instead of stretching full width).
- This directly addresses “containers too wide” and naturally prevents long horizontal button bars.
- Keep responsive behavior (1/2/3 columns) intact.

6) Preserve existing functionality (non-negotiables)
- No mutation/hook/data flow changes.
- Keep:
  - color copy behavior,
  - edit mode color picker behavior,
  - delete color behavior,
  - logo upload/drop/set-main/download flows.

Validation checklist (post-implementation)
1) Desktop: logo area is visibly larger than swatch tiles in every card.
2) Swatch controls: `#` + `HEX` row width is equal to (or slightly less than) swatch width in all tiles.
3) Clickability: tapping/clicking `#` and `HEX` is easy (no tiny hit targets).
4) Bottom actions: 4 actions no longer appear disproportionately long/oversized relative to swatches.
5) Responsive pass:
   - mobile (single column),
   - tablet (2 columns),
   - desktop (3 columns),
   with no overlap or cramped clipping.
6) End-to-end behavior check:
   - copy # / copy HEX from swatches,
   - copy gym colors from action buttons,
   - logo upload and download,
   - edit mode interactions.

Technical notes
- Primary files to update:
  - `src/components/shared/ColorSwatch.tsx`
  - `src/components/GymCard.tsx`
- Optional minor adjustment if needed:
  - `src/pages/Index.tsx` (grid/card width balancing)
- Scope is purely UI geometry, spacing, and visual hierarchy; no backend/data changes.
