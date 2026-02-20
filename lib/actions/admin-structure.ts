'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface TreeNode {
  id: string
  type: 'course' | 'module' | 'subject' | 'lesson' | 'test'
  title: string
  children?: TreeNode[]
  data?: any
  parentId?: string
  order?: number
}

interface AssociationOption {
  id: string
  displayName: string
  description?: string | null
  availability: 'available' | 'current' | 'assignedElsewhere'
  statusText: string
  statusColorClass: string
}

export async function getHierarchicalData() {
  const supabase = await createClient()

  const [coursesRes, modulesRes, subjectsRes, lessonsRes, testsRes] = await Promise.all([
    supabase.from('courses').select('*').order('title'),
    supabase.from('course_modules').select('*').order('order_index'),
    supabase.from('subjects').select('id, code, name, description').order('name'),
    supabase.from('lessons').select('*').order('order_index'),
    supabase.from('tests').select('*').order('title')
  ])

  const [moduleSubjectsRes, subjectLessonsRes] = await Promise.all([
    supabase.from('module_subjects').select('*').order('order_index'),
    supabase.from('subject_lessons').select('*')
  ])

  const courses = coursesRes.data || []
  const modules = modulesRes.data || []
  const subjects = subjectsRes.data || []
  const lessons = lessonsRes.data || []
  const tests = testsRes.data || []
  const moduleSubjects = moduleSubjectsRes.data || []
  const subjectLessons = subjectLessonsRes.data || []

  const tree: TreeNode[] = courses.map((course: any) => {
    const courseNode: TreeNode = {
      id: course.id,
      type: 'course',
      title: course.title,
      data: course,
      children: []
    }

    const courseModules = modules.filter((m: any) => m.course_id === course.id)
    courseModules.forEach((module: any) => {
      const moduleNode: TreeNode = {
        id: module.id,
        type: 'module',
        title: module.title,
        parentId: course.id,
        data: module,
        order: module.order_index,
        children: []
      }

      const moduleSubjectIds = moduleSubjects
        .filter((ms: any) => ms.module_id === module.id)
        .map((ms: any) => ms.subject_id)

      const moduleSubjectsData = subjects.filter((s: any) => moduleSubjectIds.includes(s.id))
      moduleSubjectsData.forEach((subject: any) => {
        // Evita duplicar o código no título caso o nome já comece com ele
        // Ex: code="DCMD0101", name="DCMD0101-CENÁRIO..." → exibe "DCMD0101-CENÁRIO..." (sem re-prefixar)
        const subjectTitle = subject.code && !subject.name.startsWith(subject.code)
          ? `${subject.code} - ${subject.name}`
          : subject.name

        const subjectNode: TreeNode = {
          id: subject.id,
          type: 'subject',
          title: subjectTitle,
          parentId: module.id,
          data: subject,
          children: []
        }

        const subjectLessonIds = subjectLessons
          .filter((sl: any) => sl.subject_id === subject.id)
          .map((sl: any) => sl.lesson_id)

        const subjectLessonsData = lessons.filter((l: any) => subjectLessonIds.includes(l.id))
        subjectLessonsData.forEach((lesson: any) => {
          subjectNode.children!.push({
            id: lesson.id,
            type: 'lesson',
            title: lesson.title,
            parentId: subject.id,
            data: lesson,
            order: lesson.order_index
          })
        })

        const subjectTests = tests.filter((t: any) => t.subject_id === subject.id)
        subjectTests.forEach((test: any) => {
          subjectNode.children!.push({
            id: test.id,
            type: 'test',
            title: test.title,
            parentId: subject.id,
            data: test
          })
        })

        if (subjectNode.children) {
          subjectNode.children.sort((a, b) => {
            if (a.type === 'lesson' && b.type === 'lesson') {
              return (a.order || 0) - (b.order || 0)
            }
            return 0
          })
        }

        moduleNode.children!.push(subjectNode)
      })

      courseNode.children!.push(moduleNode)
    })

    return courseNode
  })

  return { tree, courses }
}

