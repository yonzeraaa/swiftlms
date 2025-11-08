import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await context.params

    // Verificar se é admin OU se o usuário está acessando suas próprias notas
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isOwnGrades = user.id === userId

    if (!isAdmin && !isOwnGrades) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar estas notas' },
        { status: 403 }
      )
    }
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Normalizar datas com timezone completo
    const dateRange = startDate && endDate ? {
      start: `${startDate}T00:00:00.000Z`,
      end: `${endDate}T23:59:59.999Z`
    } : null

    // 1. Buscar cursos em que o aluno está matriculado
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', userId)

    if (enrollmentsError) {
      logger.error('Erro ao buscar matrículas do aluno', enrollmentsError, { context: 'API_STUDENT_GRADES' })
      return NextResponse.json(
        { error: 'Erro ao buscar matrículas' },
        { status: 500 }
      )
    }

    const enrolledCourseIds = enrollments?.map(e => e.course_id) || []

    if (enrolledCourseIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          gradesBySubject: [],
          totalTestsCount: 0,
          completedTestsCount: 0,
          testsAverageRaw: null,
          tccGradeRaw: null,
          overrides: null
        }
      })
    }

    // 2. Buscar testes APENAS dos cursos matriculados (sem inner join)
    const { data: allTests, error: testsError } = await supabase
      .from('tests')
      .select(`
        id,
        title,
        subject_id,
        course_id,
        is_active,
        subjects!tests_subject_id_fkey (
          name
        ),
        courses!tests_course_id_fkey (
          title
        )
      `)
      .in('course_id', enrolledCourseIds)
      .eq('is_active', true)

    if (testsError) {
      logger.error('Erro ao buscar testes do aluno', testsError, { context: 'API_STUDENT_GRADES' })
      return NextResponse.json(
        { error: 'Erro ao buscar testes' },
        { status: 500 }
      )
    }

    // 3. Buscar tentativas do aluno com filtro de data
    let attemptsQuery = supabase
      .from('test_attempts')
      .select('test_id, score, submitted_at')
      .eq('user_id', userId)

    if (dateRange?.start) {
      attemptsQuery = attemptsQuery.gte('submitted_at', dateRange.start)
    }
    if (dateRange?.end) {
      attemptsQuery = attemptsQuery.lte('submitted_at', dateRange.end)
    }

    const { data: attempts } = await attemptsQuery

    // 4. Criar mapa de tentativas por teste (melhor score)
    const attemptsByTest = new Map<string, any>()
    attempts?.forEach((attempt: any) => {
      if (!attempt.test_id) return
      const existing = attemptsByTest.get(attempt.test_id)
      if (!existing || (attempt.score || 0) > (existing.score || 0)) {
        attemptsByTest.set(attempt.test_id, attempt)
      }
    })

    // 5. Agrupar testes por disciplina
    const subjectsMap = new Map<string, any>()

    allTests?.forEach((test: any) => {
      const subjectId = test.subject_id || 'sem-disciplina'
      const subjectName = test.subjects?.name || 'Testes sem Disciplina'
      const courseName = test.courses?.title || 'Sem Curso'

      if (!subjectsMap.has(subjectId)) {
        subjectsMap.set(subjectId, {
          subjectId,
          subjectName,
          courseName,
          totalTests: 0,
          testsCompleted: 0,
          testsMissed: 0,
          average: 0,
          highestScore: 0,
          lowestScore: 100,
          tests: []
        })
      }

      const subject = subjectsMap.get(subjectId)
      subject.totalTests++

      const attempt = attemptsByTest.get(test.id)
      const score = attempt?.score || 0
      const completed = !!attempt

      if (completed) {
        subject.testsCompleted++
        if (score > subject.highestScore) subject.highestScore = score
        if (score < subject.lowestScore) subject.lowestScore = score
      } else {
        subject.testsMissed++
        subject.lowestScore = 0
      }

      subject.tests.push({
        id: test.id,
        title: test.title,
        score,
        completed,
        date: attempt?.submitted_at || undefined
      })
    })

    // 6. Calcular médias
    const subjectsArray = Array.from(subjectsMap.values())
    subjectsArray.forEach(subject => {
      const totalScore = subject.tests.reduce((sum: number, test: any) => sum + test.score, 0)
      subject.average = subject.totalTests > 0 ? totalScore / subject.totalTests : 0
    })

    // 7. Calcular estatísticas gerais
    const totalTests = subjectsArray.reduce((sum, s) => sum + s.totalTests, 0)
    const completedTests = subjectsArray.reduce((sum, s) => sum + s.testsCompleted, 0)
    const scoreSum = subjectsArray.reduce((sum, s) => {
      return sum + s.tests.reduce((acc: number, test: any) => acc + test.score, 0)
    }, 0)
    const testsAverageRaw = totalTests > 0 ? scoreSum / totalTests : null

    // 8. Buscar nota do TCC com filtro de data
    let tccQuery = supabase
      .from('tcc_submissions')
      .select('grade, evaluated_at')
      .eq('user_id', userId)
      .order('evaluated_at', { ascending: false })

    if (dateRange?.start) {
      tccQuery = tccQuery.gte('evaluated_at', dateRange.start)
    }
    if (dateRange?.end) {
      tccQuery = tccQuery.lte('evaluated_at', dateRange.end)
    }

    const { data: tccSubmission } = await tccQuery.limit(1).maybeSingle()
    const tccGradeRaw = tccSubmission?.grade != null ? Number(tccSubmission.grade) : null

    // 9. Buscar overrides
    const { data: overrides } = await supabase
      .from('student_grade_overrides')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      data: {
        gradesBySubject: subjectsArray,
        totalTestsCount: totalTests,
        completedTestsCount: completedTests,
        testsAverageRaw,
        tccGradeRaw,
        overrides
      }
    })
  } catch (error) {
    logger.error('Erro inesperado ao buscar notas do aluno', error, { context: 'API_STUDENT_GRADES' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
