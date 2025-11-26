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
    // TEMPORÁRIO: Removendo joins para testar
    let testsQuery = supabase
      .from('tests')
      .select('*')
      .eq('is_active', true)

    // Aplicar filtro por course_id se fornecido, caso contrário buscar de todos os cursos matriculados
    if (filterCourseId) {
      testsQuery = testsQuery.eq('course_id', filterCourseId)
    } else {
      testsQuery = testsQuery.in('course_id', courseIds)
    }

    let { data: testsData, error: testsError } = await testsQuery
      .order('created_at', { ascending: false })

    if (testsError) {
      logger.error('Erro ao buscar testes', testsError, { context: 'API_STUDENT_TESTS' })
      return NextResponse.json(
        { error: 'Erro ao buscar testes' },
        { status: 500 }
      )
    }

    // Buscar dados de courses e subjects separadamente para evitar problemas com RLS em joins
    const testCourseIds = [...new Set(testsData?.map((t: any) => t.course_id).filter(Boolean))]
    const testSubjectIds = [...new Set(testsData?.map((t: any) => t.subject_id).filter(Boolean))]

    const coursesMap = new Map()
    const subjectsMap = new Map()

    if (testCourseIds.length > 0) {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .in('id', testCourseIds)

      coursesData?.forEach((c: any) => coursesMap.set(c.id, c))
    }

    if (testSubjectIds.length > 0) {
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .in('id', testSubjectIds)

      subjectsData?.forEach((s: any) => subjectsMap.set(s.id, s))
    }

    // Enriquecer testes com dados de courses e subjects
    testsData = testsData?.map((test: any) => ({
      ...test,
      course: test.course_id ? coursesMap.get(test.course_id) : null,
      subject: test.subject_id ? subjectsMap.get(test.subject_id) : null
    })) || null

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

    // Se há filtro por curso, criar entrada apenas para aquele curso
    if (filterCourseId) {
      const filteredEnrollment = enrollments.find((e: any) => e.course_id === filterCourseId)
      if (filteredEnrollment?.course) {
        courseTestsMap.set(filterCourseId, {
          course: filteredEnrollment.course,
          tests: []
        })
      }
    } else {
      // Caso contrário, criar entrada para todos os cursos matriculados
      enrollments.forEach((enrollment: any) => {
        if (enrollment.course) {
          courseTestsMap.set(enrollment.course_id, {
            course: enrollment.course,
            tests: []
          })
        }
      })
    }

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