export async function getAvailableItemsForAssociation(
  parentId: string,
  parentType: string,
  associateType: 'module' | 'subject' | 'lesson' | 'test'
) {
  const supabase = await createClient()

  if (associateType === 'module' && parentType === 'course') {
    const { data: allModules } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', parentId)
      .order('order_index')

    return { items: allModules || [], options: [] }
  }

  if (associateType === 'subject' && parentType === 'module') {
    const [{ data: allSubjects }, { data: subjectLinks }] = await Promise.all([
      supabase.from('subjects').select('id, code, name, description').order('name'),
      supabase.from('module_subjects').select('subject_id, module_id')
    ])

    const associationMap = new Map<string, string>()
    subjectLinks?.forEach((link: any) => {
      if (!associationMap.has(link.subject_id)) {
        associationMap.set(link.subject_id, link.module_id)
      }
    })

    const options: AssociationOption[] = (allSubjects || []).map((subject: any) => {
      const associatedModuleId = associationMap.get(subject.id) || null
      const availability: AssociationOption['availability'] = !associatedModuleId
        ? 'available'
        : associatedModuleId === parentId
          ? 'current'
          : 'assignedElsewhere'

      return {
        id: subject.id,
        displayName: subject.code && !subject.name.startsWith(subject.code)
          ? `${subject.code} - ${subject.name}`
          : subject.name,
        description: subject.description,
        availability,
        statusText:
          availability === 'available'
            ? 'Disponível para associação'
            : availability === 'current'
              ? 'Já faz parte deste módulo'
              : 'Associada a outro módulo',
        statusColorClass:
          availability === 'available'
            ? 'text-green-400'
            : availability === 'current'
              ? 'text-gold-400'
              : 'text-orange-300'
      }
    })

    return { items: [], options }
  }

  if (associateType === 'lesson' && parentType === 'subject') {
    const [{ data: allLessons }, { data: lessonLinks }] = await Promise.all([
      supabase.from('lessons').select('id, title, description').order('title'),
      supabase.from('subject_lessons').select('subject_id, lesson_id')
    ])

    const associationMap = new Map<string, Set<string>>()
    lessonLinks?.forEach((link: any) => {
      if (!associationMap.has(link.lesson_id)) {
        associationMap.set(link.lesson_id, new Set())
      }
      associationMap.get(link.lesson_id)!.add(link.subject_id)
    })

    const options: AssociationOption[] = (allLessons || []).map((lesson: any) => {
      const associatedSubjects = associationMap.get(lesson.id)
      const isAssociatedWithCurrent = associatedSubjects?.has(parentId) || false
      const availability: AssociationOption['availability'] = !associatedSubjects || associatedSubjects.size === 0
        ? 'available'
        : isAssociatedWithCurrent
          ? 'current'
          : 'assignedElsewhere'

      const statusText = availability === 'available'
        ? 'Disponível para associação'
        : availability === 'current'
          ? 'Já faz parte desta disciplina'
          : `Associada a ${associatedSubjects?.size || 0} outra(s) disciplina(s)`

      return {
        id: lesson.id,
        displayName: lesson.title,
        description: lesson.description,
        availability,
        statusText,
        statusColorClass:
          availability === 'available'
            ? 'text-green-400'
            : availability === 'current'
              ? 'text-gold-400'
              : 'text-orange-300'
      }
    })

    return { items: [], options }
  }

  if (associateType === 'test' && parentType === 'subject') {
    const { data: allTests } = await supabase.from('tests').select('id, title, description, subject_id').order('title')

    const options: AssociationOption[] = (allTests || []).map((test: any) => {
      const availability: AssociationOption['availability'] = !test.subject_id
        ? 'available'
        : test.subject_id === parentId
          ? 'current'
          : 'assignedElsewhere'

      return {
        id: test.id,
        displayName: test.title,
        description: test.description,
        availability,
        statusText:
          availability === 'available'
            ? 'Disponível para associação'
            : availability === 'current'
              ? 'Já faz parte desta disciplina'
              : 'Associado a outra disciplina',
        statusColorClass:
          availability === 'available'
            ? 'text-green-400'
            : availability === 'current'
              ? 'text-gold-400'
              : 'text-orange-300'
      }
    })

    return { items: [], options }
  }

  return { items: [], options: [] }
}

