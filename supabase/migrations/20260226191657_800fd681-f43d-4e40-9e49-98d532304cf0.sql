
-- 1. Drop the make_me_admin function (security escalation risk)
DROP FUNCTION IF EXISTS public.make_me_admin();

-- 2. Recreate gym_icon_urls view WITHOUT security definer
DROP VIEW IF EXISTS public.gym_icon_urls;

CREATE VIEW public.gym_icon_urls
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT 'https://fwkiadhkxqnlnvmzpgnw.supabase.co/storage/v1/object/public/email-icons'::text AS base
)
SELECT g.id AS gym_id,
  g.code AS gym_code,
  (((base.base || '/'::text) || g.code) || '/star.png'::text) AS star_url,
  (((base.base || '/'::text) || g.code) || '/calendar.png'::text) AS calendar_url,
  (((base.base || '/'::text) || g.code) || '/chat.png'::text) AS chat_url
FROM gyms g
CROSS JOIN base;

-- 3. Grant access to the view
GRANT SELECT ON public.gym_icon_urls TO anon, authenticated;
