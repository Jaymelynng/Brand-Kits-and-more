

## Add Client-Side Background Removal for Logos

### What it does
Adds a "Remove Background" button to each logo in the gym profile. When clicked, it processes the image in-browser to remove the background, then uploads the cleaned version as a new logo variant.

### How it works
- Uses the `@imgly/background-removal` npm package (runs entirely in the browser, no API key needed)
- Downloads a ~30MB AI model on first use (cached after that), processes images in seconds
- The cleaned image is uploaded to Supabase storage as a new logo entry (original is preserved)

### Technical Details

**1. Install dependency**
- Add `@imgly/background-removal` package

**2. Create a reusable hook: `src/hooks/useBackgroundRemoval.ts`**
- Wraps the `@imgly/background-removal` library
- Manages loading/progress state (model download + processing)
- Takes an image URL, returns a processed Blob with transparent background
- Shows progress via a toast or inline indicator

**3. Update `src/pages/GymProfile.tsx`**
- Add a "Remove BG" button next to each logo's action buttons (Download, Copy URL, Delete, Set Main)
- On click: fetch the image, run background removal, upload result as a new logo via `useUploadLogo`
- Show a loading spinner/progress indicator while processing
- Display a toast on success with the new transparent logo

**4. Flow**
1. User clicks "Remove BG" on a logo
2. Loading indicator appears (first time: "Downloading AI model...", subsequent: "Processing...")
3. Background is removed client-side
4. New PNG with transparent background is auto-uploaded to `gym-logos` storage bucket
5. New logo entry appears in the gallery
6. Original logo is preserved

### Quality Notes
- Works excellently for logos with solid/simple backgrounds (which is most gym logos)
- Outputs PNG with alpha transparency
- The AI model is cached in the browser after first download, so subsequent uses are fast
