import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'

type CourseModule = Database['public']['Tables']['course_modules']['Row']

interface StudentSelection {
  studentId: string
  moduleIds?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Não autenticado. Por favor, faça login novamente.' },
        { status: 401 }
      )
    }

    const { courseId, studentIds, students } = await request.json()

    if (!courseId) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    const studentPayload: StudentSelection[] = Array.isArray(students) && students.length > 0
      ? (students as unknown[])
          .filter((entry): entry is StudentSelection => {
            if (!entry || typeof entry !== 'object') {
              return false
            }

            const candidate = entry as { studentId?: unknown }
            return typeof candidate.studentId === 'string'
          })
      : Array.isArray(studentIds)
        ? studentIds
            .filter((id: unknown): id is string => typeof id === 'string')
            .map(studentId => ({ studentId }))
        : []

    if (studentPayload.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum aluno selecionado para matrícula' },
        { status: 400 }
      )
    }

    console.log('[API] Matriculando alunos:', {
      courseId,
      studentCount: studentPayload.length,
      userId: session.user.id
    })

    // Buscar módulos do curso para validar seleção
    const { data: courseModules, error: modulesError } = await supabase
      .from('course_modules')
      .select('id, is_required')
      .eq('course_id', courseId)

    if (modulesError) {
      console.error('[API] Erro ao carregar módulos do curso:', modulesError)
      return NextResponse.json(
        { error: 'Não foi possível carregar módulos do curso' },
        { status: 500 }
      )
    }

    type ModuleSelection = Pick<CourseModule, 'id' | 'is_required'>

    const modulesById = new Map<string, ModuleSelection>()
    const requiredModuleIds: string[] = []
    const optionalModuleIds: string[] = []

    for (const courseModule of (courseModules || []) as ModuleSelection[]) {
      modulesById.set(courseModule.id, courseModule)
      if (courseModule.is_required === false) {
        optionalModuleIds.push(courseModule.id)
      } else {
        requiredModuleIds.push(courseModule.id)
      }
    }

    // Criar matrículas
    const enrollments = studentPayload.map(({ studentId }) => ({
      course_id: courseId,
      user_id: studentId,
      status: 'active',
      enrolled_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('enrollments')
      .insert(enrollments)
      .select()

    if (error) {
      console.error('[API] Erro ao criar matrículas:', error)
      
      // Verificar se é erro de duplicata
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Alguns alunos já estão matriculados neste curso' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const enrollmentsByStudent = new Map<string, (typeof data)[number]>()
    for (const enrollment of data || []) {
      enrollmentsByStudent.set(enrollment.user_id, enrollment)
    }

    // Preparar módulos selecionados por aluno
    const moduleAssignments: { enrollment_id: string; module_id: string }[] = []

    for (const { studentId, moduleIds } of studentPayload) {
      const enrollment = enrollmentsByStudent.get(studentId)
      if (!enrollment) continue

      const selectedOptionalIds = Array.isArray(moduleIds)
        ? moduleIds.filter(moduleId => modulesById.has(moduleId) && optionalModuleIds.includes(moduleId))
        : optionalModuleIds

      const modulesForStudent = new Set<string>([...requiredModuleIds, ...selectedOptionalIds])

      if (modulesForStudent.size === 0 && modulesById.size > 0) {
        // Se não há módulos selecionados explicitamente, e existem módulos no curso,
        // garantir que ao menos os obrigatórios sejam atribuídos
        requiredModuleIds.forEach(id => modulesForStudent.add(id))
      }

      modulesForStudent.forEach(moduleId => {
        moduleAssignments.push({
          enrollment_id: enrollment.id,
          module_id: moduleId
        })
      })
    }

    if (moduleAssignments.length > 0) {
      const { error: moduleInsertError } = await supabase
        .from('enrollment_modules')
        .insert(moduleAssignments)
        .select('id')

      if (moduleInsertError) {
        console.error('[API] Erro ao vincular módulos à matrícula:', moduleInsertError)
        return NextResponse.json(
          { error: 'Matrículas criadas, mas falha ao vincular módulos.' },
          { status: 500 }
        )
      }
    }

    // Registrar atividade
    await supabase
      .from('activity_logs')
      .insert({
        user_id: session.user.id,
        action: 'enroll_students',
        entity_type: 'course',
        entity_id: courseId,
        entity_name: `${studentPayload.length} alunos`,
        metadata: {
          studentIds: studentPayload.map(student => student.studentId),
          enrollmentCount: data.length,
          modulesAssigned: moduleAssignments.length
        }
      })

    return NextResponse.json({
      success: true,
      enrollments: data,
      message: `${data.length} aluno(s) matriculado(s) com sucesso`
    })
  } catch (error) {
    console.error('[API] Erro inesperado:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao processar matrícula. Tente novamente.'
      },
      { status: 500 }
    )
  }
}
