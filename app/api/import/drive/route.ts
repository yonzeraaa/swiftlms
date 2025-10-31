import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getParentPrefix } from '@/lib/drive-import-utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const formData = await req.formData()

    const file = formData.get('file') as File | null
    const itemType = (formData.get('itemType') as string) || 'unknown'
    const code = (formData.get('code') as string) || null
    const originalName = (formData.get('originalName') as string) || ''
    const courseId = (formData.get('courseId') as string) || null

    if (!courseId) {
      return NextResponse.json({ error: 'courseId é obrigatório' }, { status: 400 })
    }

    const buffer = file ? Buffer.from(await file.arrayBuffer()) : null

    switch (itemType) {
      case 'module':
        await createOrUpdateModule(supabase, { code, name: originalName, courseId })
        break
      case 'subject':
        await createOrUpdateSubject(supabase, { code, name: originalName, courseId })
        break
      case 'lesson':
        await createOrUpdateLesson(supabase, { code, name: originalName, courseId, file: buffer })
        break
      case 'test':
        await createOrUpdateTest(supabase, { name: originalName, code, courseId, file: buffer })
        break
      default:
        return NextResponse.json({
          error: 'Tipo não suportado',
          itemType
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      itemType,
      code,
      name: originalName
    })
  } catch (error) {
    console.error('[import/drive] Erro:', error)
    return NextResponse.json({
      error: 'Erro ao processar item',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * Cria ou atualiza um módulo
 */
async function createOrUpdateModule(
  supabase: any,
  data: { code: string | null; name: string; courseId: string }
) {
  if (!data.code) {
    throw new Error('Código do módulo não encontrado')
  }

  // Buscar módulo existente
  const { data: existing } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', data.courseId)
    .ilike('title', `${data.code}%`)
    .single()

  if (existing) {
    // Atualizar módulo existente
    const { error } = await supabase
      .from('course_modules')
      .update({
        title: data.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (error) throw error
    return existing.id
  }

  // Criar novo módulo
  const { data: orderData } = await supabase
    .from('course_modules')
    .select('order_index')
    .eq('course_id', data.courseId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = orderData?.[0]?.order_index ? orderData[0].order_index + 1 : 1

  const { data: newModule, error } = await supabase
    .from('course_modules')
    .insert({
      course_id: data.courseId,
      title: data.name,
      description: `Módulo ${data.code}`,
      order_index: nextOrder
    })
    .select('id')
    .single()

  if (error) throw error
  return newModule.id
}

/**
 * Cria ou atualiza uma disciplina (subject)
 */
async function createOrUpdateSubject(
  supabase: any,
  data: { code: string | null; name: string; courseId: string }
) {
  if (!data.code) {
    throw new Error('Código da disciplina não encontrado')
  }

  const parentPrefix = getParentPrefix(data.code)

  // Buscar módulo pai
  let moduleId: string | null = null
  if (parentPrefix) {
    const { data: parentModule } = await supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', data.courseId)
      .ilike('title', `${parentPrefix}%`)
      .single()

    moduleId = parentModule?.id || null
  }

  // Buscar disciplina existente
  const { data: existingSubject } = await supabase
    .from('subjects')
    .select('id')
    .eq('code', data.code)
    .single()

  let subjectId: string

  if (existingSubject) {
    subjectId = existingSubject.id

    // Atualizar subject
    await supabase
      .from('subjects')
      .update({
        name: data.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', subjectId)
  } else {
    // Criar novo subject
    const { data: newSubject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        name: data.name,
        code: data.code,
        description: `Disciplina ${data.code}`
      })
      .select('id')
      .single()

    if (subjectError) throw subjectError
    subjectId = newSubject.id
  }

  // Vincular ao módulo se existir
  if (moduleId) {
    const { data: existingLink } = await supabase
      .from('module_subjects')
      .select('id')
      .eq('module_id', moduleId)
      .eq('subject_id', subjectId)
      .single()

    if (!existingLink) {
      const { data: orderData } = await supabase
        .from('module_subjects')
        .select('order_index')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrder = orderData?.[0]?.order_index ? orderData[0].order_index + 1 : 1

      await supabase
        .from('module_subjects')
        .insert({
          module_id: moduleId,
          subject_id: subjectId,
          order_index: nextOrder
        })
    }
  }

  return subjectId
}

/**
 * Cria ou atualiza uma aula (lesson)
 */
async function createOrUpdateLesson(
  supabase: any,
  data: { code: string | null; name: string; courseId: string; file: Buffer | null }
) {
  if (!data.code) {
    throw new Error('Código da aula não encontrado')
  }

  const parentPrefix = getParentPrefix(data.code)

  // Buscar disciplina pai
  let subjectId: string | null = null
  if (parentPrefix) {
    const { data: parentSubject } = await supabase
      .from('subjects')
      .select('id')
      .eq('code', parentPrefix)
      .single()

    subjectId = parentSubject?.id || null
  }

  // Buscar módulo (para vincular a lesson)
  const modulePrefix = parentPrefix ? getParentPrefix(parentPrefix) : null
  let moduleId: string | null = null

  if (modulePrefix) {
    const { data: parentModule } = await supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', data.courseId)
      .ilike('title', `${modulePrefix}%`)
      .single()

    moduleId = parentModule?.id || null
  }

  // Buscar lesson existente
  const { data: existingLesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('module_id', moduleId)
    .ilike('title', `${data.code}%`)
    .single()

  let lessonId: string

  if (existingLesson) {
    lessonId = existingLesson.id

    // Atualizar lesson
    await supabase
      .from('lessons')
      .update({
        title: data.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)
  } else {
    // Criar nova lesson
    const { data: orderData } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = orderData?.[0]?.order_index ? orderData[0].order_index + 1 : 1

    const { data: newLesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: data.name,
        description: `Aula ${data.code}`,
        content_type: 'text',
        order_index: nextOrder
      })
      .select('id')
      .single()

    if (lessonError) throw lessonError
    lessonId = newLesson.id
  }

  // Vincular à disciplina
  if (subjectId) {
    const { data: existingLink } = await supabase
      .from('subject_lessons')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('lesson_id', lessonId)
      .single()

    if (!existingLink) {
      await supabase
        .from('subject_lessons')
        .insert({
          subject_id: subjectId,
          lesson_id: lessonId
        })
    }
  }

  // TODO: Upload do arquivo para storage
  if (data.file) {
    console.log(`[import/drive] Arquivo da aula ${data.name} (${data.file.length} bytes) - upload pendente`)
  }

  return lessonId
}

/**
 * Cria ou atualiza um teste
 */
async function createOrUpdateTest(
  supabase: any,
  data: { name: string; code: string | null; courseId: string; file: Buffer | null }
) {
  // Buscar módulo e disciplina baseado no código
  let moduleId: string | null = null
  let subjectId: string | null = null

  if (data.code) {
    const parentPrefix = getParentPrefix(data.code)

    if (parentPrefix) {
      const { data: parentSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('code', parentPrefix)
        .single()

      subjectId = parentSubject?.id || null
    }

    const modulePrefix = parentPrefix ? getParentPrefix(parentPrefix) : null
    if (modulePrefix) {
      const { data: parentModule } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', data.courseId)
        .ilike('title', `${modulePrefix}%`)
        .single()

      moduleId = parentModule?.id || null
    }
  }

  // Criar teste (sempre cria novo, não atualiza)
  const { data: newTest, error } = await supabase
    .from('tests')
    .insert({
      course_id: data.courseId,
      module_id: moduleId,
      subject_id: subjectId,
      title: data.name,
      description: `Teste importado: ${data.name}`,
      google_drive_url: '', // TODO: armazenar URL original do Drive
      duration_minutes: 60,
      passing_score: 70,
      max_attempts: 3,
      is_active: false
    })
    .select('id')
    .single()

  if (error) throw error

  // TODO: Upload do arquivo para storage
  if (data.file) {
    console.log(`[import/drive] Arquivo do teste ${data.name} (${data.file.length} bytes) - upload pendente`)
  }

  return newTest.id
}
