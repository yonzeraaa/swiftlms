import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const DUMMY_PASSWORD = 'DummyStudent123!'
const DUMMY_NAME = 'Aluno Demonstracao'
const DUMMY_EMAIL_PATTERN = 'dummy.student%@swiftlms.test'
const DUMMY_EMAIL_REGEX = /^dummy\.student(?:\+.+)?@swiftlms\.test$/i

type AdminClient = ReturnType<typeof createAdminClient>

type CourseRow = {
  id: string
  title: string
  duration_hours: number | null
}

type ModuleRow = {
  id: string
}

type LessonRow = {
  id: string
}

type TestRow = {
  id: string
  subject_id: string
  course_id: string | null
}

type DummyStats = {
  enrollments: number
  lessons: number
  tests: number
  tccs: number
  certificates: number
  certificateErrors: number
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user: currentUser }
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .maybeSingle()

  if (currentProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 })
  }

  try {
    const result = await createFreshDummyStudent(currentUser.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao criar aluno dummy:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

async function createFreshDummyStudent(adminUserId: string) {
  const adminClient = createAdminClient()
  const now = new Date().toISOString()
  const today = now.split('T')[0]

  await cleanupPreviousDummyStudents(adminClient)

  const dummyUser = await createDummyAuthUser(adminClient)
  await upsertDummyProfile(adminClient, dummyUser.id, dummyUser.email, now)

  const courses = await listCourses(adminClient)
  const stats = emptyStats()

  if (courses.length === 0) {
    return {
      success: true,
      message: 'Aluno dummy criado, mas não há cursos para matricular.',
      email: dummyUser.email,
      password: DUMMY_PASSWORD,
      userId: dummyUser.id,
      stats,
    }
  }

  for (const course of courses) {
    await populateCourse(adminClient, {
      adminUserId,
      course,
      dummyUserId: dummyUser.id,
      now,
      stats,
      today,
    })
  }

  const { error: gradeOverrideError } = await adminClient
    .from('student_grade_overrides')
    .upsert(
      {
        user_id: dummyUser.id,
        tests_average_override: 100,
        tests_weight: 1,
        tcc_grade_override: 100,
        tcc_weight: 1,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )

  throwIfError(gradeOverrideError, 'Erro ao criar override de notas do aluno dummy')

  return {
    success: true,
    message: 'Aluno dummy criado com sucesso!',
    email: dummyUser.email,
    password: DUMMY_PASSWORD,
    userId: dummyUser.id,
    stats,
  }
}

async function cleanupPreviousDummyStudents(adminClient: AdminClient) {
  const users = await listAllAuthUsers(adminClient)
  const dummyUsers = users.filter(user => isDummyEmail(user.email))

  for (const user of dummyUsers) {
    const { error } = await adminClient.auth.admin.deleteUser(user.id)
    if (error && !/user not found/i.test(error.message || '')) {
      console.warn('Falha ao remover auth do aluno dummy antigo:', user.id, error.message)
    }
  }

  const { data: leftoverProfiles, error: leftoverProfilesError } = await adminClient
    .from('profiles')
    .select('id, email')
    .like('email', DUMMY_EMAIL_PATTERN)

  if (leftoverProfilesError) {
    console.warn('Falha ao localizar perfis dummy antigos:', leftoverProfilesError.message)
    return
  }

  for (const profile of leftoverProfiles || []) {
    const { data, error } = await (adminClient as any).rpc('delete_user_completely', {
      user_id_to_delete: profile.id,
    })

    if (error) {
      console.warn('Falha ao remover perfil dummy antigo:', profile.id, error.message)
      continue
    }

    if (data?.success === false && data.error !== 'User not found') {
      console.warn('Falha ao limpar dados do perfil dummy antigo:', profile.id, data.error)
    }
  }
}

async function createDummyAuthUser(adminClient: AdminClient) {
  const email = buildDummyEmail()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: DUMMY_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: DUMMY_NAME,
      is_dummy_student: true,
    },
  })

  if (!error && data.user?.id) {
    return {
      id: data.user.id,
      email,
    }
  }

  const userId = randomUUID()
  const { error: ensureAuthError } = await (adminClient as any).rpc('ensure_restore_auth_users', {
    profiles_payload: [
      {
        id: userId,
        email,
        full_name: DUMMY_NAME,
        role: 'student',
        phone: null,
      },
    ],
  })

  throwIfError(
    ensureAuthError,
    error?.message || 'Erro ao preparar auth do aluno dummy'
  )

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, {
    password: DUMMY_PASSWORD,
    user_metadata: {
      full_name: DUMMY_NAME,
      is_dummy_student: true,
    },
  })

  throwIfError(
    updateAuthError,
    error?.message || 'Erro ao definir senha do aluno dummy'
  )

  return {
    id: userId,
    email,
  }
}

