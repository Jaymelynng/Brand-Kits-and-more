

The user is on `/gym/OAS` profile page trying to upload a logo. They click an "Add Logos" / upload button and it just toggles to "Hide Upload" with no actual upload area appearing. Let me check the GymProfile.tsx file.
<lov-tool-use id="toolu_vrtx_017j8KcYvu7gCeibsCLz9ssp" name="code--search_files" integration-id="code" data="{\"query\": \"showUpload|Hide Upload|Add Logos\", \"include_patterns\": \"src/pages/GymProfile.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01HufqqKrSt7Xhf7gKr9xpXL" name="code--search_files" integration-id="code" data="{\"query\": \"showUpload|Hide Upload|Add Logos\", \"include_patterns\": \"src/pages/GymProfile.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01XSrE68G2VeJrEe6V7vBF8o" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/GymProfile.tsx\", \"lines\": \"1120-1260\"}">
</lov-tool-use>
I see the issue. The "Add Logos" button toggles `showUpload`, but the upload card is rendered ABOVE the gallery (`mb-8` before the gallery). When user clicks "Add Logos" while scrolled to the gallery section, the upload card appears way up at line 1135 — far above the button they just clicked. From their viewport, nothing visible happens, then the button text changes to "Hide Upload."

<lov-plan>

## Fix: "Add Logos" Button Reveals Upload Out of View

### The Problem
You click "Add Logos" on the Logo Gallery and the button changes to "Hide Upload" — but no upload area appears where you're looking. That's because the upload card is rendered *above* the gallery card, not next to or inside the button. When you click from the gallery section, the upload card pops in way up the page (out of your viewport), so it looks like nothing happened.

### The Fix

Two changes to `src/pages/GymProfile.tsx`:

**1. Auto-scroll to the upload card when it opens.**
When you click "Add Logos," scroll the upload card into view automatically so you actually see the drop zone.

**2. Move the upload card to render directly above the gallery (sticky position).**
Right now there's a big gap because of other content. Place the upload card immediately before the Logo Gallery card with no margin gap, so opening it visibly slides in right above where you clicked.

**3. Bonus — also make the gallery header itself a drop zone.**
Add drag-and-drop directly on the Logo Gallery header strip so you can drop files without ever opening the upload card. The card stays as a fallback for click-to-browse and bulk uploads.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/GymProfile.tsx` | Add `useRef` for upload card. On `setShowUpload(true)`, scroll ref into view smoothly. Make Logo Gallery header accept drag/drop using existing `handleDrop` handlers. |

### What You'll See After
- Click "Add Logos" → page smoothly scrolls to the upload drop zone (no more invisible toggle)
- Drag a file directly onto the Logo Gallery header → uploads instantly without opening anything
- Click "Hide Upload" → card collapses and stays in place

