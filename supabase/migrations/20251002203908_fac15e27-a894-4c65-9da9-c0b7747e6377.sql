-- Step 1: Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id);

-- Step 2: Create trigger to auto-populate profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Step 4: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 5: Update RLS policies for gyms table
DROP POLICY IF EXISTS "Authenticated users can insert gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated users can update gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated users can delete gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated can insert gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated can update gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated can delete gyms" ON public.gyms;

CREATE POLICY "Admins can insert gyms"
ON public.gyms
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gyms"
ON public.gyms
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gyms"
ON public.gyms
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 6: Update RLS policies for gym_colors table
DROP POLICY IF EXISTS "Authenticated users can insert gym_colors" ON public.gym_colors;
DROP POLICY IF EXISTS "Authenticated users can update gym_colors" ON public.gym_colors;
DROP POLICY IF EXISTS "Authenticated users can delete gym_colors" ON public.gym_colors;
DROP POLICY IF EXISTS "Authenticated can insert gym_colors" ON public.gym_colors;
DROP POLICY IF EXISTS "Authenticated can update gym_colors" ON public.gym_colors;
DROP POLICY IF EXISTS "Authenticated can delete gym_colors" ON public.gym_colors;

CREATE POLICY "Admins can insert gym_colors"
ON public.gym_colors
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gym_colors"
ON public.gym_colors
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gym_colors"
ON public.gym_colors
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 7: Update RLS policies for gym_logos table
DROP POLICY IF EXISTS "Authenticated users can insert gym_logos" ON public.gym_logos;
DROP POLICY IF EXISTS "Authenticated users can update gym_logos" ON public.gym_logos;
DROP POLICY IF EXISTS "Authenticated users can delete gym_logos" ON public.gym_logos;
DROP POLICY IF EXISTS "Authenticated can insert gym_logos" ON public.gym_logos;
DROP POLICY IF EXISTS "Authenticated can update gym_logos" ON public.gym_logos;
DROP POLICY IF EXISTS "Authenticated can delete gym_logos" ON public.gym_logos;
DROP POLICY IF EXISTS "Allow public inserts to gym_logos" ON public.gym_logos;
DROP POLICY IF EXISTS "Allow public updates to gym_logos" ON public.gym_logos;
DROP POLICY IF EXISTS "Allow public deletes to gym_logos" ON public.gym_logos;

CREATE POLICY "Admins can insert gym_logos"
ON public.gym_logos
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gym_logos"
ON public.gym_logos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gym_logos"
ON public.gym_logos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 8: Update RLS policies for gym_elements table
DROP POLICY IF EXISTS "Authenticated users can insert gym_shapes" ON public.gym_elements;
DROP POLICY IF EXISTS "Authenticated users can update gym_shapes" ON public.gym_elements;
DROP POLICY IF EXISTS "Authenticated users can delete gym_shapes" ON public.gym_elements;
DROP POLICY IF EXISTS "Authenticated can insert gym_shapes" ON public.gym_elements;
DROP POLICY IF EXISTS "Authenticated can update gym_shapes" ON public.gym_elements;
DROP POLICY IF EXISTS "Authenticated can delete gym_shapes" ON public.gym_elements;

CREATE POLICY "Admins can insert gym_elements"
ON public.gym_elements
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gym_elements"
ON public.gym_elements
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gym_elements"
ON public.gym_elements
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 9: Secure storage bucket for gym logos
DROP POLICY IF EXISTS "Authenticated can upload gym logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update gym logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete gym logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to gym-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to gym-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from gym-logos" ON storage.objects;

-- Public can view logos (no change)
CREATE POLICY "Public can view gym logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gym-logos');

-- Only admins can upload logos
CREATE POLICY "Admins can upload gym logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gym-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can update logos
CREATE POLICY "Admins can update gym logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gym-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete logos
CREATE POLICY "Admins can delete gym logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'gym-logos' 
  AND public.has_role(auth.uid(), 'admin')
);