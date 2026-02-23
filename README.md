# Gym Brand Kit Database

A comprehensive gym brand asset management application for managing brand colors, logos, elements, and marketing campaign assets across multiple gym locations.

**Project URL**: https://lovable.dev/projects/4567f4e3-1d91-48bc-a40a-7900771efd38

## Features

### Dashboard (`/`)
- Grid view of all gym brand cards with colors, logos, and quick actions
- Diamond selector navigation bar for selecting/deselecting gyms
- Search bar to filter gyms by name or code
- Copy all/selected gym colors to clipboard (with or without `#`)
- Admin toolkit (side sheet) for adding gyms, toggling edit mode, and granting admin access
- Back-to-top floating button

### Gym Profile (`/gym/:gymCode`)
- Full brand hub for a single gym with hero section, color palette, and logo gallery
- Four logo view modes: carousel (3D coverflow), grid, list, masonry
- Upload logos via drag-and-drop or file picker
- Client-side AI background removal (`@imgly/background-removal`)
- Download all assets as ZIP (`jszip`)
- Dark/light logo preview toggle
- Brand elements section (banners, shapes, backgrounds, icons)
- Element upload with type categorization
- Contact & location editing (address, phone, email, website)
- Asset renamer with AI-suggested filenames via Supabase edge function
- Batch selection and smart rename workflow

### Campaigns (`/campaigns`)
- Campaign management hub for marketing campaigns
- Create, update, delete campaigns with status (active, upcoming, archived)
- Thumbnail upload for campaign cards
- Navigate to individual campaign detail views

### Campaign Detail (`/campaigns/:campaignName`)
- Full campaign asset management with sidebar filters
- Upload assets (images, videos, PDFs, DOCX, XLSX) with auto gym-code detection
- Bulk select, bulk delete, bulk copy links (plain, markdown, HTML, video embed)
- Download selected/all as ZIP with gym-organized folder structure
- Asset detail modal with classification (asset type, channel tags)
- Bulk gym assignment dialog
- Grouping by gym, file type, or flat view
- Legacy gym logos/elements section via campaign tags

### Asset Library (`/assets`)
- Cross-campaign asset search and browsing
- Filter by asset type, channel, campaign, and gym
- Grid and list view modes
- Asset detail, edit, and share modals with QR code generation

### Bulk Upload (`/bulk-upload`)
- Upload multiple assets with automatic filename parsing
- Filename convention: `GYMCODE-assettype-descriptor-v1.ext`
- Auto-detection of gym codes and routing to correct tables
- Preview panel showing parsed results grouped by gym

### Authentication (`/auth`)
- 4-digit PIN-based admin login
- PIN verified via Supabase edge function (`verify-pin`) using bcrypt
- Magic link session creation for authenticated access
- Admin role checked via `user_roles` table

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui (Radix primitives), custom CSS variables
- **State**: TanStack React Query for server state
- **Backend**: Supabase (PostgreSQL, Storage, Edge Functions, Auth)
- **Libraries**: JSZip, QRCode, react-dropzone, embla-carousel, @imgly/background-removal, recharts

## Database Schema (Supabase)

### Tables
| Table | Purpose |
|---|---|
| `gyms` | Gym records (name, code, contact info, hero video URL) |
| `gym_colors` | Brand colors per gym (hex, order index) |
| `gym_logos` | Logo files per gym (URL, filename, main logo flag) |
| `gym_elements` | Brand elements per gym (SVG/image, type, color, variant) |
| `campaigns` | Marketing campaigns (name, status, thumbnail) |
| `campaign_tags` | Links gym logos/elements to campaigns |
| `campaign_assets` | Uploaded campaign files (URL, type, size, gym assignment) |
| `asset_types` | Asset type classifications |
| `asset_channels` | Distribution channels (email, social, print, etc.) |
| `asset_channel_tags` | Links campaign assets to channels |
| `user_roles` | User role assignments (admin/user) |
| `user_profiles` | Basic user profile data |
| `admin_pins` | Hashed PINs for admin authentication |
| `flyer_templates` | Template definitions for flyer generation |

