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
  const workflowStartTime = Date.now()
  // Timeout interno de 3min10s (190s)
  // Margem de 20s antes do Inngest forçar timeout (finish: '3m30s')
  // Vercel tem limite de 5min, mas queremos workers curtos para evitar problemas
  const MAX_WORKFLOW_DURATION_MS = 190_000 // 3min10s

  console.log(`[INNGEST] Iniciando fase: ${currentPhase}, isResume: ${isResume}`)
  console.log(`[INNGEST] Tempo máximo por worker: ${MAX_WORKFLOW_DURATION_MS / 1000}s`)

  // Helper para verificar se devemos encerrar e continuar em novo worker
  const shouldYieldToNewWorker = () => {
    const elapsed = Date.now() - workflowStartTime
    const shouldYield = elapsed >= MAX_WORKFLOW_DURATION_MS
    if (shouldYield) {
      console.log(`[INNGEST] ⏰ Tempo limite atingido (${(elapsed / 1000).toFixed(1)}s), agendando continuação`)
    }
    return shouldYield
  }

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

    // Após Discovery, verificar se devemos continuar em novo worker
    if (shouldYieldToNewWorker()) {
      const { ids } = await step.sendEvent('schedule-continue-worker', {
        name: 'drive/import.continue',
        data: {
          driveUrl,
          courseId,
          importId,
          userId,
          folderId,
          jobId,
        }
      })
      console.log(`[INNGEST] ✅ Evento 'drive/import.continue' enviado com sucesso após Discovery. Event IDs: ${ids.join(', ')}`)
      return {
        importId,
        status: 'partial',
        message: 'Discovery completa, continuando processamento em novo worker',
        eventIds: ids
      }
    }
  }

  // STEP 2: PROCESSING PHASE
  // Processar 1 módulo por vez para garantir chunks pequenos
  const MODULES_PER_CHUNK = 1
  const startModuleIndex = resumeState?.moduleIndex || 0

  let processingResult: any = await step.run(`phase-2-processing-module-${startModuleIndex}`, async () => {
    const stepStartTime = Date.now()
    console.log(`[INNGEST STEP] ⚙️ Executando Processing Phase (módulo ${startModuleIndex})`)
    const drive = await getDriveClient(userId)

    const result = await runProcessingPhase(
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
        maxModules: MODULES_PER_CHUNK,
        startTime: stepStartTime,
      }
    )

    const elapsed = Date.now() - stepStartTime
    console.log(`[INNGEST STEP] ✓ Processing concluído em ${(elapsed / 1000).toFixed(1)}s`)
    return result
  })

  if (processingResult.status === 'cancelled') {
    console.log(`[INNGEST] Processing cancelada`)
    return {
      importId,
      status: 'cancelled',
      message: 'Importação cancelada durante Processing'
    }
  }

  // Se ainda há módulos para processar OU atingimos tempo limite, agendar continuação
  if (processingResult.status === 'partial' || shouldYieldToNewWorker()) {
    console.log(`[INNGEST] Agendando continuação do processamento`)

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

    const { ids } = await step.sendEvent('schedule-continue-worker', {
      name: 'drive/import.continue',
      data: {
        driveUrl,
        courseId,
        importId,
        userId,
        folderId,
        jobId,
      }
    })

    console.log(`[INNGEST] ✅ Evento 'drive/import.continue' enviado com sucesso. Event IDs: ${ids.join(', ')}`)

    return {
      importId,
      status: 'partial',
      message: `Módulo ${startModuleIndex + 1} processado, continuando em novo worker`,
      eventIds: ids
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
      // Timeout de 3min30s por worker (força encerramento antes do Vercel timeout)
      finish: '3m30s',
    },
    idempotency: 'event.data.jobId + "-initial"', // Previne workers duplicados apenas do inicial
    // REMOVIDO: concurrency - não é necessário para a função inicial
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
      // Timeout de 3min30s por worker (força encerramento antes do Vercel timeout)
      finish: '3m30s',
    },
    // REMOVIDO: concurrency estava bloqueando a execução dos workers
    // O Inngest gerencia a fila naturalmente sem necessidade de config explícita
  },
  // Event trigger explícito para garantir que o Inngest reconheça
  {
    event: 'drive/import.continue',
  },
  async ({ event, step }) => {
    console.log(`[INNGEST] 🔄 Continue worker disparado! Event ID: ${event.id}, Job ID: ${event.data?.jobId}`)
    return await handleImportEvent({ event: event as { data: ImportEventPayload }, step })
  }
)
