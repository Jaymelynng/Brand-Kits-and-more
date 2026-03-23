

## Replace Diamonds with Gym Logos & Clarify Bulk Copy Purpose

### What Changes

**1. Replace diamond selectors with mini gym logos**
- In the gym navigation grid, swap out the `DiamondSelector` component for each gym's main logo thumbnail
- Each logo will be a clickable square (~40x40px) with a checkbox overlay or colored border to indicate selection
- Selected gyms get a thick colored border + checkmark badge; unselected get a muted/desaturated look
- Clicking the logo toggles selection (same as diamond did)
- The gym code label stays below each logo

**2. Clarify the bulk copy purpose**
- Update the title from "Gym Brand Kit Database" to **"Bulk Color Copy Station"** or similar
- Update the subtitle to something like **"Select gyms below, then copy their brand colors"**
- Rename the action bar header area to reinforce that this section is for selecting & copying color data
- The "Copy (X)" button label becomes **"Copy Colors (X)"** and "Copy All" becomes **"Copy All Colors"**

### Technical Details

**File: `src/components/GymNavigation.tsx`**
- Remove `DiamondSelector` import
- For each gym in the grid, render the main logo (`gym.logos.find(l => l.is_main_logo)?.file_url`) as an `<img>` inside a clickable container
- Add selection state styling: selected = bright border + checkmark overlay + slight scale-up; unselected = gray border + slight opacity reduction
- Fallback to gym code text if no logo exists
- Update title/subtitle text and copy button labels

**File: `src/components/DiamondSelector.tsx`**
- No changes needed (kept for potential use elsewhere, just removed from navigation)

### Visual Design
- Logo thumbnails: 40x40px, `object-contain`, rounded-lg, white background
- Selected: 3px border in gym's primary color, scale 1.05, checkmark badge in top-right corner
- Unselected: 1px gray border, opacity 0.7
- Header: bolder text, "Bulk Color Copy Station" with clipboard/palette icon
- Copy buttons: "Copy Colors (13)" / "Copy All Colors" for clarity

