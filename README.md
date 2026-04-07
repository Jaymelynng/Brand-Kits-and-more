# Bulk Brand Center

Multi-location gym brand asset management tool. Manage brand colors, logos, elements, and assets across 13+ gymnastics facilities from a single dashboard.

**Live**: [bulkbrands.mygymtools.com](https://bulkbrands.mygymtools.com)  
**Lovable Project**: [lovable.dev/projects/4567f4e3-1d91-48bc-a40a-7900771efd38](https://lovable.dev/projects/4567f4e3-1d91-48bc-a40a-7900771efd38)

---

## Features

### Dashboard (`/`)
- 2-column responsive grid of gym brand cards
- Bulk color copying: select gyms via pill strip, copy all HEX values at once
- Per-card: logo display, 4 color swatches with `#`/`HEX` copy buttons, profile link, logo download
- Search by gym name or 3-letter code
- Gym pill selector with 3 interaction zones (toggle selection, navigate to profile, scroll to card)

### Gym Profile Pages (`/gym/:code`)
- Hero banner with gym facility photo
- Main logo showcase with download
- Brand stats (logo variations, colors, elements counts)
- 4 brand colors with individual and bulk copy
- Logo gallery with carousel view, theme tag filters, upload, set-as-main, background removal, delete
- Brand elements grid (SVG icons, banners) with copy URL/SVG/delete

### Asset Hub (`/assets`)
- Cross-gym asset management with rotating thumbnail cards
- Section-based layout by asset type (Logo, Email Asset, Social Media, Marketing)
- Sub-categories per type (e.g. Primary, Dark Version, Icon Only under Logos)
- Collapsible sidebar with gym selector and category tree
- Coverage tracking per asset (X/13 gyms)
- Theme tag filtering (Standard, Holiday, Summer Camp, etc.)

### QR Studio (`/qr-studio`)
- Scan: decode QR codes from uploaded images
- Generate: create QR codes with gym branding
- Library: browse and manage generated/scanned QR codes

### Admin (`/admin`)
- Manage Gyms table with bulk editing (name, code, address, phone, email, website, social links, programs)
- PIN-based admin authentication

### My Brand (`/my-brand`)
- Personal brand colors, images, and font settings

---

## Tech Stack

- **Frontend**: React 18, TypeScript 5, Vite 5, Tailwind CSS v3
- **UI Components**: shadcn/ui
- **Backend**: Supabase (Lovable Cloud) — Postgres, Auth, Storage, Edge Functions
- **State**: TanStack React Query

---

## Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `gyms` | 13 gym facilities — name, code, address, phone, email, website, social links, hero video URL |
| `gym_colors` | 4 brand colors per gym (color_hex, order_index) |
| `gym_logos` | Logo files per gym (file_url, filename, is_main_logo) |
| `gym_elements` | SVG brand elements per gym (element_type, element_color, svg_data) |

### Asset Management Tables
| Table | Purpose |
|-------|---------|
| `asset_types` | 4 types: Logo, Email Asset, Social Media, Marketing |
| `asset_categories` | Sub-categories scoped to asset types (Primary, Dark Version, Hero Images, etc.) |
| `gym_assets` | Individual assets with file_url, filename, asset_type_id, category_id |
| `gym_asset_assignments` | Per-gym assignments of assets (asset_id → gym_id, file_url, is_main) |
| `asset_theme_tags` | Junction: asset ↔ theme tag |
| `theme_tags` | Cross-cutting tags: Standard, Holiday, Halloween, Summer Camp |
| `asset_comments` | Comments/notes on assets with @gym mentions |

### QR Tables
| Table | Purpose |
|-------|---------|
| `qr_generated` | Generated QR codes with content, gym_id, tags, batch info |
| `qr_scans` | Scanned/decoded QR codes with extracted data |

### Auth & User Tables
| Table | Purpose |
|-------|---------|
| `user_roles` | Role assignments (app_role enum: admin, user) |
| `admin_pins` | PIN hashes for admin elevation |
| `user_profiles` | Basic user profiles (email) |

### Personal Brand Tables
| Table | Purpose |
|-------|---------|
| `personal_brand_info` | Brand name, tagline, fonts, notes |
| `personal_brand_colors` | Personal color palette |
| `personal_brand_images` | Personal brand images |

### Views
| View | Purpose |
|------|---------|
| `gym_icon_urls` | Denormalized gym icons (calendar, chat, star URLs) |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `analyze-image` | AI image analysis |
| `set-pin` | Set admin PIN |
| `verify-pin` | Verify admin PIN for elevation |

---

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Index | Dashboard — bulk brand center |
| `/gym/:gymCode` | GymProfile | Individual gym brand page |
| `/assets` | AssetHub | Cross-gym asset management |
| `/qr-studio` | QRStudio | QR code scan/generate/library |
| `/admin` | Admin | Admin dashboard |
| `/my-brand` | MyBrand | Personal brand settings |
| `/auth` | Auth | Login/signup |
| `/themes` | Themes | Redirects → `/assets` |
| `/themes/:categoryId` | ThemeDetail | Redirects → `/assets?theme=:id` |

---

## Development

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
```

Requires Node.js & npm. Install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

Deploy via [Lovable](https://lovable.dev/projects/4567f4e3-1d91-48bc-a40a-7900771efd38) → Share → Publish.

Custom domain: Project → Settings → Domains → Connect Domain. [Docs](https://docs.lovable.dev/features/custom-domain#custom-domain)
