import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming shared CORS headers

console.log("get-all-profiles function invoked");

// Helper function to get user role
async function getUserRole(userClient: SupabaseClient): Promise<string | null> {
  try {
    // Use the existing get_my_role function if it's reliable with SECURITY DEFINER
    // Ensure get_my_role is defined in your Supabase SQL Editor
    const { data, error } = await userClient.rpc('get_my_role');

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    console.log('User role fetched:', data);
    return data;
  } catch (e) {
    console.error('Exception fetching user role:', e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Authorization header missing");
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Create a client with the user's token to check their role
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log("Checking user role...");
    const userRole = await getUserRole(userClient);

    if (userRole !== 'admin') {
      console.warn(`Unauthorized attempt by user with role: ${userRole}`);
      return new Response(JSON.stringify({ error: 'Permission denied: Admin role required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    console.log("User is admin. Proceeding to fetch all profiles...");

    // Create a privileged client using the Service Role Key to bypass RLS
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('ADMIN_SERVICE_ROLE_KEY') ?? '' // Use Service Role Key!
      // No auth header needed for service role
    );

    // Fetch all profiles using the admin client
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email, role, created_at, account_status, full_name, avatar_url, phone_number'); // Select desired columns

    if (profilesError) {
      console.error('Error fetching profiles with admin client:', profilesError);
      throw profilesError; // Let the generic error handler catch it
    }

    console.log(`Successfully fetched ${profiles?.length ?? 0} profiles.`);

    return new Response(JSON.stringify(profiles), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Generic error caught:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/*
To deploy:
1. Ensure ADMIN_SERVICE_ROLE_KEY is set as an environment variable for the function:
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
2. Deploy the function:
   npx supabase functions deploy get-all-profiles --no-verify-jwt
   (We use --no-verify-jwt because we manually verify the role using the user's token)
*/
