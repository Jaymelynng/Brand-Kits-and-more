

## Improve Profile Page Navigation

### Problems You're Reporting
1. **No easy way to get back to dashboard** -- the "Back to Dashboard" button is buried in the page header and scrolls away
2. **Back-to-top button exists but is just a circle** -- needs to be more visible and always accessible
3. **The frozen gym pill strip at top is hard to use** -- pills are small and the faded styling makes them feel broken

### What We'll Build

**A fixed side navigation rail (right edge of screen)** with:
- **Home/Dashboard button** -- always visible, takes you back to `/`
- **Up arrow** -- scrolls to top of the current page
- **Down arrow** -- scrolls to bottom of the current page
- Small, compact vertical bar that doesn't block content

**Improve the sticky pill strip:**
- Remove the opacity fade on non-active pills (all pills fully visible)
- Make pills slightly larger and easier to click
- Add a visible "Home" pill at the start of the strip that goes to `/`

### Files to Change

| File | Change |
|------|--------|
| `src/components/FloatingNavRail.tsx` | **New** -- fixed right-side vertical nav with Home, Up, Down buttons |
| `src/components/GymPillStrip.tsx` | Add a Home pill at the start; remove `opacity-70` on unselected pills so they're all clearly visible; slightly increase pill size |
| `src/pages/GymProfile.tsx` | Add `<FloatingNavRail />`, remove the old back-to-top button at the bottom |
| `src/pages/AssetHub.tsx` | Add `<FloatingNavRail />` |
| `src/components/qr-studio/QRStudioLayout.tsx` | Add `<FloatingNavRail />` |

### FloatingNavRail Design
- Fixed position, right edge, vertically centered
- 3 buttons stacked: Home icon → Up arrow → Down arrow
- Solid white background, shadow, rounded-full buttons
- Compact (40px wide rail)
- Shows on all pages except the dashboard (dashboard already has full navigation)

