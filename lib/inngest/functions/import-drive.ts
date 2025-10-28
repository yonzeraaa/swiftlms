import { inngest } from '../client'
import { createAdminClient } from '@/lib/supabase/admin'

export const importFromDrive = inngest.createFunction(
  {
    id: 'import-from-google-drive',
    name: 'Import Course Content from Google Drive',
    // Retry automático em caso de falha
    retries: 3,
  },
  { event: 'drive/import.requested' },
  async ({ event, step }) => {
    const { driveUrl, courseId, importId, userId, folderId, jobId, includeMedia = true } = event.data

    // Importar a função de processamento
    // NOTA: A função processImportInBackground precisa ser exportada do route handler
    const { processImportInBackground } = await import('@/app/api/import-from-drive/route')

    const supabase = createAdminClient()

    // Executar o processamento com step para logging e retry granular
    await step.run('process-google-drive-import', async () => {
      await processImportInBackground(
        driveUrl,
        courseId,
        importId,
        userId,
        folderId,
        jobId,
        includeMedia,
        supabase
      )
    })

    return {
      importId,
      status: 'completed',
      message: `Importação ${importId} concluída com sucesso`
    }
  }
)
