import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

const DUMMY_EMAIL = 'dummy.student@swiftlms.test'
const DUMMY_PASSWORD = 'DummyStudent123!'
const DUMMY_NAME = 'Aluno Demonstração'

function generateCertificateNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `CERT-${year}-${random}`
}

function generateVerificationCode(): string {
  return randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase()
}

export async function POST() {
  const supabase = await createClient()

  // Verificar se usuário atual é admin
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single()

  if (currentProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const now = new Date().toISOString()
  const today = new Date().toISOString().split('T')[0]

  try {
    // 1. Criar ou reutilizar usuário dummy
    let dummyUserId: string

    // Verificar se já existe
    const { data: existingUser } = await adminClient.auth.admin.listUsers()
    const dummyAuth = existingUser?.users?.find(u => u.email === DUMMY_EMAIL)

    if (dummyAuth) {
      dummyUserId = dummyAuth.id
      // Atualizar perfil existente
      await adminClient
        .from('profiles')
        .upsert({
          id: dummyUserId,
          email: DUMMY_EMAIL,
          full_name: DUMMY_NAME,
          role: 'student',
          status: 'active',
          updated_at: now
        })
    } else {
      // Criar novo usuário
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: DUMMY_EMAIL,
        password: DUMMY_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: DUMMY_NAME }
      })

      if (createError || !newUser.user) {
        throw new Error(createError?.message || 'Erro ao criar usuário dummy')
      }

      dummyUserId = newUser.user.id

      // Criar perfil
      await adminClient
        .from('profiles')
        .insert({
          id: dummyUserId,
          email: DUMMY_EMAIL,
          full_name: DUMMY_NAME,
          role: 'student',
          status: 'active',
          created_at: now,
          updated_at: now
        })
    }

    // 2. Buscar todos os cursos
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select('id, title, duration_hours')

    if (coursesError) throw coursesError
    if (!courses || courses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aluno dummy criado, mas não há cursos para matricular.',
        email: DUMMY_EMAIL,
        password: DUMMY_PASSWORD,
        userId: dummyUserId
      })
    }

    const stats = {
      enrollments: 0,
      lessons: 0,
      tests: 0,
      tccs: 0,
      certificates: 0
    }

    for (const course of courses) {
      // 3. Criar/atualizar enrollment
      const { data: enrollment, error: enrollError } = await adminClient
        .from('enrollments')
        .upsert({
          user_id: dummyUserId,
          course_id: course.id,
          status: 'completed',
          progress_percentage: 100,
          enrolled_at: now,
          completed_at: now
        }, { onConflict: 'user_id,course_id' })
        .select('id')
        .single()

      if (enrollError) {
        // Tentar buscar existente
        const { data: existingEnrollment } = await adminClient
          .from('enrollments')
          .select('id')
          .eq('user_id', dummyUserId)
          .eq('course_id', course.id)
          .single()

        if (!existingEnrollment) {
          console.error(`Erro ao criar enrollment para curso ${course.id}:`, enrollError)
          continue
        }

        // Atualizar existente
        await adminClient
          .from('enrollments')
          .update({
            status: 'completed',
            progress_percentage: 100,
            completed_at: now
          })
          .eq('id', existingEnrollment.id)
      }

      // Buscar enrollment_id
      const { data: enrollmentData } = await adminClient
        .from('enrollments')
        .select('id')
        .eq('user_id', dummyUserId)
        .eq('course_id', course.id)
        .single()

      if (!enrollmentData) continue
      const enrollmentId = enrollmentData.id
      stats.enrollments++

      // 4. Buscar módulos do curso e criar enrollment_modules
      const { data: modules } = await adminClient
        .from('course_modules')
        .select('id')
        .eq('course_id', course.id)

      if (modules) {
        for (const mod of modules) {
          await adminClient
            .from('enrollment_modules')
            .upsert({
              enrollment_id: enrollmentId,
              module_id: mod.id,
              assigned_at: now
            }, { onConflict: 'enrollment_id,module_id' })
        }
      }

      // 5. Buscar todas as aulas do curso e marcar como completas
      const { data: lessons } = await adminClient
        .from('lessons')
        .select('id, module_id')
        .in('module_id', modules?.map(m => m.id) || [])

      if (lessons) {
        for (const lesson of lessons) {
          await adminClient
            .from('lesson_progress')
            .upsert({
              user_id: dummyUserId,
              lesson_id: lesson.id,
              enrollment_id: enrollmentId,
              is_completed: true,
              progress_percentage: 100,
              started_at: now,
              completed_at: now,
              last_accessed_at: now
            }, { onConflict: 'user_id,lesson_id,enrollment_id' })
          stats.lessons++
        }
      }

      // 6. Buscar todos os testes do curso
      const { data: tests } = await adminClient
        .from('tests')
        .select('id, subject_id, course_id')
        .eq('course_id', course.id)

      if (tests) {
        for (const test of tests) {
          // Criar tentativa com nota máxima
          const { data: existingAttempt } = await adminClient
            .from('test_attempts')
            .select('id')
            .eq('user_id', dummyUserId)
            .eq('test_id', test.id)
            .single()

          if (!existingAttempt) {
            await adminClient
              .from('test_attempts')
              .insert({
                test_id: test.id,
                user_id: dummyUserId,
                enrollment_id: enrollmentId,
                attempt_number: 1,
                started_at: now,
                submitted_at: now,
                score: 100,
                passed: true,
                answers: {},
                time_spent_minutes: 30
              })
          }

          // Criar/atualizar nota do teste
          await adminClient
            .from('test_grades')
            .upsert({
              user_id: dummyUserId,
              course_id: test.course_id,
              subject_id: test.subject_id,
              test_id: test.id,
              best_score: 100,
              total_attempts: 1,
              last_attempt_date: now
            }, { onConflict: 'user_id,test_id' })

          stats.tests++
        }
      }

      // 7. Criar TCC com nota máxima
      const { data: existingTcc } = await adminClient
        .from('tcc_submissions')
        .select('id')
        .eq('user_id', dummyUserId)
        .eq('course_id', course.id)
        .single()

      if (!existingTcc) {
        await adminClient
          .from('tcc_submissions')
          .insert({
            user_id: dummyUserId,
            course_id: course.id,
            enrollment_id: enrollmentId,
            title: `TCC - ${course.title}`,
            description: 'TCC do aluno demonstração',
            submission_date: now,
            file_url: 'placeholder://dummy-tcc.pdf',
            status: 'approved',
            grade: 100,
            feedback: 'Aprovado automaticamente para aluno demonstração.',
            evaluated_by: currentUser.id,
            evaluated_at: now
          })
        stats.tccs++
      } else {
        // Atualizar existente
        await adminClient
          .from('tcc_submissions')
          .update({
            status: 'approved',
            grade: 100,
            feedback: 'Aprovado automaticamente para aluno demonstração.',
            evaluated_by: currentUser.id,
            evaluated_at: now
          })
          .eq('id', existingTcc.id)
        stats.tccs++
      }

      // 8. Criar certificate_requests e certificates para ambos os tipos
      for (const certType of ['technical', 'lato-sensu'] as const) {
        // Certificate request
        const { data: existingRequest } = await adminClient
          .from('certificate_requests')
          .select('id')
          .eq('user_id', dummyUserId)
          .eq('course_id', course.id)
          .eq('certificate_type', certType)
          .single()

        if (!existingRequest) {
          await adminClient
            .from('certificate_requests')
            .insert({
              enrollment_id: enrollmentId,
              user_id: dummyUserId,
              course_id: course.id,
              total_lessons: lessons?.length || 0,
              completed_lessons: lessons?.length || 0,
              request_date: now,
              status: 'approved',
              processed_at: now,
              processed_by: currentUser.id,
              notes: 'Aluno demonstração - aprovado automaticamente',
              certificate_type: certType
            })
        } else {
          await adminClient
            .from('certificate_requests')
            .update({
              status: 'approved',
              processed_at: now,
              processed_by: currentUser.id
            })
            .eq('id', existingRequest.id)
        }

        // Certificate
        const { data: existingCert } = await adminClient
          .from('certificates')
          .select('id')
          .eq('user_id', dummyUserId)
          .eq('course_id', course.id)
          .eq('certificate_type', certType)
          .single()

        if (!existingCert) {
          await adminClient
            .from('certificates')
            .insert({
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
              approved_by: currentUser.id,
              certificate_type: certType,
              conclusion_date: today,
              status: 'issued'
            })
          stats.certificates++
        } else {
          await adminClient
            .from('certificates')
            .update({
              grade: 100,
              final_grade: 100,
              approval_status: 'approved',
              approved_at: now,
              approved_by: currentUser.id,
              status: 'issued'
            })
            .eq('id', existingCert.id)
          stats.certificates++
        }
      }
    }

    // 9. Criar override de notas
    await adminClient
      .from('student_grade_overrides')
      .upsert({
        user_id: dummyUserId,
        tests_average_override: 100,
        tests_weight: 1,
        tcc_grade_override: 100,
        tcc_weight: 1,
        updated_at: now
      }, { onConflict: 'user_id' })

    return NextResponse.json({
      success: true,
      message: 'Aluno dummy criado/atualizado com sucesso!',
      email: DUMMY_EMAIL,
      password: DUMMY_PASSWORD,
      userId: dummyUserId,
      stats
    })

  } catch (error) {
    console.error('Erro ao criar aluno dummy:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
