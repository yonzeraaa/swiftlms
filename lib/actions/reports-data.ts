'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Busca dados completos para relatório de notas
 */
export async function getGradesReportData() {
  try {
    const supabase = await createClient()

    // Buscar todos os testes ativos
    const { data: allTests, error: testsError } = await supabase
      .from('tests')
      .select('*')
      .eq('is_active', true)

    if (testsError) throw testsError

    // Buscar todos os alunos ativos
    const { data: allStudents, error: studentsError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .eq('status', 'active')

    if (studentsError) throw studentsError

    // Buscar dados dos cursos
    const courseIds = [
      ...new Set(
        allTests
          ?.map((t: any) => t.course_id)
          .filter((id: any): id is string => Boolean(id)) || []
      ),
    ]

    const { data: courses, error: coursesError } =
      courseIds.length > 0
        ? await supabase.from('courses').select('id, title').in('id', courseIds)
        : { data: [], error: null }

    if (coursesError) throw coursesError

    // Buscar dados das disciplinas
    const subjectIds = [
      ...new Set(
        allTests
          ?.map((t: any) => t.subject_id)
          .filter((id: any): id is string => Boolean(id)) || []
      ),
    ]

    const { data: subjects, error: subjectsError } =
      subjectIds.length > 0
        ? await supabase.from('subjects').select('id, name').in('id', subjectIds)
        : { data: [], error: null }

    if (subjectsError) throw subjectsError

    return {
      success: true,
      data: {
        tests: allTests || [],
        students: allStudents || [],
        courses: courses || [],
        subjects: subjects || [],
      },
    }
  } catch (error: any) {
    console.error('Erro ao buscar dados de notas:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca tentativas de testes para relatório de histórico de notas
 */
export async function getGradesHistoryReportData(dateRange?: {
  start: string
  end: string
}) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('test_attempts')
      .select(`
        *,
        test:tests!inner(title, course_id, subject_id),
        user:profiles!test_attempts_user_id_fkey(full_name, email)
      `)
      .or(`submitted_at.not.is.null,started_at.not.is.null`)

    // Aplicar filtro de data se fornecido
    if (dateRange) {
      query = query
        .gte('submitted_at', dateRange.start)
        .lte('submitted_at', dateRange.end)
    }

    const { data: testAttempts, error } = await query
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(100)

    if (error) throw error

    // Se não houver resultados com filtro de data, tentar sem filtro
    if (dateRange && (!testAttempts || testAttempts.length === 0)) {
      const { data: fallbackAttempts, error: fallbackError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          test:tests!inner(title, course_id, subject_id),
          user:profiles!test_attempts_user_id_fkey(full_name, email)
        `)
        .or(`submitted_at.not.is.null,started_at.not.is.null`)
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(100)

      if (fallbackError) throw fallbackError

      return { success: true, data: fallbackAttempts || [] }
    }

    return { success: true, data: testAttempts || [] }
  } catch (error: any) {
    console.error('Erro ao buscar histórico de notas:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca dados de matrículas e conclusões para relatório
 */
export async function getEnrollmentReportData(dateRange: {
  start: string
  end: string
}) {
  try {
    const supabase = await createClient()

    // Buscar matrículas no período
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses!inner(title),
        user:profiles!enrollments_user_id_fkey(full_name, email)
      `)
      .gte('enrolled_at', dateRange.start)
      .lte('enrolled_at', dateRange.end)
      .order('enrolled_at', { ascending: false })

    if (enrollmentsError) throw enrollmentsError

    const enrollmentIds = enrollments?.map((e: any) => e.id) || []

    // Buscar progresso de lições
    const { data: lessonProgress, error: progressError } =
      enrollmentIds.length > 0
        ? await supabase
            .from('lesson_progress')
            .select('*')
            .in('enrollment_id', enrollmentIds)
        : { data: [], error: null }

    if (progressError) throw progressError

    // Buscar conclusões no período
    const { data: completedEnrollments, error: completedError } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses!inner(title),
        user:profiles!enrollments_user_id_fkey(full_name, email),
        certificates(*)
      `)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .gte('completed_at', dateRange.start)
      .lte('completed_at', dateRange.end)
      .order('completed_at', { ascending: false })

    if (completedError) throw completedError

    return {
      success: true,
      data: {
        enrollments: enrollments || [],
        lessonProgress: lessonProgress || [],
        completedEnrollments: completedEnrollments || [],
      },
    }
  } catch (error: any) {
    console.error('Erro ao buscar dados de matrículas:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca dados de acesso para relatório
 */
export async function getAccessReportData() {
  try {
    const supabase = await createClient()

    // Buscar todos os estudantes
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name')

    if (studentsError) throw studentsError

    // Buscar matrículas ativas e completas
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses(title),
        user:profiles(full_name, email)
      `)
      .in('status', ['active', 'completed'])

    if (enrollmentsError) throw enrollmentsError

    // Buscar progresso de lições
    const { data: lessonProgress, error: progressError } = await supabase
      .from('lesson_progress')
      .select('*')
      .order('last_accessed_at', { ascending: false })

    if (progressError) throw progressError

    // Buscar cursos publicados para métricas de engajamento
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('status', 'published')

    if (coursesError) throw coursesError

    return {
      success: true,
      data: {
        students: students || [],
        enrollments: enrollments || [],
        lessonProgress: lessonProgress || [],
        courses: courses || [],
      },
    }
  } catch (error: any) {
    console.error('Erro ao buscar dados de acesso:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca dados de usuários para relatório
 */
export async function getUsersReportData() {
  try {
    const supabase = await createClient()

    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        *,
        enrollments(
          *,
          course:courses(title, slug),
          lesson_progress(*)
        )
      `)
      .order('full_name', { ascending: true })

    if (error) throw error

    return { success: true, data: users || [] }
  } catch (error: any) {
    console.error('Erro ao buscar dados de usuários:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca dados completos do histórico do aluno para relatório
 */
export async function getStudentHistoryReportData(
  userId: string,
  courseId?: string
) {
  try {
    const supabase = await createClient()

    // Buscar enrollment do aluno
    let enrollmentQuery = supabase
      .from('enrollments')
      .select(`
        *,
        course:courses(
          *,
          course_modules(
            *,
            lessons(
              *,
              subject_lessons(subject_id)
            )
          )
        ),
        user:profiles(full_name, email)
      `)
      .eq('user_id', userId)

    if (courseId) {
      enrollmentQuery = enrollmentQuery.eq('course_id', courseId)
    }

    const { data: enrollment, error: enrollmentError } = await enrollmentQuery
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (enrollmentError) throw enrollmentError

    if (!enrollment) {
      return {
        success: false,
        error: 'Nenhuma matrícula encontrada para este aluno',
      }
    }

    // Buscar progresso de lições
    const { data: lessonProgress, error: progressError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('enrollment_id', enrollment.id)

    if (progressError) throw progressError

    // Buscar tentativas de testes
    const { data: testAttempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select(`
        score,
        test:tests(
          id,
          subject_id,
          course_id,
          subjects(name)
        )
      `)
      .eq('user_id', userId)
      .eq('enrollment_id', enrollment.id)

    if (attemptsError) throw attemptsError

    // Buscar apenas as disciplinas associadas aos módulos do curso
    const courseModules = enrollment.course?.course_modules || []
    const moduleIds = courseModules.map((m: any) => m.id)

    let subjects: any[] = []
    if (moduleIds.length > 0) {
      // Buscar disciplinas vinculadas aos módulos do curso
      const { data: moduleSubjects, error: moduleSubjectsError } = await supabase
        .from('module_subjects')
        .select('subject_id')
        .in('module_id', moduleIds)

      if (moduleSubjectsError) throw moduleSubjectsError

      const subjectIds = [
        ...new Set(moduleSubjects?.map((ms: any) => ms.subject_id) || []),
      ]

      if (subjectIds.length > 0) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, code')
          .in('id', subjectIds)

        if (subjectsError) throw subjectsError
        subjects = subjectsData || []
      }
    }

    return {
      success: true,
      data: {
        enrollment,
        lessonProgress: lessonProgress || [],
        testAttempts: testAttempts || [],
        subjects: subjects || [],
      },
    }
  } catch (error: any) {
    console.error('Erro ao buscar histórico do aluno:', error)
    return { success: false, error: error.message }
  }
}
