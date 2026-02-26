

# Elevate the Main Logo Display

## Problem
The main logo just sits flat on the card with only a basic `drop-shadow-lg`. It doesn't feel like it "lifts off" the page -- it blends into the white background with no depth or presence.

## Solution
Give the logo container and the logo image itself a layered, elevated treatment:

### Changes to `src/components/GymCard.tsx` (lines 260-290)

1. **Logo container** -- add a subtle inner background (very light gray gradient or soft radial glow using the gym's primary color) so the logo has a distinct "stage" to sit on, plus a soft inset shadow to create depth.

2. **Logo image** -- replace the basic `drop-shadow-lg` with a multi-layer box shadow on a wrapper div that creates a floating/lifted effect:
   - Layer 1: tight shadow for contact (`0 2px 8px rgba(0,0,0,0.12)`)
   - Layer 2: medium spread for lift (`0 8px 24px rgba(0,0,0,0.10)`)
   - Layer 3: wide ambient glow using the gym's primary color (`0 12px 40px primaryColor/0.15`)
   - Add a white/light background pad behind the image with rounded corners so logos with transparency still pop

3. **Hover effect** -- on hover, increase the shadow spread slightly and add a subtle `translate-y-[-2px]` to make the logo feel like it rises further off the card.

### Technical Detail

The logo `<img>` will be wrapped in a styled container div:
```text
background: linear-gradient(135deg, #fafafa, #f0f0f0)
border-radius: 12px
padding: 12px
box-shadow: 0 2px 8px rgba(0,0,0,0.1),
            0 8px 24px rgba(0,0,0,0.08),
            0 12px 40px ${primaryColor}22,
            inset 0 1px 0 rgba(255,255,255,0.9)
transition: all 0.3s ease
```

On hover:
```text
box-shadow: 0 4px 12px rgba(0,0,0,0.14),
            0 12px 32px rgba(0,0,0,0.12),
            0 16px 48px ${primaryColor}33
transform: translateY(-2px)
```

This creates a "card within a card" feel where the logo appears to float above the surface.