async function upsertDummyProfile(
  adminClient: AdminClient,
  userId: string,
  email: string,
  now: string
) {
  const { error } = await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: DUMMY_NAME,
      role: 'student',
      status: 'active',
      created_at: now,
      updated_at: now,
    })

  throwIfError(error, 'Erro ao criar perfil do aluno dummy')
}

async function populateCourse(
  adminClient: AdminClient,
  params: {
    adminUserId: string
    course: CourseRow
    dummyUserId: string
    now: string
    stats: DummyStats
    today: string
  }
) {
  const { adminUserId, course, dummyUserId, now, stats, today } = params

  const enrollmentId = await ensureEnrollment(adminClient, dummyUserId, course.id, now)
  stats.enrollments += 1

  const modules = await listModules(adminClient, course.id)
  for (const module of modules) {
    const { error } = await adminClient
      .from('enrollment_modules')
      .upsert(
        {
          enrollment_id: enrollmentId,
          module_id: module.id,
          assigned_at: now,
        },
        { onConflict: 'enrollment_id,module_id' }
      )

    throwIfError(error, `Erro ao vincular módulo ao aluno dummy no curso ${course.id}`)
  }

  const lessons = modules.length > 0
    ? await listLessons(adminClient, modules.map(module => module.id))
    : []

  for (const lesson of lessons) {
    const { error } = await adminClient
      .from('lesson_progress')
      .upsert(
        {
          user_id: dummyUserId,
          lesson_id: lesson.id,
          enrollment_id: enrollmentId,
          is_completed: true,
          progress_percentage: 100,
          started_at: now,
          completed_at: now,
          last_accessed_at: now,
        },
        { onConflict: 'user_id,lesson_id' }
      )

    throwIfError(error, `Erro ao concluir aula do aluno dummy no curso ${course.id}`)
    stats.lessons += 1
  }

  const tests = await listTests(adminClient, course.id)
  for (const test of tests) {
    const { error: attemptError } = await adminClient
      .from('test_attempts')
      .upsert(
        {
          test_id: test.id,
          user_id: dummyUserId,
          enrollment_id: enrollmentId,
          attempt_number: 1,
          started_at: now,
          submitted_at: now,
          score: 100,
          passed: true,
          answers: {},
          time_spent_minutes: 30,
        },
        { onConflict: 'test_id,user_id,attempt_number' }
      )

    throwIfError(attemptError, `Erro ao criar tentativa de prova no curso ${course.id}`)

    const { error: gradeError } = await adminClient
      .from('test_grades')
      .upsert(
        {
          user_id: dummyUserId,
          course_id: test.course_id || course.id,
          subject_id: test.subject_id,
          test_id: test.id,
          best_score: 100,
          total_attempts: 1,
          last_attempt_date: now,
        },
        { onConflict: 'user_id,test_id' }
      )

    throwIfError(gradeError, `Erro ao consolidar nota de prova no curso ${course.id}`)
    stats.tests += 1
  }

  const tccId = await ensureTccSubmission(adminClient, {
    adminUserId,
    course,
    dummyUserId,
    enrollmentId,
    now,
  })
  stats.tccs += 1

  const { error: requirementsError } = await adminClient
    .from('certificate_requirements')
    .upsert(
      {
        enrollment_id: enrollmentId,
        user_id: dummyUserId,
        course_id: course.id,
        total_lessons: lessons.length,
        completed_lessons: lessons.length,
        all_lessons_completed: true,
        requirements_met: true,
        certificate_generated: true,
        checked_at: now,
        updated_at: now,
      },
      { onConflict: 'enrollment_id' }
    )

  throwIfError(requirementsError, `Erro ao gerar requisitos de certificado no curso ${course.id}`)

  for (const certificateType of ['technical', 'lato-sensu'] as const) {
    const { error: requestError } = await adminClient
      .from('certificate_requests')
      .upsert(
        {
          enrollment_id: enrollmentId,
          user_id: dummyUserId,
          course_id: course.id,
          total_lessons: lessons.length,
          completed_lessons: lessons.length,
          request_date: now,
          status: 'approved',
          processed_at: now,
          processed_by: adminUserId,
          notes: 'Aluno demonstracao gerado automaticamente',
          certificate_type: certificateType,
        },
        { onConflict: 'enrollment_id,certificate_type' }
      )

    throwIfError(requestError, `Erro ao gerar solicitação de certificado no curso ${course.id}`)

    const certificateCreated = await ensureCertificate(adminClient, {
      adminUserId,
      certificateType,
      course,
      dummyUserId,
      enrollmentId,
      now,
      tccId,
      today,
    })

    if (certificateCreated) {
      stats.certificates += 1
    } else {
      stats.certificateErrors += 1
    }
  }
}

