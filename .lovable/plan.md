

## Enhance Bulk Productivity: Logo Shortcuts to Profiles + Dual-Action Grid

### What Changes

**1. Make top logo thumbnails double as profile shortcuts**
- Left-click: toggles selection (current behavior)
- Right-click or small link icon: navigates to `/gym/{code}` profile page
- Add a tiny external-link icon overlay on hover (bottom-right corner) that navigates to the profile on click (with `e.stopPropagation()` so it doesn't toggle selection)

**2. Add a "Jump to" scroll shortcut on each logo**
- Clicking the gym code label below the logo scrolls to that gym's card below (using existing `onScrollToGym`)
- The logo click stays as selection toggle; the code text becomes the scroll shortcut

### Technical Details

**File: `src/components/GymNavigation.tsx`**
- Import `ExternalLink` from lucide-react
- On each gym logo container, add a hover overlay with a small link icon (absolute positioned, bottom-right)
- The link icon's `onClick` calls `e.stopPropagation()` then `navigate(`/gym/${gym.code}`)`
- Change the gym code `<span>` to be clickable — on click, call `e.stopPropagation()` then `onScrollToGym(gym.code)` to jump to the card below
- Add `cursor-pointer underline` hover styles to the code label to hint it's clickable

### Visual Behavior
- **Click logo area** → toggle selection (unchanged)
- **Hover logo** → small profile link icon appears in corner
- **Click profile icon** → navigate to `/gym/CODE`
- **Click gym code text** → smooth-scroll to that gym's card below

