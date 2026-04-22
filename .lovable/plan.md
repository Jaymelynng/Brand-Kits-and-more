

## Bulk Resize QR Codes — One Slider Controls All

### What You Want
Instead of changing the frame shape per QR, you want to resize **one** QR code and have all the others in the batch automatically match that size. One slider → all QRs update together.

### How It Will Work

In **QR Generator** (`/qr-studio` → Generate tab), add a single **"Size"** slider above the preview grid:

- **Range**: 256px → 2048px (covers tiny stickers to large posters)
- **Default**: 512px (current)
- **Live preview**: as you drag, every QR thumbnail in the batch resizes in real time
- **Applies to**: every QR in the current batch — single or bulk
- **Downloads**: the exported PNG/ZIP uses the slider value, so what you see is what you download

The slider sits at the top of the generator panel so it's the first thing you reach for. A small readout next to it shows the current pixel size (e.g. "768 × 768 px").

### Bonus Quality-of-Life
- **Preset chips** under the slider for one-click common sizes: `Small 256` · `Medium 512` · `Large 1024` · `Print 2048`
- **Shape picker stays** but becomes secondary — size is the primary control since that's what you actually need
- Size choice is **remembered** for the session so you don't reset it every time

### Files to Change

| File | Change |
|------|--------|
| `src/components/qr-studio/QRGenerator.tsx` | Add `bulkSize` state. Add a `<Slider>` (256–2048, step 64) + preset chip buttons at the top of the generator panel. Pass `bulkSize` into every `generateQRCode({ size: bulkSize, ... })` call so all QRs in the batch render at the same pixel size. Re-trigger preview regeneration when slider changes (debounced ~150ms so dragging stays smooth). |
| `src/utils/qrGenerator.ts` | Already accepts `size` — no change needed. Confirmed it scales the canvas, label, and logo proportionally. |

### What You'll See After
- One slider at the top of the QR Generator
- Drag it → every QR preview resizes together instantly
- Click "Download All" → the ZIP contains PNGs at exactly the size you picked
- Preset buttons for fast jumps to common sizes

