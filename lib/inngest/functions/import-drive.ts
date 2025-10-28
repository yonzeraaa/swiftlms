import { inngest } from '../client'
import { createAdminClient } from '@/lib/supabase/admin'

type ImportEventPayload = {
  driveUrl: string
  courseId: string
  importId: string
  userId: string
  folderId: string
  jobId?: string
}

async function handleImportEvent({ event, step }: { event: { data: ImportEventPayload }; step: any }) {
  const { driveUrl, courseId, importId, userId, folderId, jobId } = event.data

  const { processImportInBackground } = await import('@/app/api/import-from-drive/route')
  const supabase = createAdminClient()

  const result = await step.run('process-google-drive-import', async () => {
    return await processImportInBackground(
      driveUrl,
      courseId,
      importId,
      userId,
      folderId,
      jobId,
      supabase
    )
  })

  if (result.status === 'partial') {
    await step.sendEvent('drive/import.continue', {
      driveUrl,
      courseId,
      importId,
      userId,
      folderId,
      jobId,
    })

    return {
      importId,
      status: 'partial',
      message: 'Chunk de importação concluído; próxima execução agendada.'
    }
  }

  return {
    importId,
    status: 'completed',
    message: `Importação ${importId} concluída com sucesso`
  }
}

export const importFromDrive = inngest.createFunction(
  {
    id: 'import-from-google-drive',
    name: 'Import Course Content from Google Drive',
    retries: 3,
  },
  { event: 'drive/import.requested' },
  handleImportEvent
)

export const continueImportFromDrive = inngest.createFunction(
  {
    id: 'continue-import-from-google-drive',
    name: 'Continue Google Drive Import',
    retries: 3,
  },
  { event: 'drive/import.continue' },
  handleImportEvent
)
