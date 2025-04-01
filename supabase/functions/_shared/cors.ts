// Standard CORS headers for Supabase Edge Functions invoked from a browser

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin (adjust for production)
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Note: For production, you should restrict 'Access-Control-Allow-Origin'
// to your actual frontend domain(s) instead of '*'.
// Example: 'Access-Control-Allow-Origin': 'https://your-swiftlms-domain.com'