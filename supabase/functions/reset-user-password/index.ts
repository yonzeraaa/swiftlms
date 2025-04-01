import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "reset-user-password" up and running!`)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate request data
    const { userId, newPassword } = await req.json()
    if (!userId || !newPassword) {
      throw new Error('Missing userId or newPassword in request body.')
    }
    // Basic password length check
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.')
    }

    // 2. Create Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Update the user's password in Supabase Auth
    console.log(`Attempting to reset password for user ID: ${userId}`);
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    )

    if (updateError) {
      console.error('Supabase Auth Update Error:', updateError)
      if (updateError.message.includes('User not found')) {
          throw new Error(`User with ID ${userId} not found.`);
      }
      throw new Error(`Failed to update password: ${updateError.message}`)
    }

    console.log(`Successfully updated password for user ID: ${userId}`, updateData);

    // 4. Return success response
    return new Response(JSON.stringify({ message: `Password for user ${userId} updated successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in reset-user-password function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Or 404 if user not found
    })
  }
})
