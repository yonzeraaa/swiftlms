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

async function getJobContext(supabase: any, jobId: string, importId: string, courseId: string) {
  const { data } = await supabase
    .from('drive_import_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  if (!data) return undefined

  return {
    jobId,
    importId,
    courseId,
    supabase,
    metadata: data.metadata || {},
  }
}

async function handleImportEvent({ event, step }: { event: { data: ImportEventPayload }; step: any }) {
  const { driveUrl, courseId, importId, userId, folderId, jobId } = event.data

  const {
    runDiscoveryPhase,
    runProcessingPhase,
    runDatabaseImportPhase,
    getDriveClient,
  } = await import('@/app/api/import-from-drive/route')
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

  // Obter job context
  const job = jobId
    ? await getJobContext(supabase, jobId, importId, courseId)
    : undefined

  // Carregar estado de resume se existir
  let resumeState: any = null
  if (job && jobId) {
    const { data: jobData } = await supabase
      .from('drive_import_jobs')
      .select('metadata')
      .eq('id', jobId)
      .maybeSingle()

    resumeState = (jobData as any)?.metadata?.resume_state || null
  }

  const isResume = resumeState !== null
  const currentPhase = resumeState?.phase || 'discovery'

  console.log(`[INNGEST] Iniciando fase: ${currentPhase}, isResume: ${isResume}`)

  // STEP 1: DISCOVERY PHASE (apenas se não for resume ou se fase for 'discovery')
  let discoveryResult: any = null
  if (!isResume || currentPhase === 'discovery') {
    discoveryResult = await step.run('phase-1-discovery', async () => {
      console.log('[INNGEST STEP] Executando Discovery Phase')
      const drive = await getDriveClient(userId)
      return await runDiscoveryPhase(
        drive,
        folderId,
        courseId,
        importId,
        userId,
        job,
        supabase
      )
    })

    if (discoveryResult.status === 'cancelled') {
      console.log(`[INNGEST] Discovery cancelada`)
      return {
        importId,
        status: 'cancelled',
        message: 'Importação cancelada durante Discovery'
      }
    }

    // Salvar resultado do Discovery no resume_state
    if (job && jobId) {
      await supabase
        .from('drive_import_jobs')
        .update({
          metadata: {
            ...((job as any).metadata || {}),
            resume_state: {
              phase: 'processing',
              discoveryResult,
              moduleIndex: 0,
              subjectIndex: 0,
              itemIndex: 0,
            },
          },
        })
        .eq('id', jobId)
    }
  }

  // STEP 2: PROCESSING PHASE
  // Dividir em batches de módulos para evitar timeout
  const MODULES_PER_STEP = 2 // Processar 2 módulos por step
  const startModuleIndex = resumeState?.moduleIndex || 0

  let processingResult: any = await step.run(`phase-2-processing-from-module-${startModuleIndex}`, async () => {
    console.log(`[INNGEST STEP] Executando Processing Phase (módulos ${startModuleIndex}+)`)
    const drive = await getDriveClient(userId)

    return await runProcessingPhase(
      drive,
      driveUrl,
      folderId,
      courseId,
      importId,
      userId,
      job,
      supabase,
      {
        resumeState,
        discoveryTotals: discoveryResult || resumeState?.discoveryResult,
        maxModules: MODULES_PER_STEP,
      }
    )
  })

  if (processingResult.status === 'cancelled') {
    console.log(`[INNGEST] Processing cancelada`)
    return {
      importId,
      status: 'cancelled',
      message: 'Importação cancelada durante Processing'
    }
  }

  // Se ainda há módulos para processar, agendar continuação
  if (processingResult.status === 'partial') {
    console.log(`[INNGEST] Processing parcial, agendando continuação`)

    // VERIFICAÇÃO DE CANCELAMENTO antes de agendar
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
          message: 'Importação cancelada antes de agendar próximo chunk'
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
      message: `Processing parcial: ${processingResult.nextModuleIndex} de ${processingResult.totalModules} módulos processados`
    }
  }

  // STEP 3: DATABASE IMPORT PHASE
  const databaseResult = await step.run('phase-3-database-import', async () => {
    console.log('[INNGEST STEP] Executando Database Import Phase')

    return await runDatabaseImportPhase(
      processingResult.structure,
      courseId,
      importId,
      userId,
      job,
      supabase
    )
  })

  if (databaseResult.status === 'cancelled') {
    console.log(`[INNGEST] Database import cancelada`)
    return {
      importId,
      status: 'cancelled',
      message: 'Importação cancelada durante Database Import'
    }
  }

  console.log(`[INNGEST] Importação concluída com sucesso`)
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
