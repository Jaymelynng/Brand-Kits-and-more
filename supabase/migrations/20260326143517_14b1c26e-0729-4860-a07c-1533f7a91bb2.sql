
-- QR Generated table
CREATE TABLE public.qr_generated (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  qr_type text NOT NULL DEFAULT 'text',
  qr_image_url text NOT NULL,
  title text,
  batch_id text,
  batch_name text,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  destination_type text,
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.qr_generated ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read qr_generated" ON public.qr_generated FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert qr_generated" ON public.qr_generated FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update qr_generated" ON public.qr_generated FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete qr_generated" ON public.qr_generated FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- QR Scans table
CREATE TABLE public.qr_scans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name text NOT NULL,
  qr_data text NOT NULL,
  qr_type text NOT NULL DEFAULT 'text',
  is_url boolean DEFAULT false,
  preview_image text,
  notes text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read qr_scans" ON public.qr_scans FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert qr_scans" ON public.qr_scans FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update qr_scans" ON public.qr_scans FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete qr_scans" ON public.qr_scans FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
