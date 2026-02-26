
Goal: make the gym card match your sample layout and stop the logo/colors section from visually colliding. I reviewed the current code and it does not match your reference yet.

What is currently off (based on the code)
1) Main logo block is oversized and too “heavy”:
- `h-40` container plus strong layered shadow and hover lift creates too much visual weight.
- This is why it can feel like it’s pushing/overlapping adjacent content in tighter cards.

2) Color swatch cell proportions differ from your sample:
- In `ColorSwatch` cell mode, the swatch is currently `w-full h-12`, with container `p-2` and small text/button sizing.
- Your sample wants tighter, cleaner geometry: a compact 2x2 grid with consistent card heights and minimal dead space.

3) Too many competing effects:
- Current card/header/logo styles have several decorative gradients and heavy shadows that make the layout look different from your simpler sample hierarchy.

Implementation plan

1) Rebuild the GymCard visual skeleton to match sample proportions
File: `src/components/GymCard.tsx`
- Keep data/behavior logic intact (uploads, copy, edit, delete).
- Simplify structure to a sample-faithful hierarchy:
  - Header row (title left, badge right), thin border.
  - Logo stage centered in its own section with fixed, moderate height.
  - Brand colors title.
  - 2-column color grid.
  - Bottom action buttons stacked exactly as sample.
- Reduce visual noise:
  - Remove aggressive inline hover box-shadow rewrites on parent card.
  - Keep depth, but use lighter, consistent shadows.

2) Fix logo “lift” without causing overlap feel
File: `src/components/GymCard.tsx`
- Replace current large floating treatment with controlled elevation:
  - Keep a centered logo tile (not full-height dominance).
  - Use a bounded shadow and no negative translate that makes it feel detached from layout flow.
- Set predictable sizing:
  - Outer logo zone fixed (compact).
  - Inner logo image constrained with `object-contain` and max dimensions that do not exceed the stage.
- Ensure no visual collision:
  - Add clear section spacing below logo before color block.
  - Avoid absolute positioning and avoid hover transforms that change perceived stacking/flow.

3) Make swatches match the 2x2 sample format exactly
File: `src/components/shared/ColorSwatch.tsx`
- Keep `layout="cell"` but tighten it to sample:
  - Uniform cell height across all colors.
  - Top color strip with rounded corners and subtle inner/outer border.
  - Centered hex text and small label below.
  - Bottom row with `#` and `HEX` buttons sized and aligned consistently.
- Improve white/light color visibility:
  - Replace exact-white checks with lightness/luminance detection.
  - If color is very light, apply stronger neutral border so white/off-white swatches are always visible.

4) Enforce compact, stable grid behavior
Files: `src/components/GymCard.tsx`, optionally minor class adjustments in `ColorSwatch.tsx`
- Keep `grid grid-cols-2` for the color area.
- Ensure each swatch cell has consistent height so rows align and no ragged spacing appears.
- Keep spacing compact (`gap-2`/`gap-3`) to save vertical space while preserving readability.

5) Keep button clarity and tactile feel (but cleaner)
Files: `src/components/GymCard.tsx`, `src/components/shared/ColorSwatch.tsx`
- Preserve clear “these are clickable” treatment:
  - Strong contrast
  - Beveled/raised look
  - Distinct default vs active/copied states
- Reduce over-styling so controls look intentional and consistent with your sample.

6) Regression check targets before finalizing
- Gym card on `/` matches sample layout blocks and proportions.
- 2x2 colors stay compact with no overlap at common desktop widths.
- White and near-white colors are visible.
- Main logo appears elevated but contained, not oversized.
- Copy buttons remain obvious and functional.
- Edit mode still works (edit color, add color, delete color, upload logo, set main logo).

Technical notes
- No data model/mutation changes are needed.
- Scope is UI refactor only in:
  - `src/components/GymCard.tsx`
  - `src/components/shared/ColorSwatch.tsx`
- I will keep existing hooks and handlers unchanged and only adjust render structure/classes/styles so behavior is preserved.
