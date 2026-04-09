

## Make Gym Pill Strip a Global Sticky Component

### What You Want
The gym selector pill strip (the row of logo thumbnails with CCP, CPF, CRR, etc.) should be visible on **every page** -- not just the front page. When you're on `/gym/CCP`, you can click another gym's pill to jump straight to `/gym/EAG` without going back to the dashboard first.

### What Changes

**1. Extract `GymPillStrip` into its own component**
- Pull the pill strip markup (the horizontal row of gym logo pills + counter) out of `GymNavigation.tsx` into a new `src/components/GymPillStrip.tsx`
- It receives `gyms` from `useGyms()` internally (self-contained, no prop drilling)
- On the **front page**: clicking a pill toggles selection (existing behavior) AND the code text scrolls to the card
- On **any other page** (profile, assets, QR studio): clicking a pill navigates to `/gym/CODE`
- Uses `useLocation()` to detect which page it's on and switch behavior accordingly
- Current gym gets a highlighted/active state on profile pages

**2. Create a shared layout wrapper**
- New `src/components/GlobalNav.tsx` that renders:
  - The pill strip (sticky at top, `z-50`)
  - `{children}` below it
- Wrap all routes in `App.tsx` with this layout component
- On the front page, the existing `GymNavigation` header (title + action bar) renders **below** the global pill strip as before
- On profile pages, the `← Dashboard` back button sits below the pill strip

**3. Styling**
- Compact single-row strip: same design as current (logo thumbnails, colored borders, gym codes)
- Sticky `top-0` with a subtle bottom shadow
- On profile pages, the **current gym's pill** gets a persistent highlight (thicker border, no opacity reduction)
- Background matches current blush/rose-gold gradient

### Files to Change

| File | Change |
|------|--------|
| `src/components/GymPillStrip.tsx` | **New** -- extracted pill strip with route-aware click behavior |
| `src/components/GlobalNav.tsx` | **New** -- layout wrapper rendering pill strip + children |
| `src/components/GymNavigation.tsx` | Remove the pill strip section (keep title bar + action bar) |
| `src/App.tsx` | Wrap `<Routes>` with `<GlobalNav>` |
| `src/pages/GymProfile.tsx` | Remove redundant back-nav if pill strip covers navigation |

### Technical Notes
- `useGyms()` is already cached by React Query -- calling it in the pill strip component adds zero extra network requests
- `useLocation().pathname` determines behavior: if starts with `/gym/` → navigate mode; if `/` → selection toggle mode
- The pill strip on non-dashboard pages won't show Select All / Clear All / Copy Colors -- those stay on the dashboard only
- Counter pill ("13 of 13 selected") only shows on the front page

