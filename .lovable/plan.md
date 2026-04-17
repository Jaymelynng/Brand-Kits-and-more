

The user wants a way to copy hosted image URLs from logos. Per memory, logo cards in the gym profile gallery already have a "Copy URL" button. Let me verify this and check what's missing — the user might mean they want it on the dashboard gym cards too, or it's not working/visible.

Looking at `src/components/GymCard.tsx` (dashboard cards): the `copyLogoUrl` function exists, but the URL copy button only appears inside the `showAllLogos` gallery section — which is gated by a prop and likely off by default on the dashboard.

The user is on `/` (dashboard) right now. They want to copy the main logo URL directly without digging.

## Add Quick Copy URL Button to Gym Cards

### What You Want
Yes, all logos are hosted on Supabase storage with public URLs. You want a fast way to copy that URL.

### What's Missing
Right now you can only copy a logo URL from the expanded "All Logos" gallery view, which is hidden by default. On the dashboard, there's no quick way to grab the main logo's hosted URL.

### What We'll Add

**1. Dashboard gym cards (`GymCard.tsx`)**
Add a "Copy URL" button next to the existing "Logo" download button under the main logo. One click copies the main logo's public Supabase URL to clipboard with a toast confirmation.

**2. Gym profile page (`GymProfile.tsx`)**
Confirm/add a "Copy URL" button on every logo card in the gallery (per memory this exists — verify it's visible and working).

### Files to Change

| File | Change |
|------|--------|
| `src/components/GymCard.tsx` | Add a "Copy URL" button beside the Logo download button. Uses existing `copyLogoUrl` helper. |
| `src/pages/GymProfile.tsx` | Verify Copy URL button on each gallery logo; add if missing. |

### How URLs Work
Logos are uploaded to a public Supabase storage bucket. Each logo's `file_url` is a permanent public link (e.g. `https://...supabase.co/storage/v1/object/public/gym-logos/...`) that anyone can hotlink — perfect for HTML emails, social posts, or external tools.

