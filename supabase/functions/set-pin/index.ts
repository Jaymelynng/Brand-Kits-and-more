import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { hashSync } from "https://deno.land/x/bcrypt@v0.4.1/src/main.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = userData.user.id;
    const { data: adminRole } = await userClient.from('user_roles').select('role').eq('user_id', callerId).eq('role', 'admin').maybeSingle();
    if (!adminRole) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { pin, user_id } = await req.json();

    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: 'PIN must be 4 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure caller can only update their own PIN
    if (callerId !== user_id) {
      console.error('Caller', callerId, 'attempted to update PIN for', user_id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: can only update your own PIN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const pin_hash = hashSync(pin);
    console.log('Generated hash for PIN, user:', callerId);

    const { data: updatedPin, error } = await serviceClient
      .from('admin_pins')
      .update({ pin_hash })
      .eq('user_id', user_id).select('user_id').maybeSingle();

    if (error || !updatedPin) {
      console.error('Update error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
