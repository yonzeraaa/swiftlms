import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Obter parâmetro opcional de course_id da query string
    const { searchParams } = new URL(request.url)
    const filterCourseId = searchParams.get('course_id')

    // Buscar cursos em que o aluno está matriculado
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        course_id,
        course:courses(*)
      `)
      .eq('user_id', user.id)

    if (enrollmentsError) {
      logger.error('Erro ao buscar matrículas', enrollmentsError, { context: 'API_STUDENT_TESTS' })
      return NextResponse.json(
        { error: 'Erro ao buscar matrículas' },
        { status: 500 }
      )
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          courseTests: [],
          enrollments: []
        }
      })
    }

    const courseIds = enrollments.map((e: any) => e.course_id)

    // Verificar se o aluno está matriculado no curso solicitado
    if (filterCourseId && !courseIds.includes(filterCourseId)) {
      return NextResponse.json({
        success: true,
        data: {
          courseTests: [],
          enrollments: []
        }
      })
    }

    // Construir query de testes
    let testsQuery = supabase
      .from('tests')
      .select(`
        *,
        course:courses(*),
        subject:subjects(*)
      `)
      .eq('is_active', true)

    // Aplicar filtro por course_id se fornecido, caso contrário buscar de todos os cursos matriculados
    if (filterCourseId) {
      testsQuery = testsQuery.eq('course_id', filterCourseId)
    } else {
      testsQuery = testsQuery.in('course_id', courseIds)
    }

    const { data: testsData, error: testsError } = await testsQuery
      .order('created_at', { ascending: false })

    if (testsError) {
      logger.error('Erro ao buscar testes', testsError, { context: 'API_STUDENT_TESTS' })
      return NextResponse.json(
        { error: 'Erro ao buscar testes' },
        { status: 500 }
      )
    }

    // Buscar notas do aluno nesses testes
    let grades = null
    if (testsData && testsData.length > 0) {
      const testIds = testsData.map((t: any) => t.id)
      const { data: gradesData, error: gradesError } = await supabase
        .from('test_grades')
        .select('*')
        .eq('user_id', user.id)
        .in('test_id', testIds)

      if (gradesError) {
        logger.error('Erro ao buscar notas', gradesError, { context: 'API_STUDENT_TESTS' })
      } else {
        grades = gradesData
      }
    }

    // Agrupar testes por curso
    const courseTestsMap = new Map()

    enrollments.forEach((enrollment: any) => {
      if (enrollment.course) {
        courseTestsMap.set(enrollment.course_id, {
          course: enrollment.course,
          tests: []
        })
      }
    })

    testsData?.forEach((test: any) => {
      const courseGroup = courseTestsMap.get(test.course_id)
      if (courseGroup) {
        courseGroup.tests.push({
          ...test,
          grade: grades?.find((g: any) => g.test_id === test.id) || null
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        courseTests: Array.from(courseTestsMap.values()),
        enrollments
      }
    })
  } catch (error) {
    logger.error('Erro inesperado ao buscar testes do aluno', error, { context: 'API_STUDENT_TESTS' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
