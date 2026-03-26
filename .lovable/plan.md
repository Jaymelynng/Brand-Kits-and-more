

## Redesign QR Studio Generator — Logo Grid + Bulk-First Layout

### Problem
The current QR Generator uses a dropdown for gym selection and has a generic form-heavy UI. You want the same clickable gym logo grid from the Bulk Brand Center homepage, with bulk paste as the primary workflow.

### What Changes

**1. Replace gym dropdown with clickable logo grid**
- Reuse the same gym logo thumbnail pattern from GymNavigation: 40x40px logos, click to select, highlighted border + checkmark when active
- In single mode: click one gym to select it (auto-loads logo)
- In bulk mode: select multiple gyms to auto-match logos to pasted entries
- Grid sits at the top of the page, always visible

**2. Flip tab order: Bulk first, Single second**
- "Bulk Generate" becomes the default/first tab since that's the primary workflow
- "Single QR Code" becomes the secondary tab

**3. Redesign bulk workflow layout**
- Top: gym logo selector grid
- Middle: large paste area for bulk content (name + URL pairs)
- Below paste: parse preview table with validation states
- Bottom: generated QR cards grid with batch actions
- Remove the manual logo upload from bulk (gym logos auto-populate from selection)

**4. Clean up single mode**
- Top: gym logo selector grid (click one)
- Below: compact form — URL input, title, destination type, label toggle
- Right panel: QR preview (keep existing two-panel layout)
- Keep manual logo upload as fallback

**5. Style improvements**
- Match the soft blush/rose accent from the main app
- Stronger card shadows and borders per user preference
- Denser layout, less whitespace
- Better visual hierarchy between input and output areas

### Files Modified

| File | Change |
|------|--------|
| `src/components/qr-studio/QRGenerator.tsx` | Major rewrite: add gym logo grid, flip tabs, redesign layout, remove dropdown |
| `src/components/qr-studio/QRStudioLayout.tsx` | Minor style tweaks to match brand aesthetic |

### Technical Details
- Fetch gyms with logos via same query pattern as Index.tsx (`gyms` + `gym_logos` join)
- Selected gym state: `Set<string>` for bulk, single `string` for single mode
- Auto-match in bulk: when gyms are selected, their logos overlay onto QR codes whose parsed label matches the gym name/code
- No database changes needed

