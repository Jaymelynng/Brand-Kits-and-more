# Bulk Brand Center — Project Plan & Changelog

## Current State (April 2026)

### Working Features
| Feature | Route | Status |
|---------|-------|--------|
| Dashboard (Bulk Brand Center) | `/` | Stable — 2-column card grid, bulk color copying, gym pill selector, search |
| Gym Profile Pages | `/gym/:code` | Stable — hero banner, logo gallery, brand colors, brand elements |
| QR Studio | `/qr-studio` | Stable — scan, generate, library tabs |
| Admin Dashboard | `/admin` | Stable — manage gyms table, bulk data editing |
| Auth (PIN-based admin) | `/auth` | Working but session expiry causes silent UI degradation |
| My Brand | `/my-brand` | Working — personal brand colors, images, fonts |

### Partially Built / Needs Work
| Feature | Route | Status |
|---------|-------|--------|
| Asset Hub | `/assets` | **Layout does not match intended design.** Section-based card grid with category sidebar was designed but current build has flat grid with rotating cards. Sub-categories exist in DB but not wired to UI filtering. This is the #1 priority. |

### Removed
| Feature | When | Why |
|---------|------|-----|
| Gym Info card on profile pages | April 2026 | Address/Phone/Email/Website/Facebook/Instagram/Programs fields removed from `/gym/:code`. Data stays in DB, managed via Admin dashboard's Manage Gyms table. Unused state variables (`editingField`, `updateGymInfoMutation`) remain in GymProfile.tsx for cleanup. |
| Themes page | March 2026 | Replaced with redirect to `/assets`. ThemeDetail also redirects. |

---

## Changelog

### April 2026
- Removed Gym Info section from all gym profile pages (address, phone, email, website, social links, programs)
- Full front page architecture documentation created (67-step interaction breakdown)
- Memory audit and documentation overhaul

### March 2026
- Asset Hub rebuilt with section-based layout, rotating asset cards, collapsible sidebar
- Asset sub-categories added to DB (Primary, Dark Version, Icon Only, Hero Images, Icons, Dividers, Posts, Stories, In-Gym Shots, Flyers)
- Themes page converted to redirect → `/assets`

### February 2026
- QR Studio added (scan, generate, library)
- QR codes stored in `qr_generated` and `qr_scans` tables

### Earlier
- Core dashboard with 13 gyms, bulk color copy, gym pill selector
- Gym profile pages with hero banner, logo gallery, brand elements
- PIN-based admin auth with `user_roles` table
- Brand elements (SVG icons) per gym
- Personal brand page (`/my-brand`)
- Edge functions: analyze-image, set-pin, verify-pin

---

## Next Priorities (Ranked by Value Impact)

### 1. Asset Hub Layout Rebuild
The current card grid doesn't match the intended section-based design. Need:
- Visible section headers per asset type (Logos, Email Assets, Social Media, Marketing)
- Sub-category grouping within sections
- Dominant thumbnail cards with coverage badges
- Category tree in sidebar actually filtering content
- Theme tags as cross-cutting filter pills

### 2. Auth Session Resilience
Auth token expiry silently hides admin UI (upload buttons, edit controls disappear). Need:
- Auto-detect expired session and prompt re-login
- Or auto-refresh tokens before expiry
- Toast notification when session drops

### 3. Role Expansion (Future)
Current: just `admin` role. Future needs:
- Owner (full access, all gyms)
- Admin (full access, assigned gyms)
- Gym-level user (view/download only for their gym)

### 4. Cleanup
- Remove unused `editingField` / `editingFieldValue` state and related imports from GymProfile.tsx
- Remove unused gym info field icons (MapPin, Phone, Mail, Globe, Facebook, Instagram, ClipboardList)
