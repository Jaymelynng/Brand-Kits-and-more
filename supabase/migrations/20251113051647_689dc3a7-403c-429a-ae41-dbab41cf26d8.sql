-- Create campaign_assets table for diverse file types
CREATE TABLE IF NOT EXISTS public.campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE, -- nullable for admin resources
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- mime type
  file_size BIGINT,
  asset_category TEXT NOT NULL DEFAULT 'other', -- 'video', 'document', 'image', 'gif', 'other'
  metadata JSONB DEFAULT '{}'::jsonb,
  thumbnail_url TEXT, -- for video thumbnails
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add thumbnail_url to campaigns table
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Enable RLS on campaign_assets
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaign_assets
CREATE POLICY "Allow public read campaign_assets"
  ON public.campaign_assets FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert campaign_assets"
  ON public.campaign_assets FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update campaign_assets"
  ON public.campaign_assets FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete campaign_assets"
  ON public.campaign_assets FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger using the correct function name
CREATE TRIGGER campaign_assets_updated_at
  BEFORE UPDATE ON public.campaign_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX campaign_assets_campaign_id_idx ON public.campaign_assets(campaign_id);
CREATE INDEX campaign_assets_gym_id_idx ON public.campaign_assets(campaign_id, gym_id);
CREATE INDEX campaign_assets_category_idx ON public.campaign_assets(asset_category);

-- Create storage bucket for campaign assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-assets', 'campaign-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for campaign assets
CREATE POLICY "Allow public read campaign-assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'campaign-assets');

CREATE POLICY "Admins can upload campaign-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'campaign-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update campaign-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'campaign-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete campaign-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'campaign-assets' AND has_role(auth.uid(), 'admin'::app_role));