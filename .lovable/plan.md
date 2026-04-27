## Goals

1. **Logo shape should match the QR frame** — when the frame is a circle, use a circular logo crop (so the logo fills nicely and stops looking awkward inside square padding). Square/rounded frames keep the existing aspect-preserving fit.
2. **Inline website previews** — next to every generated QR, show a small live screenshot of the destination URL so you can scan-verify without clicking each one.

---

## 1. Logo auto-fits the frame shape

**File:** `src/utils/qrGenerator.ts`

Pass the active `frameShape` into the logo overlay step and use it to decide the safe-zone shape:

- `circle` frame → logo is masked to a **circle**, sized so the logo's longest edge fills the circle. White safe-zone is a slightly larger circle (current behavior — already correct here).
- `rounded` frame → logo masked to a **rounded square** (matches frame personality).
- `square` / `tall` / `wide` → keep current aspect-preserving fit on a circular safe-zone (works for any logo proportion without stretching).

Only the safe-zone + clip path change. The aspect-ratio fix from the previous turn stays — logos are never stretched, just cropped/masked to match the frame.

## 2. Live website preview next to each generated QR

**File:** `src/components/qr-studio/QRGenerator.tsx` (bulk results grid, ~lines 1053-1069)

Add a small thumbnail beside each QR card showing the destination page. Two-column mini layout per result:

```text
┌──────────────────────────────┐
│  Title — Sublabel            │
│  ┌────────┐  ┌────────────┐  │
│  │   QR   │  │  website   │  │
│  │  image │  │  preview   │  │
│  └────────┘  └────────────┘  │
│  https://destination/url     │
└──────────────────────────────┘
```

**How the preview is fetched:**
- Use a free, no-auth screenshot service that takes a URL and returns a PNG (e.g. `https://image.thum.io/get/width/300/{url}` or `https://s.wordpress.com/mshots/v1/{url}?w=300`). These work as plain `<img src>` — no API key, no edge function, no Firecrawl credits.
- Lazy-load: only fetch when the card scrolls into view (`loading="lazy"` on the `<img>`).
- Graceful fallback: on `onError`, show a small "preview unavailable" tile with the URL hostname so the layout never breaks.

**Where it appears:**
- Bulk results grid (the main verification surface) — primary win.
- Single QR preview panel — also add the thumbnail under the QR so single-mode verification matches.

**No new dependencies, no backend changes, no DB changes.** Pure client-side render.

---

## Out of scope (unchanged)

- Parsing logic, fuzzy gym matching, label resolution, save/download flows — all stay as-is.
- QR generation core (size, error correction, frame wrapper) — only the logo masking step is touched.

---

## Technical summary

- `qrGenerator.ts`: extend `QRGenerateOptions` with `frameShape` already available; route it into the logo draw step and switch the clip path between circle / rounded-rect.
- `QRGenerator.tsx`: add a `<UrlPreview url={...} />` inline component (~30 lines) using `s.wordpress.com/mshots` as the image source with `onError` fallback. Drop it into both the bulk results card and the single preview panel.
