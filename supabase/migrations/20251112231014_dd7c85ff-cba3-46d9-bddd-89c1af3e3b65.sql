-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create campaign_tags table for linking assets to campaigns
CREATE TABLE public.campaign_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'element')),
  asset_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (campaign_id, asset_type, asset_id)
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns (public read, admin write)
CREATE POLICY "Allow public read campaigns"
ON public.campaigns
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert campaigns"
ON public.campaigns
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaigns"
ON public.campaigns
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaigns"
ON public.campaigns
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for campaign_tags (public read, admin write)
CREATE POLICY "Allow public read campaign_tags"
ON public.campaign_tags
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert campaign_tags"
ON public.campaign_tags
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaign_tags"
ON public.campaign_tags
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaign_tags"
ON public.campaign_tags
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_campaign_tags_campaign_id ON public.campaign_tags(campaign_id);
CREATE INDEX idx_campaign_tags_asset ON public.campaign_tags(asset_type, asset_id);

-- Create trigger for updated_at
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();