async function ensureEnrollment(
  adminClient: AdminClient,
  dummyUserId: string,
  courseId: string,
  now: string
) {
  const { data, error } = await adminClient
    .from('enrollments')
    .upsert(
      {
        user_id: dummyUserId,
        course_id: courseId,
        status: 'completed',
        progress_percentage: 100,
        enrolled_at: now,
        completed_at: now,
      },
      { onConflict: 'user_id,course_id' }
    )
    .select('id')
    .single()

  throwIfError(error, `Erro ao criar matrícula do aluno dummy no curso ${courseId}`)

  return data.id
}

async function ensureTccSubmission(
  adminClient: AdminClient,
  params: {
    adminUserId: string
    course: CourseRow
    dummyUserId: string
    enrollmentId: string
    now: string
  }
) {
  const { adminUserId, course, dummyUserId, enrollmentId, now } = params

  const { data, error } = await adminClient
    .from('tcc_submissions')
    .upsert(
      {
        user_id: dummyUserId,
        course_id: course.id,
        enrollment_id: enrollmentId,
        title: `TCC - ${course.title}`,
        description: 'TCC do aluno demonstracao',
        submission_date: now,
        file_url: 'placeholder://dummy-tcc.pdf',
        status: 'approved',
        grade: 100,
        feedback: 'Aprovado automaticamente para o aluno demonstracao.',
        evaluated_by: adminUserId,
        evaluated_at: now,
        updated_at: now,
      },
      { onConflict: 'enrollment_id' }
    )
    .select('id')
    .single()

  throwIfError(error, `Erro ao gerar TCC do aluno dummy no curso ${course.id}`)

  return data.id
}

async function ensureCertificate(
  adminClient: AdminClient,
  params: {
    adminUserId: string
    certificateType: 'technical' | 'lato-sensu'
    course: CourseRow
    dummyUserId: string
    enrollmentId: string
    now: string
    tccId: string
    today: string
  }
) {
  const {
    adminUserId,
    certificateType,
    course,
    dummyUserId,
    enrollmentId,
    now,
    tccId,
    today,
  } = params

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await adminClient
      .from('certificates')
      .upsert(
        {
          user_id: dummyUserId,
          course_id: course.id,
          enrollment_id: enrollmentId,
          certificate_number: generateCertificateNumber(),
          verification_code: generateVerificationCode(),
          issued_at: now,
          grade: 100,
          final_grade: 100,
          instructor_name: 'SwiftEDU Team',
          course_hours: course.duration_hours || 0,
          approval_status: 'approved',
          approved_at: now,
          approved_by: adminUserId,
          certificate_type: certificateType,
          conclusion_date: today,
          status: 'issued',
          tcc_id: tccId,
          updated_at: now,
        },
        { onConflict: 'enrollment_id,certificate_type' }
      )

    if (!error) {
      return true
    }

    if (error.code !== '23505') {
      throw error
    }
  }

  return false
}

async function listCourses(adminClient: AdminClient) {
  const { data, error } = await adminClient
    .from('courses')
    .select('id, title, duration_hours')

  throwIfError(error, 'Erro ao buscar cursos para o aluno dummy')
  return (data || []) as CourseRow[]
}

async function listModules(adminClient: AdminClient, courseId: string) {
  const { data, error } = await adminClient
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)

  throwIfError(error, `Erro ao buscar módulos do curso ${courseId}`)
  return (data || []) as ModuleRow[]
}

async function listLessons(adminClient: AdminClient, moduleIds: string[]) {
  const { data, error } = await adminClient
    .from('lessons')
    .select('id')
    .in('module_id', moduleIds)

  throwIfError(error, 'Erro ao buscar aulas para o aluno dummy')
  return (data || []) as LessonRow[]
}

async function listTests(adminClient: AdminClient, courseId: string) {
  const { data, error } = await adminClient
    .from('tests')
    .select('id, subject_id, course_id')
    .eq('course_id', courseId)

  throwIfError(error, `Erro ao buscar provas do curso ${courseId}`)
  return (data || []) as TestRow[]
}

async function listAllAuthUsers(adminClient: AdminClient) {
  const users: Array<{ id: string; email?: string | null }> = []
  let page = 1

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    })

    throwIfError(error, 'Erro ao listar usuários do auth')

    const pageUsers = data?.users || []
    users.push(...pageUsers.map(user => ({ id: user.id, email: user.email })))

    if (pageUsers.length < 1000) {
      return users
    }

    page += 1
  }
}

function emptyStats(): DummyStats {
  return {
    enrollments: 0,
    lessons: 0,
    tests: 0,
    tccs: 0,
    certificates: 0,
    certificateErrors: 0,
  }
}

function buildDummyEmail() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `dummy.student+${stamp}-${randomUUID().slice(0, 8)}@swiftlms.test`.toLowerCase()
}

function isDummyEmail(email?: string | null) {
  return !!email && DUMMY_EMAIL_REGEX.test(email.trim())
}

function generateCertificateNumber() {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `CERT-${year}-${random}`
}

function generateVerificationCode() {
  return randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()
}

function throwIfError(error: { message?: string } | null, fallbackMessage: string): asserts error is null {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}
