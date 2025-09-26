-- Allow public inserts to gym_logos table
-- This matches the storage policy to allow unauthenticated logo uploads
CREATE POLICY "Allow public inserts to gym_logos" 
ON public.gym_logos 
FOR INSERT 
WITH CHECK (true);

-- Also allow public updates and deletes for logo management
CREATE POLICY "Allow public updates to gym_logos" 
ON public.gym_logos 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public deletes to gym_logos" 
ON public.gym_logos 
FOR DELETE 
USING (true);