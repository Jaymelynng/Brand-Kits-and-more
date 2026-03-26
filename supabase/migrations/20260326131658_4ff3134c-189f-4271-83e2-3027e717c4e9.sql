-- Table for personal brand moodboard images
CREATE TABLE public.personal_brand_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url text NOT NULL,
  filename text NOT NULL,
  label text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.personal_brand_images ENABLE ROW LEVEL SECURITY;

-- Only admins can CRUD
CREATE POLICY "Admins can manage brand images"
  ON public.personal_brand_images
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for brand images
INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-brand', 'personal-brand', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view (public bucket)
CREATE POLICY "Public read personal-brand"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'personal-brand');

-- Admins can upload/delete
CREATE POLICY "Admin upload personal-brand"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'personal-brand' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete personal-brand"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'personal-brand' AND public.has_role(auth.uid(), 'admin'));