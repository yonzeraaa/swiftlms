import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "delete-user" up and running!`)

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

    // 2. Create Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Delete the user from Supabase Auth
    // This will also delete the corresponding row in profiles due to CASCADE constraint
    console.log(`Attempting to delete user ID: ${userId}`);
    const { data: deleteData, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Supabase Auth Delete Error:', deleteError)
      // Handle specific errors like user not found if necessary
      if (deleteError.message.includes('User not found')) {
          throw new Error(`User with ID ${userId} not found.`);
      }
      throw new Error(`Failed to delete user: ${deleteError.message}`)
    }

    console.log(`Successfully deleted user ID: ${userId}`, deleteData);

    // 4. Return success response
    return new Response(JSON.stringify({ message: `User ${userId} deleted successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Or 404 if user not found was the specific error
    })
  }
})
