import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "create-user" up and running!`)

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

  let newUserId: string | undefined = undefined; // Renamed from userId to avoid confusion
  let adminUserId: string | null = null; // To store the admin ID for logging

  try {
    // 1. Validate request data
    const body = await req.json();
    console.log('[create-user] Raw request body received:', body);
    const { email, password, fullName, phoneNumber } = body;

    console.log('[create-user] Destructured values:', { email, passwordExists: !!password, fullName, phoneNumber });

    if (!email || !password || !fullName) {
      throw new Error('Missing email, password, or full name in request body.')
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.')
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
    adminUserId = await getInvokingUserId(req, supabaseUserClient); // Assign to outer scope variable
    if (!adminUserId) {
        throw new Error('Could not verify invoking user.');
    }
    const isUserAdmin = await isAdminCheck(supabaseAdmin, adminUserId);
    if (!isUserAdmin) {
        throw new Error('Permission denied: User is not an administrator.');
    }
    console.log(`[create-user] Admin user ${adminUserId} verified.`);

    // 4. Create the user in Supabase Auth
    console.log(`[create-user] Attempting to create Auth user for email: ${email}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Keep email confirmation required
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      console.error('[create-user] Supabase Auth Error:', authError)
      if (authError.message.includes('duplicate key value violates unique constraint') || authError.message.includes('already been registered')) {
         throw new Error(`User with email ${email} already exists.`);
      }
      throw new Error(`Failed to create user in Auth: ${authError.message}`)
    }

    if (!authData.user) {
        throw new Error('User created in Auth, but no user data returned.');
    }
    newUserId = authData.user.id; // Assign to outer scope variable
    console.log(`[create-user] Auth user created successfully. User ID: ${newUserId}`);

    // 5. Upsert into public.profiles table
    const profileData = {
        id: newUserId,
        email: email,
        full_name: fullName,
        phone_number: phoneNumber || null,
        role: 'aluno',
        account_status: 'active'
    };
    console.log(`[create-user] Preparing to UPSERT profile with data:`, profileData);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      console.error(`[create-user] Supabase Profile Upsert Error for User ID ${newUserId}:`, profileError);
      // Attempt cleanup (moved inside the catch block later)
      throw new Error(`User created in Auth, but failed to upsert profile: ${profileError.message}`)
    }

    console.log(`[create-user] Profile upserted successfully for user ID: ${newUserId}`);

    // 6. Log the activity
    if (adminUserId && newUserId) { // Ensure we have both IDs
        await logActivity(
            supabaseAdmin,
            adminUserId,
            'user_created',
            newUserId,
            'user',
            { created_email: email, created_name: fullName } // Log email and name
        );
    } else {
        console.warn("[create-user] Could not log activity due to missing admin or new user ID.");
    }

    // 7. Return success response
    return new Response(JSON.stringify({ message: `Student user ${email} created or updated successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[create-user] Error in function execution:', error)
    // Cleanup attempt if Auth user was created but something failed later
    if (newUserId) {
        console.warn(`[create-user] Function failed after Auth user ${newUserId} was potentially created. Attempting cleanup.`);
         const supabaseAdminCleanup = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
         );
         try {
            const { error: deleteError } = await supabaseAdminCleanup.auth.admin.deleteUser(newUserId);
            if (deleteError && !deleteError.message.includes('User not found')) {
                 console.error(`[create-user] Cleanup failed to delete auth user ${newUserId}:`, deleteError);
            } else if (!deleteError) {
                 console.log(`[create-user] Cleanup successfully deleted auth user ${newUserId}.`);
                 // Log cleanup action if admin ID is available
                 if (adminUserId) {
                     await logActivity(supabaseAdminCleanup, adminUserId, 'user_creation_cleanup', newUserId, 'user', { reason: error.message });
                 }
            } else {
                 console.log(`[create-user] Cleanup: Auth user ${newUserId} likely already deleted or never fully created.`);
            }
         } catch (cleanupCatch) {
            console.error(`[create-user] Exception during cleanup deletion for ${newUserId}:`, cleanupCatch);
         }
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('Permission denied') ? 403 : 400,
    })
  }
})
