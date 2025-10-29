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

  // VERIFICAÇÃO DE CANCELAMENTO: Checa antes de processar
  if (jobId) {
    const { data: job } = await supabase
      .from('drive_import_jobs')
      .select('cancellation_requested, status')
      .eq('id', jobId)
      .maybeSingle()

    if ((job as any)?.cancellation_requested || (job as any)?.status === 'cancelled') {
      console.log(`[INNGEST] Job ${jobId} foi cancelado, não processando`)
      return {
        importId,
        status: 'cancelled',
        message: 'Importação cancelada pelo usuário'
      }
    }
  }

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

  // Se a importação foi cancelada durante o processamento, não continuar
  if (result.status === 'cancelled') {
    console.log(`[INNGEST] Importação ${importId} cancelada durante processamento`)
    return {
      importId,
      status: 'cancelled',
      message: 'Importação cancelada pelo usuário durante processamento'
    }
  }

  if (result.status === 'partial') {
    // VERIFICAÇÃO DE CANCELAMENTO: Checa antes de agendar próximo chunk
    if (jobId) {
      const { data: job } = await supabase
        .from('drive_import_jobs')
        .select('cancellation_requested, status')
        .eq('id', jobId)
        .maybeSingle()

      if ((job as any)?.cancellation_requested || (job as any)?.status === 'cancelled') {
        console.log(`[INNGEST] Job ${jobId} foi cancelado, não agendando próximo chunk`)
        return {
          importId,
          status: 'cancelled',
          message: 'Importação cancelada pelo usuário antes de agendar próximo chunk'
        }
      }
    }

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
    retries: 10,
    timeouts: {
      // Sem limite de tempo para iniciar (pode ficar na fila)
      start: undefined,
      // Timeout de 2 horas para completar a execução
      finish: '2h',
    },
  },
  { event: 'drive/import.requested' },
  handleImportEvent
)

export const continueImportFromDrive = inngest.createFunction(
  {
    id: 'continue-import-from-google-drive',
    name: 'Continue Google Drive Import',
    retries: 10,
    timeouts: {
      // Sem limite de tempo para iniciar (pode ficar na fila)
      start: undefined,
      // Timeout de 2 horas para completar a execução
      finish: '2h',
    },
  },
  { event: 'drive/import.continue' },
  handleImportEvent
)
