-- 1. Create asset_types table
CREATE TABLE public.asset_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read asset_types" ON public.asset_types FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert asset_types" ON public.asset_types FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update asset_types" ON public.asset_types FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete asset_types" ON public.asset_types FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed asset types
INSERT INTO public.asset_types (name, slug, order_index) VALUES
  ('Logo', 'logo', 0),
  ('Email Asset', 'email-asset', 1),
  ('Social Media', 'social-media', 2),
  ('Marketing', 'marketing', 3);

-- 2. Create asset_categories table
CREATE TABLE public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  asset_type_id uuid REFERENCES public.asset_types(id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read asset_categories" ON public.asset_categories FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert asset_categories" ON public.asset_categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update asset_categories" ON public.asset_categories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete asset_categories" ON public.asset_categories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed categories (null asset_type_id = applies to all types)
INSERT INTO public.asset_categories (name, description, asset_type_id, order_index) VALUES
  ('Standard', 'Default/primary assets', NULL, 0),
  ('Holiday', 'Holiday-themed assets', NULL, 1),
  ('Halloween', 'Halloween-themed assets', NULL, 2),
  ('Summer Camp', 'Summer camp themed assets', NULL, 3);

-- 3. Create gym_assets table
CREATE TABLE public.gym_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url text NOT NULL,
  filename text NOT NULL,
  asset_type_id uuid NOT NULL REFERENCES public.asset_types(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.gym_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read gym_assets" ON public.gym_assets FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert gym_assets" ON public.gym_assets FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update gym_assets" ON public.gym_assets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete gym_assets" ON public.gym_assets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_gym_assets_updated_at
  BEFORE UPDATE ON public.gym_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create gym_asset_assignments table
CREATE TABLE public.gym_asset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.gym_assets(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  is_main boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (asset_id, gym_id)
);

ALTER TABLE public.gym_asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read gym_asset_assignments" ON public.gym_asset_assignments FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert gym_asset_assignments" ON public.gym_asset_assignments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update gym_asset_assignments" ON public.gym_asset_assignments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete gym_asset_assignments" ON public.gym_asset_assignments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Migrate existing gym_logos into new schema
INSERT INTO public.gym_assets (id, file_url, filename, asset_type_id, category_id, is_global, created_at)
SELECT
  gl.id,
  gl.file_url,
  gl.filename,
  (SELECT id FROM public.asset_types WHERE slug = 'logo'),
  CASE
    WHEN lower(gl.filename) LIKE '%holiday%' THEN (SELECT id FROM public.asset_categories WHERE name = 'Holiday')
    ELSE (SELECT id FROM public.asset_categories WHERE name = 'Standard')
  END,
  CASE
    WHEN lower(gl.filename) LIKE '%allgyms%' THEN true
    ELSE false
  END,
  gl.created_at
FROM public.gym_logos gl;

-- Create assignments
INSERT INTO public.gym_asset_assignments (asset_id, gym_id, is_main)
SELECT gl.id, gl.gym_id, COALESCE(gl.is_main_logo, false)
FROM public.gym_logos gl
WHERE gl.gym_id IS NOT NULL;