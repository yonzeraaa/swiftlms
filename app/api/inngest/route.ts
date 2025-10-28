import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { importFromDrive } from '@/lib/inngest/functions/import-drive'

// Configurar o handler do Inngest para Next.js
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    importFromDrive,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
