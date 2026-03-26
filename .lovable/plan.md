
Fix the bulk workflow so gym identity is explicit, not guessed.

## Why it is still failing
Right now `src/components/qr-studio/QRGenerator.tsx` only puts a gym code in the filename when one of these is true:
- the label text itself matches a selected gym, or
- exactly one gym is selected

So with labels like `classes-page` and multiple gyms selected, there is no reliable match, `matchedGymCode` stays empty, and the download falls back to `classes-page.png`.

## What to change

### 1. Stop relying on label guessing for filenames
Refactor bulk row handling so each parsed entry gets a resolved gym assignment before generation/download.

Rules:
- If **1 gym** is selected: assign that gym to every pasted row
- If **multiple gyms** are selected: only assign a gym when the row explicitly identifies it
- If a row has no resolved gym: mark it invalid instead of silently generating a nameless file

### 2. Add explicit bulk row gym resolution
Update the parser in `QRGenerator.tsx` to support a gym-aware bulk format for multi-gym batches, for example:
```text
CCP - Classes Page - https://...
EOS - Classes Page - https://...
```
or another simple structured format using gym code first.

Each parsed row should carry:
- `resolvedGymId`
- `resolvedGymCode`
- `resolvedGymName`
- `title`
- `content`

### 3. Show the gym before anything is generated
Update the preview table to include:
- Gym
- Page/label
- URL
- Final filename preview

Example preview:
```text
CCP | Classes Page | https://... | (CCP)-_classes-page.png
```

If a row has no gym:
- highlight it
- show “Gym required”
- disable Generate All until fixed

### 4. Make downloads use only the resolved gym code
Refactor `handleBulkGenerate` and `handleDownloadAll` so filenames are built from the resolved row data, not from heuristic matching.

Target format:
```text
(${resolvedGymCode})-_${slugifiedTitle}.png
```

Examples:
```text
(CCP)-_classes-page.png
(EOS)-_join-now.png
(HP)-_free-pass.png
```

### 5. Keep single QR mode unchanged
Single mode can stay simple. This fix is mainly for the bulk workflow where you need to know which gym each file belongs to while placing them into print/design files.

## Files to update
- `src/components/qr-studio/QRGenerator.tsx`

## Technical notes
- Remove the current “best guess” dependency from `findMatchingGym` for filename correctness
- Keep gym logo matching as a convenience, but do not let it control naming
- No database changes needed for this fix
- Add a generated-row shape that stores the final resolved gym code directly so the download step is deterministic

## Result
After this change, bulk downloads will not silently save generic files like:
```text
classes-page.png
```

They will either:
- download correctly as:
```text
(CCP)-_classes-page.png
```
or
- be blocked in preview until a gym is explicitly assigned
