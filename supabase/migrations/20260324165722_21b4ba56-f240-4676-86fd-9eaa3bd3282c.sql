-- Personal brand colors table (admin-only)
CREATE TABLE public.personal_brand_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  color_hex text NOT NULL,
  color_name text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.personal_brand_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with personal_brand_colors"
  ON public.personal_brand_colors
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Personal brand info table (admin-only, single row)
CREATE TABLE public.personal_brand_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text DEFAULT 'My Brand',
  tagline text,
  heading_font text,
  subheading_font text,
  body_font text,
  notes text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.personal_brand_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with personal_brand_info"
  ON public.personal_brand_info
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));