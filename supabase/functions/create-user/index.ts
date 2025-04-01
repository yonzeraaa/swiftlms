import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "create-user" up and running!`)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let userId: string | undefined = undefined;

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

    // 2. Create Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Create the user in Supabase Auth
    console.log(`[create-user] Attempting to create Auth user for email: ${email}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false,
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
    userId = authData.user.id;
    console.log(`[create-user] Auth user created successfully. User ID: ${userId}`);

    // 4. Upsert into public.profiles table
    // Upsert will insert if the ID doesn't exist, or update if it does.
    const profileData = {
        id: userId, // This is the primary key
        email: email,
        full_name: fullName,
        phone_number: phoneNumber || null,
        role: 'student',
        account_status: 'active'
    };
    console.log(`[create-user] Preparing to UPSERT profile with data:`, profileData);

    // **** CHANGED insert to upsert ****
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' }); // Specify conflict target if needed, default is PK

    if (profileError) {
      // Log the specific profile upsert error *first*
      console.error(`[create-user] Supabase Profile Upsert Error for User ID ${userId}:`, profileError);

      // Attempt cleanup if upsert fails for reasons other than conflict resolution
      console.warn(`[create-user] Attempting to delete Auth user ${userId} due to profile upsert failure.`);
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
           console.error(`[create-user] Failed to delete auth user ${userId} after profile upsert error:`, deleteError);
        } else {
           console.log(`[create-user] Successfully deleted auth user ${userId} after profile upsert failure.`);
        }
      } catch (deleteCatchError) {
        console.error(`[create-user] Exception during auth user deletion for ${userId}:`, deleteCatchError);
      }
      // Throw the original profile error
      throw new Error(`User created in Auth, but failed to upsert profile: ${profileError.message}`)
    }

    console.log(`[create-user] Profile upserted successfully for user ID: ${userId}`);

    // 5. Return success response
    return new Response(JSON.stringify({ message: `Student user ${email} created or updated successfully.` }), { // Adjusted message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[create-user] Error in function execution:', error)
    // Cleanup logic remains important if Auth user was created but upsert failed unexpectedly
    if (userId) {
        console.warn(`[create-user] Function failed after Auth user ${userId} was potentially created. Attempting cleanup.`);
         const supabaseAdminCleanup = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
         );
         try {
            const { error: deleteError } = await supabaseAdminCleanup.auth.admin.deleteUser(userId);
            if (deleteError && !deleteError.message.includes('User not found')) {
                 console.error(`[create-user] Cleanup failed to delete auth user ${userId}:`, deleteError);
            } else if (!deleteError) {
                 console.log(`[create-user] Cleanup successfully deleted auth user ${userId}.`);
            } else {
                 console.log(`[create-user] Cleanup: Auth user ${userId} likely already deleted or never fully created.`);
            }
         } catch (cleanupCatch) {
            console.error(`[create-user] Exception during cleanup deletion for ${userId}:`, cleanupCatch);
         }
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