export async function saveAssociations(
  parentId: string,
  parentType: string,
  associateType: 'module' | 'subject' | 'lesson' | 'test',
  selectedItems: string[]
) {
  const supabase = await createClient()

  if (associateType === 'subject' && parentType === 'module') {
    const associations = selectedItems.map((subjectId, index) => ({
      module_id: parentId,
      subject_id: subjectId,
      order_index: index
    }))

    const { error } = await supabase
      .from('module_subjects')
      .insert(associations)

    if (error) throw error
  }
  else if (associateType === 'lesson' && parentType === 'subject') {
    const associations = selectedItems.map((lessonId: any) => ({
      subject_id: parentId,
      lesson_id: lessonId
    }))

    const { error } = await supabase
      .from('subject_lessons')
      .insert(associations)

    if (error) throw error
  }
  else if (associateType === 'test' && parentType === 'subject') {
    const { error } = await supabase
      .from('tests')
      .update({ subject_id: parentId })
      .in('id', selectedItems)

    if (error) throw error
  }

  revalidatePath('/dashboard/structure')
}

export async function removeNodeFromStructure(nodeType: string, nodeId: string, parentId?: string) {
  const supabase = await createClient()

  if (nodeType === 'module' || nodeType === 'subject') {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) {
      throw new Error('Não autorizado')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'admin') {
      throw new Error('Acesso negado')
    }

    const adminClient = createAdminClient()

    if (nodeType === 'module') {
      await deleteModuleCascade(adminClient, nodeId)
    } else {
      await deleteSubjectCascade(adminClient, nodeId)
    }
  } else if (nodeType === 'lesson' && parentId) {
    const { error } = await supabase
      .from('subject_lessons')
      .delete()
      .eq('subject_id', parentId)
      .eq('lesson_id', nodeId)

    if (error) throw error
  } else if (nodeType === 'test' && parentId) {
    const { error } = await supabase
      .from('tests')
      .update({ subject_id: null as any })
      .eq('id', nodeId)

    if (error) throw error
  }

  revalidatePath('/dashboard/structure')
}

async function deleteByIds(
  supabase: any,
  table: string,
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

async function deleteModuleCascade(supabase: any, moduleId: string) {
  const { data: moduleSubjects } = await supabase
    .from('module_subjects')
    .select('subject_id')
    .eq('module_id', moduleId)

  const subjectIds: string[] = Array.from(
    new Set(
      (moduleSubjects || [])
        .map((entry: any) => entry.subject_id)
        .filter((id: any): id is string => Boolean(id))
    )
  )

  let lessonIds: string[] = []

  if (subjectIds.length > 0) {
    const { data: subjectLessons } = await supabase
      .from('subject_lessons')
      .select('lesson_id')
      .in('subject_id', subjectIds)

    lessonIds = subjectLessons
      ?.map((entry: any) => entry.lesson_id)
      .filter((id: any): id is string => Boolean(id)) ?? []
  }

  const { data: moduleLessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('module_id', moduleId)

  moduleLessons?.forEach((lesson: any) => {
    if (lesson.id) {
      lessonIds.push(lesson.id)
    }
  })
  lessonIds = Array.from(new Set(lessonIds))

  let testIds: string[] = []

  if (subjectIds.length > 0) {
    const { data: subjectTests } = await supabase
      .from('tests')
      .select('id')
      .in('subject_id', subjectIds)

    testIds = subjectTests
      ?.map((test: any) => test.id)
      .filter((id: any): id is string => Boolean(id)) ?? []
  }

  const { data: moduleTests } = await supabase
    .from('tests')
    .select('id')
    .eq('module_id', moduleId)

  moduleTests?.forEach((test: any) => {
    if (test.id) {
      testIds.push(test.id)
    }
  })
  testIds = Array.from(new Set(testIds))

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
}

async function deleteSubjectCascade(supabase: any, subjectId: string) {
  const { data: subjectLessons } = await supabase
    .from('subject_lessons')
    .select('lesson_id')
    .eq('subject_id', subjectId)

  const lessonIds: string[] = Array.from(
    new Set(
      (subjectLessons || [])
        .map((entry: any) => entry.lesson_id)
        .filter((id: any): id is string => Boolean(id))
    )
  )

  const { data: subjectTests } = await supabase
    .from('tests')
    .select('id')
    .eq('subject_id', subjectId)

  const testIds: string[] = Array.from(
    new Set(
      (subjectTests || [])
        .map((test: any) => test.id)
        .filter((id: any): id is string => Boolean(id))
    )
  )

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
}
