import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "delete-user" up and running!`)

// --- Re-use or define Helper Functions ---
// (Ideally, these would be in a shared module)

async function getInvokingUserId(req: Request, supabaseUserClient: SupabaseClient): Promise<string | null> {
    const { data: { user } , error } = await supabaseUserClient.auth.getUser();
    if (error) {
        console.error("Error getting user from JWT:", error);
        return null;
    }
    return user?.id ?? null;
}

async function isAdminCheck(supabaseAdminClient: SupabaseClient, userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdminClient.rpc('is_admin', { user_id: userId });
    if (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
    return data === true;
}

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
    } else {
        console.log(`Activity logged: ${actionType} for target ${targetId} by user ${adminUserId}`);
    }
}

// --- Main Function Logic ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate request data
    const { userId } = await req.json()
    if (!userId) {
      throw new Error('Missing userId in request body.')
    }

    // 2. Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const supabaseUserClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 3. Verify invoking user is an admin
    const adminUserId = await getInvokingUserId(req, supabaseUserClient);
    if (!adminUserId) {
        throw new Error('Could not verify invoking user.');
    }
    const isUserAdmin = await isAdminCheck(supabaseAdmin, adminUserId);
    if (!isUserAdmin) {
        throw new Error('Permission denied: User is not an administrator.');
    }

    // 4. Fetch user email *before* deletion for logging
    console.log(`Admin ${adminUserId} attempting to delete user ${userId}`);
    let userEmailForLog: string | null = null;
    const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

    if (profileError && profileError.code !== 'PGRST116') { // Ignore 'No rows found' error for now
        console.warn(`Could not fetch profile email for user ${userId} before deletion:`, profileError.message);
    } else if (profileData) {
        userEmailForLog = profileData.email;
    }
    console.log(`Email for user ${userId} (for logging): ${userEmailForLog}`);


    // 5. Delete the user from Supabase Auth (triggers profile delete via cascade)
    const { data: deleteData, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Supabase Auth Delete Error:', deleteError)
      if (deleteError.message.includes('User not found')) {
          throw new Error(`User with ID ${userId} not found.`);
      }
      throw new Error(`Failed to delete user: ${deleteError.message}`)
    }

    console.log(`Successfully deleted user ID: ${userId}`, deleteData);

    // 6. Log the activity
    await logActivity(
        supabaseAdmin,
        adminUserId,
        'user_deleted',
        userId,
        'user',
        { deleted_email: userEmailForLog } // Log the email we fetched earlier
    );

    // 7. Return success response
    return new Response(JSON.stringify({ message: `User ${userId} deleted successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('Permission denied') ? 403 : (error.message.includes('not found') ? 404 : 400),
    })
  }
})
