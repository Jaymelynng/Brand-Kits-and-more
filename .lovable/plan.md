

## Fix: Labels Off by Default

The label toggle (`showBulkLabel` and `showSingleLabel`) both default to `true`, which bakes text into every QR code image. When you put these on a flyer, you'd have to edit all of them to remove the text.

### Change

**File: `src/components/qr-studio/QRGenerator.tsx`**

1. Change `showBulkLabel` default from `true` to `false` (line 132)
2. Change `showSingleLabel` default from `true` to `false` (wherever it's defined)

Labels remain available via the toggle switch — you just flip it on when you actually want text on the QR code.

