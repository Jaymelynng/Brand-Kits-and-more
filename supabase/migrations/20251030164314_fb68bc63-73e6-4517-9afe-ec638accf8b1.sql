-- Add admin role to existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('4ded932a-6f3d-4dc2-ac5b-eb806d88f8d4', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;