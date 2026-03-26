

## Fix QR Studio Layout Issues

### Problems
1. Gym logo grid is left-aligned instead of centered
2. Placeholder text says "Gift Certificates December 2024" — confusing and irrelevant
3. Overall content not centered on page

### Changes

**File: `src/components/qr-studio/QRGenerator.tsx`**

1. **Center the gym logo grid** — Change the flex container from `flex-wrap` to `flex flex-wrap justify-center` (line 66)
2. **Fix placeholder text** — Change batch title placeholder from `"e.g. Gift Certificates December 2024"` to `"e.g. Waiver Links March 2026"` (line 423)
3. **Center the bulk card** — Add `max-w-3xl mx-auto` to the Card wrapper so the form is centered on the page instead of stretching full width (line 402)
4. **Center single mode** — Add `max-w-4xl mx-auto` to the single tab grid container (line 541)

