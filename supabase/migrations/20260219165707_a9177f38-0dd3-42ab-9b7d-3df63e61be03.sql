
-- Asset Types lookup table
CREATE TABLE public.asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read asset_types" ON public.asset_types FOR SELECT USING (true);
CREATE POLICY "Admins can insert asset_types" ON public.asset_types FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update asset_types" ON public.asset_types FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete asset_types" ON public.asset_types FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.asset_types (name, icon, sort_order) VALUES
  ('Email Header', 'mail', 1),
  ('Divider', 'minus', 2),
  ('Icon', 'shapes', 3),
  ('Shape', 'circle', 4),
  ('Photo', 'image', 5),
  ('Graphic', 'palette', 6),
  ('Video', 'video', 7),
  ('Logo', 'crown', 8),
  ('Badge', 'award', 9),
  ('Button', 'square', 10),
  ('Background', 'layers', 11);

-- Asset Channels lookup table
CREATE TABLE public.asset_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read asset_channels" ON public.asset_channels FOR SELECT USING (true);
CREATE POLICY "Admins can insert asset_channels" ON public.asset_channels FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update asset_channels" ON public.asset_channels FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete asset_channels" ON public.asset_channels FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.asset_channels (name, icon, sort_order) VALUES
  ('Email', 'mail', 1),
  ('Social Media', 'share-2', 2),
  ('In-Gym Signage', 'monitor', 3);

-- Junction table for asset-channel many-to-many
CREATE TABLE public.asset_channel_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.campaign_assets(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.asset_channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_id, channel_id)
);

ALTER TABLE public.asset_channel_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read asset_channel_tags" ON public.asset_channel_tags FOR SELECT USING (true);
CREATE POLICY "Admins can insert asset_channel_tags" ON public.asset_channel_tags FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update asset_channel_tags" ON public.asset_channel_tags FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete asset_channel_tags" ON public.asset_channel_tags FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add asset_type_id to campaign_assets
ALTER TABLE public.campaign_assets ADD COLUMN asset_type_id UUID REFERENCES public.asset_types(id);

-- Index for faster lookups
CREATE INDEX idx_asset_channel_tags_asset ON public.asset_channel_tags(asset_id);
CREATE INDEX idx_asset_channel_tags_channel ON public.asset_channel_tags(channel_id);
CREATE INDEX idx_campaign_assets_type ON public.campaign_assets(asset_type_id);
