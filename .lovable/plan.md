

## Phase 1: Database Foundation for Asset Management

### Current gym_logos data verified

I queried the existing data. Here's what's in `gym_logos` right now:

```text
GYM  | LOGOS | NOTES
-----|-------|------
CCP  |   3   | Capital_Logo_Color.png, capital holiday logo.png, Capital_Logos_AllGyms.gif (main)
CPF  |   1   | Capital_Logos_AllGyms.gif (main)
CRR  |   1   | CRR_Logo_BlackCircle.webp (main)
EAG  |   1   | Eagle Logo (main)
EST  |   1   | EST_Logo_Star.png (main)
HGA  |   1   | HGA_Logo_NewCircleShadow.png (main)
MGC  |   2   | Metro.jpg x2 (one main, one not — likely duplicate)
OAS  |  7+   | Various logos, gradient, glitter, backpack graphic, etc. (none marked main)
PLG  |  ...  | (truncated, need to check)
+ others
```

**Migration mapping is clean:** Every row has `gym_id`, `file_url`, `filename`, `is_main_logo` — all map directly to the new schema.

### Smart migration with known overrides

Instead of dumping everything as "Standard", the migration will detect obvious theme names from filenames:

- `capital holiday logo.png` → **Holiday** category
- `Capital_Logos_AllGyms.gif` → **Standard** + `is_global = true`
- Everything else → **Standard** (can be re-tagged later via UI)

This handles the two most obvious cases automatically. The rest is a small manual cleanup task once the Phase 2 edit UI exists.

---

### What gets built

**SQL Migration creating 4 tables:**

1. **`asset_types`** — Logo, Email Asset, Social Media, Marketing (seeded)
2. **`asset_categories`** — Standard, Holiday, Halloween, Summer Camp (seeded), with nullable `asset_type_id` for scoping
3. **`gym_assets`** — unified asset table (`file_url`, `filename`, `asset_type_id`, `category_id`, `is_global`)
4. **`gym_asset_assignments`** — many-to-many join (asset_id, gym_id, is_main), unique on (asset_id, gym_id)

**RLS:** Public SELECT on all 4 tables. Admin-only INSERT/UPDATE/DELETE (using existing `has_role` function).

**Data migration:** Existing `gym_logos` rows copied into `gym_assets` + `gym_asset_assignments` with the smart overrides above. Original `gym_logos` table untouched.

**No code changes** in this phase — the app continues using `gym_logos` until Phase 2 switches the UI over.

