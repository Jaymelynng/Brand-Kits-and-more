
-- 1. Create theme_tags table
CREATE TABLE public.theme_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.theme_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read theme_tags" ON public.theme_tags FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert theme_tags" ON public.theme_tags FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update theme_tags" ON public.theme_tags FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete theme_tags" ON public.theme_tags FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create asset_theme_tags join table
CREATE TABLE public.asset_theme_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.gym_assets(id) ON DELETE CASCADE,
  theme_tag_id uuid NOT NULL REFERENCES public.theme_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_id, theme_tag_id)
);
ALTER TABLE public.asset_theme_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read asset_theme_tags" ON public.asset_theme_tags FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert asset_theme_tags" ON public.asset_theme_tags FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete asset_theme_tags" ON public.asset_theme_tags FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add columns to gym_assets
ALTER TABLE public.gym_assets ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.gym_assets ADD COLUMN IF NOT EXISTS is_all_gyms boolean NOT NULL DEFAULT false;

-- 4. Add file_url to gym_asset_assignments (per-gym URL)
ALTER TABLE public.gym_asset_assignments ADD COLUMN IF NOT EXISTS file_url text;

-- 5. Create asset_comments table
CREATE TABLE public.asset_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.gym_assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_mention_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.asset_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read asset_comments" ON public.asset_comments FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert asset_comments" ON public.asset_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own asset_comments" ON public.asset_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 6. Migrate existing data: asset_categories -> theme_tags
INSERT INTO public.theme_tags (name)
SELECT name FROM public.asset_categories
ON CONFLICT (name) DO NOTHING;

-- 7. Migrate existing data: create asset_theme_tags from gym_assets.category_id
INSERT INTO public.asset_theme_tags (asset_id, theme_tag_id)
SELECT ga.id, tt.id
FROM public.gym_assets ga
JOIN public.asset_categories ac ON ga.category_id = ac.id
JOIN public.theme_tags tt ON tt.name = ac.name
ON CONFLICT (asset_id, theme_tag_id) DO NOTHING;

-- 8. Copy gym_assets.file_url into each gym_asset_assignments.file_url
UPDATE public.gym_asset_assignments gaa
SET file_url = ga.file_url
FROM public.gym_assets ga
WHERE gaa.asset_id = ga.id AND gaa.file_url IS NULL;
