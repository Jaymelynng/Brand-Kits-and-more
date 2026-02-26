
Goal: make each color tile look like your sample by ensuring the two mini buttons (“#” and “HEX”) are never wider than the color square, without breaking the rest of the gym card layout.

What I found in the current code
1) The swatch itself is fixed to `w-12 h-12` (good and compact now).
2) The button row under it is currently `w-full` in `ColorSwatch` cell mode, so it stretches to the full grid cell width (bad).
3) Each mini button is `flex-1`, which makes both buttons expand with that stretched row, causing exactly what you’re seeing.

Implementation approach
1) Lock the controls row to swatch width (same footprint)
- File: `src/components/shared/ColorSwatch.tsx`
- In `layout === 'cell'`, change the copy-controls container from full width to a fixed width matching the swatch:
  - from `className="flex gap-0.5 w-full"`
  - to width-locked centered container (same as swatch), e.g. `w-12 mx-auto grid grid-cols-2 gap-0.5`
- Result: total width of both buttons + gap cannot exceed the color square width.

2) Make each button strictly fit inside half of that width
- File: `src/components/shared/ColorSwatch.tsx`
- Replace `flex-1` button sizing with explicit compact sizing that respects the 2-column grid cell:
  - remove `flex-1`
  - use tiny fixed-height compact classes (`h-4`/`h-4.5`, `px-0`, very small text)
- Keep labels as `#` and `HEX`, but shrink typography enough to fit cleanly without overflow.

3) Keep swatch and controls visually tied as one compact unit
- File: `src/components/shared/ColorSwatch.tsx`
- Keep current `w-12 h-12` swatch and center alignment.
- Tighten vertical spacing between swatch → hex text → label → buttons so the whole tile reads as one compact block (not stretched).

4) Do not narrow the full gym card yet (unless still needed after this fix)
- File: `src/components/GymCard.tsx` (no first-pass width change)
- Reason: your immediate issue is local to swatch controls being `w-full`. Fixing local width constraints should solve it without side effects to card layout and responsiveness.
- If you still want even tighter cards after this, second pass can add max-width constraints per card column.

Validation checklist after implementation
1) In `/` gym grid, each color tile shows:
- square swatch
- controls directly under it
- controls total width equal to (or slightly less than) swatch width
2) No gym card shows giant wide `# / HEX` controls anymore.
3) Works in both normal mode and edit mode (delete button still accessible).
4) No overlap/regression in 2-column color grid across desktop/tablet.

Technical notes
- Primary change scope: `src/components/shared/ColorSwatch.tsx`
- No data, hooks, or mutation logic changes.
- This is purely a sizing/layout correction of classnames and control geometry.
