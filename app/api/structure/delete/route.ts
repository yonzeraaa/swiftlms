import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type AdminClient = SupabaseClient<Database>

type DeleteType = 'module' | 'subject'

class NotFoundError extends Error {
  status = 404
}

async function deleteByIds(
  supabase: AdminClient,
  table: keyof Database['public']['Tables'],
  column: string,
  ids: string[]
) {
  if (ids.length === 0) return

  const { error } = await supabase
    .from(table)
    .delete()
    .in(column, ids)

  if (error) {
    throw new Error(`Erro ao limpar ${table}: ${error.message}`)
  }
}

async function deleteModuleCascade(supabase: AdminClient, moduleId: string) {
  const summary = {
    moduleId,
    removedSubjects: 0,
    removedLessons: 0,
    removedTests: 0,
  }

  const { data: module, error: moduleError } = await supabase
    .from('course_modules')
    .select('id')
    .eq('id', moduleId)
    .maybeSingle()

  if (moduleError) {
    throw new Error(`Erro ao localizar módulo: ${moduleError.message}`)
  }

  if (!module) {
    throw new NotFoundError('Módulo não encontrado')
  }

  const { data: moduleSubjects, error: moduleSubjectsError } = await supabase
    .from('module_subjects')
    .select('subject_id')
    .eq('module_id', moduleId)

  if (moduleSubjectsError) {
    throw new Error(`Erro ao buscar disciplinas do módulo: ${moduleSubjectsError.message}`)
  }

  const subjectIds = Array.from(
    new Set(
      (moduleSubjects || [])
        .map(entry => entry.subject_id)
        .filter((id): id is string => Boolean(id))
    )
  )
  summary.removedSubjects = subjectIds.length

  let lessonIds: string[] = []

  if (subjectIds.length > 0) {
    const { data: subjectLessons, error: subjectLessonsError } = await supabase
      .from('subject_lessons')
      .select('lesson_id')
      .in('subject_id', subjectIds)

    if (subjectLessonsError) {
      throw new Error(`Erro ao buscar aulas das disciplinas: ${subjectLessonsError.message}`)
    }

    lessonIds = subjectLessons
      ?.map(entry => entry.lesson_id)
      .filter((id): id is string => Boolean(id)) ?? []
  }

  const { data: moduleLessons, error: moduleLessonsError } = await supabase
    .from('lessons')
    .select('id')
    .eq('module_id', moduleId)

  if (moduleLessonsError) {
    throw new Error(`Erro ao buscar aulas do módulo: ${moduleLessonsError.message}`)
  }

  moduleLessons?.forEach(lesson => {
    if (lesson.id) {
      lessonIds.push(lesson.id)
    }
  })
  lessonIds = Array.from(new Set(lessonIds))
  summary.removedLessons = lessonIds.length

  let testIds: string[] = []

  if (subjectIds.length > 0) {
    const { data: subjectTests, error: subjectTestsError } = await supabase
      .from('tests')
      .select('id')
      .in('subject_id', subjectIds)

    if (subjectTestsError) {
      throw new Error(`Erro ao buscar testes das disciplinas: ${subjectTestsError.message}`)
    }

    testIds = subjectTests
      ?.map(test => test.id)
      .filter((id): id is string => Boolean(id)) ?? []
  }

  const { data: moduleTests, error: moduleTestsError } = await supabase
    .from('tests')
    .select('id')
    .eq('module_id', moduleId)

  if (moduleTestsError) {
    throw new Error(`Erro ao buscar testes do módulo: ${moduleTestsError.message}`)
  }

  moduleTests?.forEach(test => {
    if (test.id) {
      testIds.push(test.id)
    }
  })
  testIds = Array.from(new Set(testIds))
  summary.removedTests = testIds.length

  await deleteByIds(supabase, 'test_answer_keys', 'test_id', testIds)
  await deleteByIds(supabase, 'test_attempts', 'test_id', testIds)
  await deleteByIds(supabase, 'test_grades', 'test_id', testIds)
  await deleteByIds(supabase, 'tests', 'id', testIds)

  await deleteByIds(supabase, 'lesson_progress', 'lesson_id', lessonIds)
  await deleteByIds(supabase, 'subject_lessons', 'lesson_id', lessonIds)
  await deleteByIds(supabase, 'subject_lessons', 'subject_id', subjectIds)
  await deleteByIds(supabase, 'lessons', 'id', lessonIds)

  await deleteByIds(supabase, 'module_subjects', 'subject_id', subjectIds)
  await deleteByIds(supabase, 'course_subjects', 'subject_id', subjectIds)
  await deleteByIds(supabase, 'subjects', 'id', subjectIds)

  const { error: moduleDeleteError } = await supabase
    .from('course_modules')
    .delete()
    .eq('id', moduleId)

  if (moduleDeleteError) {
    throw new Error(`Erro ao excluir módulo: ${moduleDeleteError.message}`)
  }

  return summary
}

