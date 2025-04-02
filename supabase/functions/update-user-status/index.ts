import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "update-user-status" up and running!`)

// Define allowed statuses
const ALLOWED_STATUSES = ['active', 'frozen'];

// Helper function to get invoking user ID
async function getInvokingUserId(req: Request, supabaseUserClient: SupabaseClient): Promise<string | null> {
    const { data: { user } , error } = await supabaseUserClient.auth.getUser();
    if (error) {
        console.error("Error getting user from JWT:", error);
        return null;
    }
    return user?.id ?? null;
}

// Helper function to check if user is admin
async function isAdminCheck(supabaseAdminClient: SupabaseClient, userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdminClient.rpc('is_admin', { user_id: userId });
    if (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
    return data === true;
}

// Helper function to log activity
async function logActivity(
    supabaseAdminClient: SupabaseClient,
    adminUserId: string,
    actionType: string,
    targetId: string,
    targetType: string,
    details: object | null = null
) {
    const { error: logError } = await supabaseAdminClient.from('activity_log').insert({
        user_id: adminUserId,
        action_type: actionType,
        target_id: targetId,
        target_type: targetType,
        details: details,
    });
    if (logError) {
        console.error(`Failed to log activity "${actionType}" for target ${targetId}:`, logError);
        // Decide if failure to log should be critical or just logged
    } else {
        console.log(`Activity logged: ${actionType} for target ${targetId} by user ${adminUserId}`);
    }
}


serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate request data
    const { userId, newStatus } = await req.json()
    if (!userId || !newStatus) {
      throw new Error('Missing userId or newStatus in request body.')
    }
    if (!ALLOWED_STATUSES.includes(newStatus)) {
        throw new Error(`Invalid status provided. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}.`);
    }

    // 2. Create Supabase clients (Admin and User context)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''; // Needed for user client
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Create client with user's auth context
    const supabaseUserClient = createClient(
        supabaseUrl,
        supabaseAnonKey, // Use anon key
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } } // Pass Auth header
    );

    // 3. Verify invoking user is an admin
    const adminUserId = await getInvokingUserId(req, supabaseUserClient);
    if (!adminUserId) {
        throw new Error('Could not verify invoking user.');
    }

    const isUserAdmin = await isAdminCheck(supabaseAdmin, adminUserId); // Use admin client for RPC check
    if (!isUserAdmin) {
        throw new Error('Permission denied: User is not an administrator.');
    }

    // 4. Update the user's status in the profiles table (using Admin client)
    console.log(`Admin ${adminUserId} attempting to update status for user ${userId} to ${newStatus}`);
    const { data, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', userId)
      .select('id, email') // Select something to confirm update and for logging details

    if (updateError) {
      console.error('Supabase Profile Update Error:', updateError)
      throw new Error(`Failed to update profile status: ${updateError.message}`)
    }

    if (!data || data.length === 0) {
        throw new Error(`Profile not found for user ID: ${userId}`);
    }

    console.log(`Profile status updated for user ID: ${userId} to ${newStatus}`);

    // 5. Log the activity (using Admin client)
    await logActivity(
        supabaseAdmin,
        adminUserId,
        'user_status_updated',
        userId,
        'user',
        { new_status: newStatus, target_email: data[0]?.email } // Include new status and target email
    );

    // 6. Return success response
    return new Response(JSON.stringify({ message: `User ${userId} status updated to ${newStatus}.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in update-user-status function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // Return 403 for permission errors, 400 for others
      status: error.message.includes('Permission denied') ? 403 : 400,
    })
  }
})
