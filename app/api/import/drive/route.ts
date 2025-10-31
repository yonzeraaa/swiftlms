import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getParentPrefix } from '@/lib/drive-import-utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await req.json()

    const itemType = body.itemType || 'unknown'
    const code = body.code || null
    const originalName = body.originalName || ''
    const courseId = body.courseId || null
    const driveFileId = body.driveFileId || null
    const mimeType = body.mimeType || null
    const parentDatabaseId = body.parentDatabaseId || null

    if (!courseId) {
      return NextResponse.json({ error: 'courseId é obrigatório' }, { status: 400 })
    }

    let databaseId: string | null = null

    switch (itemType) {
      case 'module':
        databaseId = await createOrUpdateModule(supabase, { code, name: originalName, courseId })
        break
      case 'subject':
        databaseId = await createOrUpdateSubject(supabase, { code, name: originalName, courseId, parentModuleId: parentDatabaseId })
        break
      case 'lesson':
        databaseId = await createOrUpdateLesson(supabase, { code, name: originalName, courseId, driveFileId, mimeType, parentSubjectId: parentDatabaseId })
        break
      case 'test':
        databaseId = await createOrUpdateTest(supabase, { name: originalName, code, courseId, driveFileId, parentSubjectId: parentDatabaseId })
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
      name: originalName,
      databaseId
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

  console.log(`[createOrUpdateModule] Módulo criado: ${data.name} (id: ${newModule.id}, code: ${data.code})`)
  return newModule.id
}

/**
 * Cria ou atualiza uma disciplina (subject)
 */