### Views
| View | Purpose |
|---|---|
| `gym_icon_urls` | Computed icon URLs per gym |

### Functions
| Function | Purpose |
|---|---|
| `has_role` | Check if a user has a specific role |
| `make_me_admin` | Grant admin role to the calling user |

### Edge Functions
| Function | Purpose |
|---|---|
| `verify-pin` | Verify 4-digit PIN and create auth session |
| `analyze-image` | AI image analysis for smart filename suggestions |

## Project Structure

```
src/
  App.tsx              # Router and providers
  main.tsx             # Entry point
  index.css            # Global styles and CSS variables
  lib/
    utils.ts           # cn() utility
    assetNaming.ts     # Filename parsing and generation
  hooks/
    useGyms.ts         # Gym CRUD + logo/element/color mutations
    useAuth.ts         # Auth state and admin check
    useCampaigns.ts    # Campaign CRUD + tagging
    useCampaignAssets.ts # Campaign asset queries
    useAllAssets.ts    # Cross-campaign asset search
    useAssetTypes.ts   # Asset type management
    useAssetChannels.ts # Channel tag management
    useBackgroundRemoval.ts # Client-side BG removal
    use-toast.ts       # Custom toast hook (Radix-based)
    use-mobile.tsx     # Mobile breakpoint detection
  pages/
    Index.tsx          # Main dashboard
    GymProfile.tsx     # Individual gym brand hub
    Auth.tsx           # PIN login
    Campaigns.tsx      # Campaign listing
    CampaignDetail.tsx # Campaign asset management
    AssetLibrary.tsx   # Cross-campaign asset browser
    BulkUpload.tsx     # Bulk asset upload tool
    NotFound.tsx       # 404 page
  components/
    GymCard.tsx        # Dashboard gym card
    GymNavigation.tsx  # Top navigation with diamond selectors
    GymSearchBar.tsx   # Search input for gym filtering
    GymContactInfo.tsx # Editable contact info section
    AdminToolkit.tsx   # Admin side panel
    AddGymModal.tsx    # New gym creation dialog
    DiamondSelector.tsx # Animated diamond selection toggle
    SecretAdminButton.tsx # Admin toolkit trigger
    AssetRenamer.tsx   # AI-powered batch rename dialog
    AssetPreview.tsx   # File type-aware asset preview
    AssetDetailModal.tsx # Full asset detail with classification
    AssetEditModal.tsx # Asset edit/delete dialog
    AssetShareModal.tsx # Share with QR code
    AssetSidebar.tsx   # Campaign detail sidebar filters
    AssetStatusCards.tsx # File type count cards
    AssetFilterBar.tsx # Search, group, and select controls
    AssetTypeSelector.tsx # Asset type dropdown
    BulkGymAssignmentDialog.tsx # Bulk gym assignment
    CampaignAssetUpload.tsx # Campaign file upload dialog
    ChannelTagToggle.tsx # Channel tag badges
    ChannelCheckboxes.tsx # Channel checkbox group
    HeroVideoBackground.tsx # Video hero section
    FlyerGenerator.tsx # Canvas-based flyer generation
    FlyerTemplateBuilder.tsx # Flyer template zone editor
    shared/
      BrandCard.tsx    # Styled card with variants
      ColorSwatch.tsx  # Color display with copy/edit/delete
      GymColorProvider.tsx # Dynamic CSS variable injection
  integrations/supabase/
    client.ts          # Supabase client instance
    types.ts           # Auto-generated database types
supabase/
  functions/
    verify-pin/        # PIN verification edge function
    analyze-image/     # AI image analysis edge function
  migrations/          # Database migration files
```

## Development

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

## Deployment

Open [Lovable](https://lovable.dev/projects/4567f4e3-1d91-48bc-a40a-7900771efd38) and click Share > Publish, or connect a custom domain via Project > Settings > Domains.
