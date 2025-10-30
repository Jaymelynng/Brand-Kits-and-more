-- Create admin_pins table for PIN-based authentication
CREATE TABLE IF NOT EXISTS public.admin_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.admin_pins ENABLE ROW LEVEL SECURITY;

-- Admins can view all PINs
CREATE POLICY "Admins can view all admin_pins"
ON public.admin_pins
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage all PINs
CREATE POLICY "Admins can insert admin_pins"
ON public.admin_pins
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin_pins"
ON public.admin_pins
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete admin_pins"
ON public.admin_pins
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own PIN record
CREATE POLICY "Users can view own admin_pins"
ON public.admin_pins
FOR SELECT
USING (auth.uid() = user_id);

-- Insert admin PIN for jaymelynng@gmail.com (PIN: 1234)
-- bcrypt hash of "1234" = $2a$10$N9qo8uLOickgx2ZMRZoMye/4yLqhL5X/Z5x5xTKvHzQQD8TQ7p6Wy
INSERT INTO public.admin_pins (user_id, pin_hash, email, role)
VALUES (
  '4ded932a-6f3d-4dc2-ac5b-eb806d88f8d4',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye/4yLqhL5X/Z5x5xTKvHzQQD8TQ7p6Wy',
  'jaymelynng@gmail.com',
  'admin'
)
ON CONFLICT (user_id) DO UPDATE
SET pin_hash = EXCLUDED.pin_hash,
    email = EXCLUDED.email,
    role = EXCLUDED.role;