async function createOrUpdateSubject(
  supabase: any,
  data: { code: string | null; name: string; courseId: string; parentModuleId?: string | null }
) {
  if (!data.code) {
    throw new Error('Código da disciplina não encontrado')
  }

  // Usar o parentModuleId direto se fornecido, senão tentar buscar
  let moduleId: string | null = data.parentModuleId || null

  if (!moduleId) {
    // Fallback: tentar buscar por código (método antigo)
    const parentPrefix = getParentPrefix(data.code)
    if (parentPrefix) {
      const { data: parentModule, error: moduleError } = await supabase
        .from('course_modules')
        .select('id, title')
        .eq('course_id', data.courseId)
        .ilike('title', `${parentPrefix}%`)
        .maybeSingle()

      if (moduleError && moduleError.code !== 'PGRST116') {
        console.error(`[createOrUpdateSubject] Erro ao buscar módulo pai ${parentPrefix}:`, moduleError)
      }

      if (!parentModule) {
        console.warn(`[createOrUpdateSubject] Módulo pai ${parentPrefix} não encontrado para disciplina ${data.code}`)
      } else {
        console.log(`[createOrUpdateSubject] Módulo pai encontrado via busca: ${parentModule.title} (id: ${parentModule.id})`)
      }

      moduleId = parentModule?.id || null
    }
  } else {
    console.log(`[createOrUpdateSubject] Usando parentModuleId direto: ${moduleId}`)
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
    console.log(`[createOrUpdateSubject] Disciplina criada: ${data.name} (id: ${subjectId}, code: ${data.code})`)
  }

  // Vincular ao módulo se existir
  if (moduleId) {
    const { data: existingLink } = await supabase
      .from('module_subjects')
      .select('id')
      .eq('module_id', moduleId)
      .eq('subject_id', subjectId)
      .maybeSingle()

    if (!existingLink) {
      const { data: orderData } = await supabase
        .from('module_subjects')
        .select('order_index')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrder = orderData?.[0]?.order_index ? orderData[0].order_index + 1 : 1

      const { error: linkError } = await supabase
        .from('module_subjects')
        .insert({
          module_id: moduleId,
          subject_id: subjectId,
          order_index: nextOrder
        })

      if (linkError) {
        console.error(`[createOrUpdateSubject] Erro ao vincular disciplina ${data.code} ao módulo:`, linkError)
      } else {
        console.log(`[createOrUpdateSubject] Disciplina ${data.code} vinculada ao módulo (moduleId: ${moduleId})`)
      }
    } else {
      console.log(`[createOrUpdateSubject] Disciplina ${data.code} já vinculada ao módulo`)
    }
  } else {
    console.warn(`[createOrUpdateSubject] Disciplina ${data.code} NÃO foi vinculada a nenhum módulo (moduleId é null)`)
  }

  // Vincular ao curso
  const { data: existingCourseLink } = await supabase
    .from('course_subjects')
    .select('id')
    .eq('course_id', data.courseId)
    .eq('subject_id', subjectId)
    .single()

  if (!existingCourseLink) {
    const { data: courseOrderData } = await supabase
      .from('course_subjects')
      .select('order_index')
      .eq('course_id', data.courseId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextCourseOrder = courseOrderData?.[0]?.order_index ? courseOrderData[0].order_index + 1 : 1

    await supabase
      .from('course_subjects')
      .insert({
        course_id: data.courseId,
        subject_id: subjectId,
        order_index: nextCourseOrder,
        is_required: true
      })
  }

  return subjectId
}

/**
 * Cria ou atualiza uma aula (lesson)
 */
async function createOrUpdateLesson(
  supabase: any,
  data: { code: string | null; name: string; courseId: string; driveFileId: string | null; mimeType: string | null; parentSubjectId?: string | null }
) {
  if (!data.code) {
    throw new Error('Código da aula não encontrado')
  }

  // Usar o parentSubjectId direto se fornecido
  let subjectId: string | null = data.parentSubjectId || null
  let moduleId: string | null = null

  if (subjectId) {
    console.log(`[createOrUpdateLesson] Usando parentSubjectId direto: ${subjectId}`)

    // Buscar o moduleId da disciplina pai
    const { data: parentSubject } = await supabase
      .from('subjects')
      .select('id, name, module_subjects!inner(module_id)')
      .eq('id', subjectId)
      .maybeSingle()

    if (parentSubject && parentSubject.module_subjects && parentSubject.module_subjects.length > 0) {
      moduleId = parentSubject.module_subjects[0].module_id
      console.log(`[createOrUpdateLesson] Módulo encontrado via disciplina: ${moduleId}`)
    }
  } else {
    // Fallback: tentar buscar por código (método antigo)
    const parentPrefix = getParentPrefix(data.code)

    if (parentPrefix) {
      const { data: parentSubject, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('code', parentPrefix)
        .maybeSingle()

      if (subjectError && subjectError.code !== 'PGRST116') {
        console.error(`[createOrUpdateLesson] Erro ao buscar disciplina pai ${parentPrefix}:`, subjectError)
      }

      if (!parentSubject) {
        console.warn(`[createOrUpdateLesson] Disciplina pai ${parentPrefix} não encontrada para aula ${data.code}`)
      } else {
        console.log(`[createOrUpdateLesson] Disciplina pai encontrada via busca: ${parentSubject.name} (id: ${parentSubject.id})`)
      }

      subjectId = parentSubject?.id || null
    }

    // Buscar módulo (para vincular a lesson)
    const modulePrefix = parentPrefix ? getParentPrefix(parentPrefix) : null

    if (modulePrefix) {
      const { data: parentModule, error: moduleError } = await supabase
        .from('course_modules')
        .select('id, title')
        .eq('course_id', data.courseId)
        .ilike('title', `${modulePrefix}%`)
        .maybeSingle()

      if (moduleError && moduleError.code !== 'PGRST116') {
        console.error(`[createOrUpdateLesson] Erro ao buscar módulo pai ${modulePrefix}:`, moduleError)
      }

      if (!parentModule) {
        console.warn(`[createOrUpdateLesson] Módulo pai ${modulePrefix} não encontrado para aula ${data.code}`)
      } else {
        console.log(`[createOrUpdateLesson] Módulo pai encontrado via busca: ${parentModule.title} (id: ${parentModule.id})`)
      }

      moduleId = parentModule?.id || null
    }
  }

  const contentType = data.mimeType?.includes('video') ? 'video' : 'text'
  const contentUrl = data.driveFileId
    ? `https://drive.google.com/file/d/${data.driveFileId}/view`
    : null

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
        content_type: contentType,
        content_url: contentUrl,
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
        content_type: contentType,
        content_url: contentUrl,
        order_index: nextOrder
      })
      .select('id')
      .single()

    if (lessonError) throw lessonError
    lessonId = newLesson.id
    console.log(`[createOrUpdateLesson] Aula criada: ${data.name} (id: ${lessonId}, moduleId: ${moduleId || 'NULL'})`)
  }

  // Vincular à disciplina
  if (subjectId) {
    const { data: existingLink } = await supabase
      .from('subject_lessons')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (!existingLink) {
      const { error: linkError } = await supabase
        .from('subject_lessons')
        .insert({
          subject_id: subjectId,
          lesson_id: lessonId
        })

      if (linkError) {
        console.error(`[createOrUpdateLesson] Erro ao vincular aula ${data.code} à disciplina:`, linkError)
      } else {
        console.log(`[createOrUpdateLesson] Aula ${data.code} vinculada à disciplina (subjectId: ${subjectId})`)
      }
    } else {
      console.log(`[createOrUpdateLesson] Aula ${data.code} já vinculada à disciplina`)
    }
  } else {
    console.warn(`[createOrUpdateLesson] Aula ${data.code} NÃO foi vinculada a nenhuma disciplina (subjectId é null)`)
  }

  if (!moduleId) {
    console.error(`[createOrUpdateLesson] ATENÇÃO: Aula ${data.code} criada SEM moduleId! Não está vinculada ao curso!`)
  }

  return lessonId
}

/**
 * Cria ou atualiza um teste
 */
async function createOrUpdateTest(
  supabase: any,
  data: { name: string; code: string | null; courseId: string; driveFileId: string | null; parentSubjectId?: string | null }
) {
  // Buscar módulo e disciplina baseado no código
  let moduleId: string | null = null
  let subjectId: string | null = data.parentSubjectId || null

  if (!subjectId && data.code) {
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

  const driveUrl = data.driveFileId
    ? `https://drive.google.com/file/d/${data.driveFileId}/view`
    : ''

  // Criar teste (sempre cria novo, não atualiza)
  const { data: newTest, error } = await supabase
    .from('tests')
    .insert({
      course_id: data.courseId,
      module_id: moduleId,
      subject_id: subjectId,
      title: data.name,
      description: `Teste importado: ${data.name}`,
      google_drive_url: driveUrl,
      duration_minutes: 60,
      passing_score: 70,
      max_attempts: 3,
      is_active: false
    })
    .select('id')
    .single()

  if (error) throw error

  return newTest.id
}
