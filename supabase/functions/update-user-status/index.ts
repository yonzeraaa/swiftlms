import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "update-user-status" up and running!`)

// Define allowed statuses
const ALLOWED_STATUSES = ['active', 'frozen'];

serve(async (req) => {
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

    // 2. Create Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Update the user's status in the profiles table
    // Note: We are NOT disabling the user in auth.users, only changing the status
    // in profiles. Access control should rely on checking this status.
    const { data, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', userId)
      .select() // Optionally select the updated row to confirm

    if (updateError) {
      console.error('Supabase Profile Update Error:', updateError)
      throw new Error(`Failed to update profile status: ${updateError.message}`)
    }

    if (!data || data.length === 0) {
        throw new Error(`Profile not found for user ID: ${userId}`);
    }

    console.log(`Profile status updated for user ID: ${userId} to ${newStatus}`);

    // 4. Return success response
    return new Response(JSON.stringify({ message: `User ${userId} status updated to ${newStatus}.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in update-user-status function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
