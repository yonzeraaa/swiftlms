import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const importId = searchParams.get('importId')
  
  console.log(`[PROGRESS-STATUS] GET request for importId: ${importId}`)
  
  if (!importId) {
    console.log('[PROGRESS-STATUS] Missing importId parameter')
    return NextResponse.json({ 
      error: 'Import ID required',
      currentStep: '',
      totalModules: 0,
      processedModules: 0,
      totalSubjects: 0,
      processedSubjects: 0,
      totalLessons: 0,
      processedLessons: 0,
      currentItem: '',
      errors: ['Import ID não fornecido'],
      completed: false,
      percentage: 0,
      phase: 'error'
    }, { 
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
  
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[PROGRESS-STATUS] User not authenticated:', authError?.message)
      return NextResponse.json({ 
        error: 'Não autorizado',
        currentStep: '',
        totalModules: 0,
        processedModules: 0,
        totalSubjects: 0,
        processedSubjects: 0,
        totalLessons: 0,
        processedLessons: 0,
        currentItem: '',
        errors: ['Usuário não autenticado'],
        completed: false,
        percentage: 0,
        phase: 'error'
      }, { 
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    
    console.log(`[PROGRESS-STATUS] Searching progress for user ${user.id} and importId ${importId}`)
    
    // Buscar progresso do Supabase - usando any para contornar erro de tipo
    const { data: progress, error } = await (supabase as any)
      .from('import_progress')
      .select('*')
      .eq('id', importId)
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      console.log(`[PROGRESS-STATUS] Database error:`, error)
      return NextResponse.json({
        error: 'Erro ao buscar progresso no banco de dados',
        currentStep: '',
        totalModules: 0,
        processedModules: 0,
        totalSubjects: 0,
        processedSubjects: 0,
        totalLessons: 0,
        processedLessons: 0,
        currentItem: '',
        errors: [error.message || 'Erro desconhecido no banco'],
        completed: false,
        percentage: 0,
        phase: 'error'
      }, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    
    if (!progress) {
      console.log(`[PROGRESS-STATUS] Progress not found for importId: ${importId}`)
      return NextResponse.json({ 
        error: 'Import not found',
        currentStep: '',
        totalModules: 0,
        processedModules: 0,
        totalSubjects: 0,
        processedSubjects: 0,
        totalLessons: 0,
        processedLessons: 0,
        currentItem: '',
        errors: ['Importação não encontrada'],
        completed: false,
        percentage: 0,
        phase: 'error'
      }, { 
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      })
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
      phase: progress.phase,
      completed: progress.completed
    })
    
    // Calcular porcentagem se não estiver no banco
    const calculatePercentage = () => {
      const total = (progress.total_modules || 0) + (progress.total_subjects || 0) + (progress.total_lessons || 0)
      const processed = (progress.processed_modules || 0) + (progress.processed_subjects || 0) + (progress.processed_lessons || 0)
      
      if (total === 0) return 0
      return Math.round((processed / total) * 100)
    }
    
    // Converter campos do banco para o formato esperado pelo frontend
    // Garantir que todos os campos existem e são válidos
    const formattedProgress = {
      currentStep: (progress.current_step || '').toString(),
      totalModules: parseInt(progress.total_modules) || 0,
      processedModules: parseInt(progress.processed_modules) || 0,
      totalSubjects: parseInt(progress.total_subjects) || 0,
      processedSubjects: parseInt(progress.processed_subjects) || 0,
      totalLessons: parseInt(progress.total_lessons) || 0,
      processedLessons: parseInt(progress.processed_lessons) || 0,
      currentItem: (progress.current_item || '').toString(),
      errors: Array.isArray(progress.errors) ? progress.errors : (progress.errors ? [progress.errors] : []),
      completed: !!progress.completed,
      percentage: progress.percentage !== null && progress.percentage !== undefined 
        ? Math.min(100, Math.max(0, parseInt(progress.percentage))) 
        : calculatePercentage(),
      phase: (progress.phase || 'unknown').toString()
    }
    
    // Validar se a porcentagem está em um range válido
    if (formattedProgress.percentage < 0 || formattedProgress.percentage > 100 || isNaN(formattedProgress.percentage)) {
      formattedProgress.percentage = calculatePercentage()
    }
    
    console.log(`[PROGRESS-STATUS] Formatted progress for frontend:`, formattedProgress)
    
    // Garantir resposta JSON válida com headers apropriados
    return NextResponse.json(formattedProgress, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    
  } catch (error) {
    console.error('[PROGRESS-STATUS] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    // Sempre retornar JSON válido, mesmo em caso de erro
    return NextResponse.json({
      error: 'Erro interno do servidor',
      currentStep: 'Erro interno',
      totalModules: 0,
      processedModules: 0,
      totalSubjects: 0,
      processedSubjects: 0,
      totalLessons: 0,
      processedLessons: 0,
      currentItem: '',
      errors: [errorMessage],
      completed: false,
      percentage: 0,
      phase: 'error'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

// POST não é mais necessário pois salvamos direto no Supabase
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Progress is now stored in Supabase.' },
    { status: 405 }
  )
}