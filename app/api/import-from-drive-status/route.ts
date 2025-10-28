import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function buildErrorResponse(message: string, errors: string[], status: number) {
  return NextResponse.json({
    error: message,
    currentStep: status === 401 ? 'Autenticação necessária' : status === 403 ? 'Acesso negado' : '',
    totalModules: 0,
    processedModules: 0,
    totalSubjects: 0,
    processedSubjects: 0,
    totalLessons: 0,
    processedLessons: 0,
    currentItem: '',
    errors,
    completed: false,
    percentage: 0,
    phase: 'error'
  }, {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const importId = searchParams.get('importId')
  const jobId = searchParams.get('jobId')
  const token = searchParams.get('token')

  console.log(`[PROGRESS-STATUS] GET request for importId: ${importId}, jobId: ${jobId}, token provided: ${Boolean(token)}`)

  if (!importId) {
    console.log('[PROGRESS-STATUS] Missing importId parameter')
    return buildErrorResponse('Import ID required', ['Import ID não fornecido'], 400)
  }

  const formatProgress = (progress: any) => {
    const calculatePercentage = () => {
      const total = (progress.total_modules || 0) + (progress.total_subjects || 0) + (progress.total_lessons || 0)
      const processed = (progress.processed_modules || 0) + (progress.processed_subjects || 0) + (progress.processed_lessons || 0)

      if (total === 0) return 0
      return Math.round((processed / total) * 100)
    }

    const formatted = {
      currentStep: (progress.current_step || '').toString(),
      totalModules: Number(progress.total_modules) || 0,
      processedModules: Number(progress.processed_modules) || 0,
      totalSubjects: Number(progress.total_subjects) || 0,
      processedSubjects: Number(progress.processed_subjects) || 0,
      totalLessons: Number(progress.total_lessons) || 0,
      processedLessons: Number(progress.processed_lessons) || 0,
      currentItem: (progress.current_item || '').toString(),
      errors: Array.isArray(progress.errors) ? progress.errors : (progress.errors ? [progress.errors] : []),
      completed: !!progress.completed,
      percentage: progress.percentage !== null && progress.percentage !== undefined
        ? Math.min(100, Math.max(0, Number(progress.percentage)))
        : calculatePercentage(),
      phase: (progress.phase || 'unknown').toString()
    }

    if (Number.isNaN(formatted.percentage) || formatted.percentage < 0 || formatted.percentage > 100) {
      formatted.percentage = calculatePercentage()
    }

    console.log('[PROGRESS-STATUS] Formatted progress for frontend:', formatted)
    return formatted
  }

  try {
    if (token && jobId) {
      console.log('[PROGRESS-STATUS] Using token-based access for progress lookup')
      const admin = createAdminClient()

      const { data: jobRecord, error: jobError } = await admin
        .from('drive_import_jobs')
        .select('user_id, metadata')
        .eq('id', jobId)
        .maybeSingle()

      if (jobError) {
        console.error('[PROGRESS-STATUS] Failed to load job metadata via admin client:', jobError)
        return buildErrorResponse('Erro ao buscar progresso no banco de dados', [jobError.message], 500)
      }

      if (!jobRecord) {
        console.log('[PROGRESS-STATUS] Job not found for id:', jobId)
        return buildErrorResponse('Import not found', ['Job de importação não encontrado'], 404)
      }

      const metadata = (jobRecord.metadata as Record<string, unknown>) || {}
      const metadataImportId = typeof metadata['importId'] === 'string' ? metadata['importId'] as string : null
      const metadataToken = typeof metadata['progressToken'] === 'string' ? metadata['progressToken'] as string : null

      if (metadataImportId !== importId || metadataToken !== token) {
        console.warn('[PROGRESS-STATUS] Token mismatch detected', { metadataImportId, metadataToken, importId, token })
        return buildErrorResponse('Acesso negado', ['Token de progresso inválido'], 403)
      }

      const { data: progress, error } = await admin
        .from('import_progress')
        .select('*')
        .eq('id', importId)
        .maybeSingle()

      if (error) {
        console.error('[PROGRESS-STATUS] Admin query error:', error)
        return buildErrorResponse('Erro ao buscar progresso no banco de dados', [error.message], 500)
      }

      if (!progress) {
        console.log('[PROGRESS-STATUS] Progress not found for importId (admin check):', importId)
        return buildErrorResponse('Import not found', ['Importação não encontrada'], 404)
      }

      if (progress.user_id && jobRecord.user_id && progress.user_id !== jobRecord.user_id) {
        console.warn('[PROGRESS-STATUS] Progress user mismatch detected', {
          progressUser: progress.user_id,
          jobUser: jobRecord.user_id,
        })
      }

      return NextResponse.json(formatProgress(progress), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    console.log('[PROGRESS-STATUS] Falling back to authenticated user lookup')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[PROGRESS-STATUS] User not authenticated:', authError?.message)
      return buildErrorResponse('Não autorizado', ['Usuário não autenticado'], 401)
    }

    console.log(`[PROGRESS-STATUS] Searching progress for user ${user.id} and importId ${importId}`)

    const { data: progress, error } = await (supabase as any)
      .from('import_progress')
      .select('*')
      .eq('id', importId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.log('[PROGRESS-STATUS] Database error:', error)
      return buildErrorResponse('Erro ao buscar progresso no banco de dados', [error.message], 500)
    }

    if (!progress) {
      console.log('[PROGRESS-STATUS] Progress not found for importId (user lookup):', importId)
      return buildErrorResponse('Import not found', ['Importação não encontrada'], 404)
    }

    return NextResponse.json(formatProgress(progress), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('[PROGRESS-STATUS] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return buildErrorResponse('Erro interno do servidor', [errorMessage], 500)
  }
}

// POST não é mais necessário pois salvamos direto no Supabase
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Progress is now stored in Supabase.' },
    { status: 405 }
  )
}
