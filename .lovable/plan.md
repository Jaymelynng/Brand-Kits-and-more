
Use the gym code, not the gym name, in bulk download filenames.

## What’s wrong now
The current bulk download code in `src/components/qr-studio/QRGenerator.tsx` builds filenames like:

```text
[gym-name-or-guessed-match]_[destinationType]_[label].png
```

Specifically:
- it prefers `matchedGymName`
- then falls back to `matchedGymCode`
- then a guessed selection fallback
- and it also inserts `destinationType` as a separate middle segment

That is why you’re getting things like `crunch-fitness_...` instead of the format you asked for.

## What to change
Update `handleDownloadAll` so bulk filenames use this exact structure:

```text
(CCP)-_classes-page.png
```

Meaning:
- first segment = selected/matched gym code in parentheses
- then `-_`
- then the page/label slug
- no gym full name
- no extra destination segment unless you explicitly want it later

## Implementation plan
1. In `src/components/qr-studio/QRGenerator.tsx`, change the bulk filename builder in `handleDownloadAll`.
2. Stop using `matchedGymName` for the filename.
3. Use the QR’s `matchedGymCode` first; if missing, fall back to the single selected bulk gym’s `code`.
4. Format the gym prefix as:
   ```text
   (${gymCode})-
   ```
5. Append the page name from `qr.title` as the slugged filename body:
   ```text
   (${gymCode})-_${slugifiedTitle}.png
   ```
6. If no gym code is available, fall back to:
   ```text
   ${slugifiedTitle || `qr-${index + 1}`}.png
   ```

## Expected result
Examples after the fix:

```text
(CCP)-_classes-page.png
(EOS)-_join-now.png
(HP)-_free-pass.png
```

## Technical detail
The current code around lines `396-410` should be refactored from:

```text
[gymPrefix, dest, label].join('_')
```

to a direct custom formatter based on:
- `qr.matchedGymCode`
- selected gym `code`
- `qr.title`

So this is not a parsing problem anymore; it is a filename-formatting problem in `handleDownloadAll`.
