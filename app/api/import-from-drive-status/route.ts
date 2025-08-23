import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const importId = searchParams.get('importId')
  
  console.log(`[PROGRESS-STATUS] GET request for importId: ${importId}`)
  
  if (!importId) {
    return NextResponse.json({ error: 'Import ID required' }, { status: 400 })
  }
  
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[PROGRESS-STATUS] User not authenticated')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    // Buscar progresso do Supabase - usando any para contornar erro de tipo
    const { data: progress, error } = await (supabase as any)
      .from('import_progress')
      .select('*')
      .eq('id', importId)
      .eq('user_id', user.id)
      .single()
    
    if (error || !progress) {
      console.log(`[PROGRESS-STATUS] Progress not found for importId: ${importId}`)
      return NextResponse.json({ error: 'Import not found' }, { status: 404 })
    }
    
    // Log detalhado do progresso recebido do banco
    console.log(`[PROGRESS-STATUS] Raw progress from DB:`, {
      id: progress.id,
      processed_lessons: progress.processed_lessons,
      total_lessons: progress.total_lessons,
      processed_modules: progress.processed_modules,
      total_modules: progress.total_modules,
      processed_subjects: progress.processed_subjects,
      total_subjects: progress.total_subjects,
      percentage: progress.percentage,
      phase: progress.phase
    })
    
    // Calcular porcentagem se n\u00e3o estiver no banco
    const calculatePercentage = () => {
      const total = (progress.total_modules || 0) + (progress.total_subjects || 0) + (progress.total_lessons || 0)
      const processed = (progress.processed_modules || 0) + (progress.processed_subjects || 0) + (progress.processed_lessons || 0)
      
      if (total === 0) return 0
      return Math.round((processed / total) * 100)
    }
    
    // Converter campos do banco para o formato esperado pelo frontend
    const formattedProgress = {
      currentStep: progress.current_step || '',
      totalModules: progress.total_modules || 0,
      processedModules: progress.processed_modules || 0,
      totalSubjects: progress.total_subjects || 0,
      processedSubjects: progress.processed_subjects || 0,
      totalLessons: progress.total_lessons || 0,
      processedLessons: progress.processed_lessons || 0,
      currentItem: progress.current_item || '',
      errors: progress.errors || [],
      completed: progress.completed || false,
      percentage: progress.percentage !== null && progress.percentage !== undefined ? progress.percentage : calculatePercentage(),
      phase: progress.phase || ''
    }
    
    console.log(`[PROGRESS-STATUS] Formatted progress for frontend:`, formattedProgress)
    return NextResponse.json(formattedProgress)
    
  } catch (error) {
    console.error('[PROGRESS-STATUS] Error fetching progress:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar progresso' },
      { status: 500 }
    )
  }
}

// POST não é mais necessário pois salvamos direto no Supabase
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Progress is now stored in Supabase.' },
    { status: 405 }
  )
}