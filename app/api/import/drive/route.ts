import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getParentPrefix, validateCodeForType, extractDisplayName, type ItemType } from '@/lib/drive-import-utils'
import { parseAnswerKeyFromText } from '../../tests/utils/answer-key'

/**
 * Extrai o order_index de um código baseando-se nos últimos 2 dígitos numéricos.
 * Ex: "MAT02" → 2, "MAT0203" → 3, "MAT020301" → 1
 */
function extractOrderFromCode(code: string | null): number {
  if (!code) return 1
  const numbers = code.replace(/[A-Za-z]/g, '')
  if (numbers.length < 2) return 1
  return parseInt(numbers.slice(-2), 10) || 1
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await req.json()

    const itemType = (body.itemType || 'unknown') as ItemType
    const code = body.code || null
    const rawName = body.originalName || ''
    // Remove o prefixo do código do nome para evitar duplicação na exibição
    const originalName = extractDisplayName(rawName, code)
    const courseId = body.courseId || null
    const driveFileId = body.driveFileId || null
    const mimeType = body.mimeType || null
    const parentDatabaseId = body.parentDatabaseId || null

    if (!courseId) {
      return NextResponse.json({ error: 'courseId é obrigatório' }, { status: 400 })
    }

    // Validar código/tipo
    const validationError = validateCodeForType(code, itemType)
    if (validationError) {
      return NextResponse.json({
        error: validationError.message,
        field: validationError.field,
        itemType,
        code
      }, { status: 400 })
    }

    let databaseId: string | null = null
    let answerKeyInfo: { success: boolean; questionCount?: number; error?: string } | undefined

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
      case 'test': {
        const result = await createOrUpdateTest(supabase, { name: originalName, code, courseId, driveFileId, parentSubjectId: parentDatabaseId })
        databaseId = result.id
        answerKeyInfo = result.answerKey
        break
      }
      default:
        return NextResponse.json({
          error: 'Tipo não suportado',
          itemType
        }, { status: 400 })
    }

    const response: any = {
      success: true,
      itemType,
      code,
      name: originalName,
      databaseId
    }

    // Adicionar informações do gabarito se for um teste
    if (answerKeyInfo) {
      response.answerKey = answerKeyInfo
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[import/drive] Erro:', error)
    return NextResponse.json({
      error: 'Erro ao processar item',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * Extrai gabarito de um documento do Google Drive e salva no banco
 */
function extractGoogleDocumentId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

async function extractAndSaveAnswerKey(
  supabase: any,
  testId: string,
  googleDriveUrl: string
): Promise<{ success: boolean; questionCount?: number; error?: string }> {
  try {
    const docId = extractGoogleDocumentId(googleDriveUrl)
    if (!docId) {
      return { success: false, error: 'URL inválida' }
    }

    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`

    const response = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      return { success: false, error: 'Erro ao baixar documento' }
    }

    const content = await response.text()

    if (!content.trim()) {
      return { success: false, error: 'Documento sem conteúdo' }
    }

    const parsedAnswerKey = parseAnswerKeyFromText(content)

    if (!parsedAnswerKey || parsedAnswerKey.length === 0) {
      return { success: false, error: 'Gabarito não encontrado' }
    }

    // Deletar gabaritos antigos se existirem
    await supabase
      .from('test_answer_keys')
      .delete()
      .eq('test_id', testId)

    // Inserir novo gabarito
    const insertPayload = parsedAnswerKey.map(entry => ({
      test_id: testId,
      question_number: entry.questionNumber,
      correct_answer: entry.correctAnswer,
      points: entry.points ?? 10,
      justification: entry.justification
    }))

    const { error: insertError } = await supabase
      .from('test_answer_keys')
      .insert(insertPayload)

    if (insertError) {
      console.error('[extractAndSaveAnswerKey] Erro ao salvar gabarito:', insertError)
      return { success: false, error: 'Erro ao salvar gabarito' }
    }

    // Marcar teste como ativo
    await supabase
      .from('tests')
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', testId)

    console.log(`[extractAndSaveAnswerKey] Gabarito extraído: ${parsedAnswerKey.length} questões`)
    return { success: true, questionCount: parsedAnswerKey.length }

  } catch (error) {
    console.error('[extractAndSaveAnswerKey] Erro:', error)
    return { success: false, error: 'Erro inesperado' }
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

  // Checar existência primeiro — se já existe, retorna imediatamente
  const { data: existing } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', data.courseId)
    .eq('code', data.code)
    .maybeSingle()

  if (existing) return existing.id

  const { data: newModule, error } = await supabase
    .from('course_modules')
    .insert({
      course_id: data.courseId,
      code: data.code,
      title: data.name,
      description: `Módulo ${data.code}`,
      order_index: extractOrderFromCode(data.code)
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
  data: { code: string | null; name: string; courseId: string; parentModuleId?: string | null }
) {
  if (!data.code) {
    throw new Error('Código da disciplina não encontrado')
  }

  // Checar existência primeiro — se já existe, retorna imediatamente
  const { data: existingSubject } = await supabase
    .from('subjects')
    .select('id')
    .eq('code', data.code)
    .maybeSingle()

  if (existingSubject) return existingSubject.id

  // Resolver módulo pai apenas para novos registros
  let moduleId: string | null = data.parentModuleId || null

  if (!moduleId) {
    const parentPrefix = getParentPrefix(data.code)
    if (parentPrefix) {
      const { data: parentModule } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', data.courseId)
        .eq('code', parentPrefix)
        .maybeSingle()
      moduleId = parentModule?.id || null
    }
  }

  const { data: newSubject, error: subjectError } = await supabase
    .from('subjects')
    .insert({ name: data.name, code: data.code, description: `Disciplina ${data.code}` })
    .select('id')
    .single()

  if (subjectError) throw subjectError
  const subjectId = newSubject.id

  // Vincular ao módulo
  if (moduleId) {
    await supabase.from('module_subjects').insert({
      module_id: moduleId,
      subject_id: subjectId,
      order_index: extractOrderFromCode(data.code)
    })
  }

  // Vincular ao curso
  await supabase.from('course_subjects').insert({
    course_id: data.courseId,
    subject_id: subjectId,
    order_index: extractOrderFromCode(data.code),
    is_required: true
  })

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

  // Checar existência primeiro — se já existe, retorna imediatamente
  const { data: existingLesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('code', data.code)
    .maybeSingle()

  if (existingLesson) return existingLesson.id

  // Resolver pais apenas para novos registros
  let subjectId: string | null = data.parentSubjectId || null
  let moduleId: string | null = null

  if (subjectId) {
    const { data: parentSubject } = await supabase
      .from('subjects')
      .select('module_subjects!inner(module_id)')
      .eq('id', subjectId)
      .maybeSingle()
    moduleId = parentSubject?.module_subjects?.[0]?.module_id || null
  } else {
    const parentPrefix = getParentPrefix(data.code)
    if (parentPrefix) {
      const { data: parentSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('code', parentPrefix)
        .maybeSingle()
      subjectId = parentSubject?.id || null

      const modulePrefix = getParentPrefix(parentPrefix)
      if (modulePrefix) {
        const { data: parentModule } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', data.courseId)
          .eq('code', modulePrefix)
          .maybeSingle()
        moduleId = parentModule?.id || null
      }
    }
  }

  const contentType = data.mimeType?.includes('video') ? 'video' : 'text'
  const contentUrl = data.driveFileId
    ? `https://drive.google.com/file/d/${data.driveFileId}/view`
    : null

  const { data: newLesson, error: lessonError } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId,
      code: data.code,
      title: data.name,
      description: `Aula ${data.code}`,
      content_type: contentType,
      content_url: contentUrl,
      order_index: extractOrderFromCode(data.code)
    })
    .select('id')
    .single()

  if (lessonError) throw lessonError

  if (subjectId) {
    await supabase.from('subject_lessons').insert({ subject_id: subjectId, lesson_id: newLesson.id })
  }

  return newLesson.id
}

/**
 * Cria ou atualiza um teste
 */
async function createOrUpdateTest(
  supabase: any,
  data: { name: string; code: string | null; courseId: string; driveFileId: string | null; parentSubjectId?: string | null }
) {
  const driveUrl = data.driveFileId
    ? `https://drive.google.com/file/d/${data.driveFileId}/view`
    : ''

  // Checar existência primeiro — se já existe, retorna imediatamente
  const existingTestQuery = data.code
    ? supabase.from('tests').select('id').eq('code', data.code).maybeSingle()
    : driveUrl
      ? supabase.from('tests').select('id').eq('google_drive_url', driveUrl).maybeSingle()
      : Promise.resolve({ data: null })

  const { data: existingTest } = await existingTestQuery
  if (existingTest) return { id: existingTest.id, answerKey: { success: false, error: 'Teste já existia' } }

  // Resolver pais apenas para novos registros
  let moduleId: string | null = null
  let subjectId: string | null = data.parentSubjectId || null

  if (!subjectId && data.code) {
    const parentPrefix = getParentPrefix(data.code)
    if (parentPrefix) {
      const { data: parentSubject } = await supabase
        .from('subjects').select('id').eq('code', parentPrefix).maybeSingle()
      subjectId = parentSubject?.id || null

      const modulePrefix = getParentPrefix(parentPrefix)
      if (modulePrefix) {
        const { data: parentModule } = await supabase
          .from('course_modules').select('id').eq('course_id', data.courseId).eq('code', modulePrefix).maybeSingle()
        moduleId = parentModule?.id || null
      }
    }
  }

  const { data: newTest, error } = await supabase
    .from('tests')
    .insert({
      course_id: data.courseId,
      module_id: moduleId,
      subject_id: subjectId,
      code: data.code,
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

  // Tentar extrair gabarito automaticamente
  let answerKeyStatus: { success: boolean; questionCount?: number; error?: string } = {
    success: false,
    error: 'Não extraído'
  }
  if (driveUrl) {
    answerKeyStatus = await extractAndSaveAnswerKey(supabase, newTest.id, driveUrl)
    if (answerKeyStatus.success) {
      console.log(`[createOrUpdateTest] Gabarito extraído automaticamente: ${answerKeyStatus.questionCount} questões`)
    } else {
      console.warn(`[createOrUpdateTest] Falha ao extrair gabarito: ${answerKeyStatus.error}`)
    }
  }

  return {
    id: newTest.id,
    answerKey: answerKeyStatus
  }
}
