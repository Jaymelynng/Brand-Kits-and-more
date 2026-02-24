import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
// Use synchronous bcrypt - async version uses Workers which aren't available in edge runtime
import { compareSync } from "https://deno.land/x/bcrypt@v0.4.1/src/main.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PinRequest {
  pin: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse request body
    const { pin }: PinRequest = await req.json();

    if (!pin || pin.length !== 4) {
      console.log('Invalid PIN length');
      return new Response(
        JSON.stringify({ error: 'Invalid PIN format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying PIN...');

    // Get all admin_pins records
    const { data: adminPins, error: fetchError } = await supabase
      .from('admin_pins')
      .select('user_id, pin_hash, email, role');

    if (fetchError) {
      console.error('Error fetching admin pins:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!adminPins || adminPins.length === 0) {
      console.log('No admin PINs found');
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check PIN against all stored hashes
    let matchedUser = null;
    for (const adminPin of adminPins) {
      const isMatch = compareSync(pin, adminPin.pin_hash);
      if (isMatch) {
        matchedUser = adminPin;
        break;
      }
    }

    if (!matchedUser) {
      console.log('Invalid PIN - no match found');
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PIN matched for user:', matchedUser.email);

    // Get user from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(matchedUser.user_id);

    if (userError || !userData.user) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: matchedUser.email,
    });

    if (sessionError || !sessionData) {
      console.error('Error generating session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session created successfully');

    return new Response(
      JSON.stringify({
        user: userData.user,
        session: sessionData.properties,
        role: matchedUser.role,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
