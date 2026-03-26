

## Fix: Include Gym Name in Bulk Download Filenames

### Problem
Bulk-downloaded QR codes only include the destination type and label in the filename (e.g., `booking_booking-(events).png`) but not the gym name. The single-mode download already includes the gym name correctly.

### Change

**File: `src/components/qr-studio/QRGenerator.tsx`** — `handleDownloadAll` function (line 375)

Update the filename construction to include the gym name(s):
- If exactly 1 gym is selected in `selectedBulkGyms`, prepend that gym's name to every filename
- If multiple gyms are selected, prepend all selected gym codes joined by a dash
- Result: `crunch-fitness_booking_booking-events.png` instead of `booking_booking-(events).png`

The filename parts order will be: **gym name → destination type → QR label** (matching the single-mode convention).