async function deleteSubjectCascade(supabase: AdminClient, subjectId: string) {
  const summary = {
    subjectId,
    removedLessons: 0,
    removedTests: 0,
  }

  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('id')
    .eq('id', subjectId)
    .maybeSingle()

  if (subjectError) {
    throw new Error(`Erro ao localizar disciplina: ${subjectError.message}`)
  }

  if (!subject) {
    throw new NotFoundError('Disciplina não encontrada')
  }

  const { data: subjectLessons, error: subjectLessonsError } = await supabase
    .from('subject_lessons')
    .select('lesson_id')
    .eq('subject_id', subjectId)

  if (subjectLessonsError) {
    throw new Error(`Erro ao buscar aulas da disciplina: ${subjectLessonsError.message}`)
  }

  const lessonIds = Array.from(
    new Set(
      (subjectLessons || [])
        .map(entry => entry.lesson_id)
        .filter((id): id is string => Boolean(id))
    )
  )
  summary.removedLessons = lessonIds.length

  const { data: subjectTests, error: subjectTestsError } = await supabase
    .from('tests')
    .select('id')
    .eq('subject_id', subjectId)

  if (subjectTestsError) {
    throw new Error(`Erro ao buscar testes da disciplina: ${subjectTestsError.message}`)
  }

  const testIds = Array.from(
    new Set(
      (subjectTests || [])
        .map(test => test.id)
        .filter((id): id is string => Boolean(id))
    )
  )
  summary.removedTests = testIds.length

  await deleteByIds(supabase, 'test_answer_keys', 'test_id', testIds)
  await deleteByIds(supabase, 'test_attempts', 'test_id', testIds)
  await deleteByIds(supabase, 'test_grades', 'test_id', testIds)
  await deleteByIds(supabase, 'tests', 'id', testIds)

  await deleteByIds(supabase, 'lesson_progress', 'lesson_id', lessonIds)
  await deleteByIds(supabase, 'subject_lessons', 'lesson_id', lessonIds)
  await deleteByIds(supabase, 'subject_lessons', 'subject_id', [subjectId])
  await deleteByIds(supabase, 'lessons', 'id', lessonIds)

  await deleteByIds(supabase, 'module_subjects', 'subject_id', [subjectId])
  await deleteByIds(supabase, 'course_subjects', 'subject_id', [subjectId])
  await deleteByIds(supabase, 'subjects', 'id', [subjectId])

  return summary
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const type = body?.type as DeleteType
    const id = body?.id as string

    if (!type || !id || !['module', 'subject'].includes(type)) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos para remoção da estrutura' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[STRUCTURE_DELETE] Falha ao verificar perfil:', profileError)
      return NextResponse.json({ error: 'Erro ao verificar permissões' }, { status: 500 })
    }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    if (type === 'module') {
      const summary = await deleteModuleCascade(adminClient, id)
      return NextResponse.json({ success: true, summary })
    }

    if (type === 'subject') {
      const summary = await deleteSubjectCascade(adminClient, id)
      return NextResponse.json({ success: true, summary })
    }

    return NextResponse.json({ error: 'Tipo de remoção não suportado' }, { status: 400 })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[STRUCTURE_DELETE] Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro ao remover item da estrutura' }, { status: 500 })
  }
}
