import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming shared CORS headers

console.log("get-all-profiles function invoked");

// Helper function to get user role (assuming it exists and works)
async function getUserRole(userClient: SupabaseClient): Promise<string | null> {
  try {
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

    // Create a privileged client using the Service Role Key
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // IMPORTANT: Ensure this env var is set in your Supabase project secrets!
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('ADMIN_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch all profiles using the admin client
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email, role, created_at, account_status, full_name, avatar_url, phone_number');

    if (profilesError) {
      console.error('Error fetching profiles with admin client:', profilesError);
      throw profilesError;
    }
    if (!profiles) {
        console.log("No profiles found.");
        return new Response(JSON.stringify([]), {
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
             status: 200,
        });
    }

    // 2. Fetch corresponding auth.users data (last_sign_in_at)
    const userIds = profiles.map(p => p.id);
    let authUsersMap = new Map<string, { last_sign_in_at: string | null }>();

    if (userIds.length > 0) {
        // Call the new RPC function using the admin client
        const { data: authUsersData, error: rpcError } = await adminClient.rpc(
            'get_last_sign_in_for_users',
            { user_ids: userIds } // Pass the array of user IDs as parameter
        );

        if (rpcError) {
            console.error('Error calling get_last_sign_in_for_users RPC:', rpcError);
            // Proceed without last_sign_in_at if RPC fails, but log the error
        } else if (authUsersData) {
            console.log(`[get-all-profiles] Fetched last_sign_in_at for ${authUsersData.length} users via RPC.`); // DEBUG
            // DEBUG: Log the first few auth user records from RPC
            if (authUsersData.length > 0) {
                console.log("[get-all-profiles] First auth user record from RPC:", authUsersData[0]);
            }
            // Create the map from the RPC result
            authUsersMap = new Map(authUsersData.map((u: { id: string, last_sign_in_at: string | null }) => [u.id, { last_sign_in_at: u.last_sign_in_at }]));
            console.log("[get-all-profiles] Created authUsersMap from RPC:", authUsersMap); // DEBUG
        } else {
             console.log("[get-all-profiles] No data returned from get_last_sign_in_for_users RPC."); // DEBUG
        }
    }

    // 3. Combine profile data with auth data
    const combinedData = profiles.map(profile => ({
      ...profile,
      last_sign_in_at: authUsersMap.get(profile.id)?.last_sign_in_at ?? null
    }));
    // DEBUG: Log the first combined user object to check merge
    if (combinedData.length > 0) {
        console.log("[get-all-profiles] First combined data object:", combinedData[0]);
    }

    console.log(`Successfully fetched and combined data for ${combinedData.length} profiles.`);

    // 4. Return the combined data
    return new Response(JSON.stringify(combinedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Generic error caught in get-all-profiles:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
