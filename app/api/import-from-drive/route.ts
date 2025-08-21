import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import path from 'path'
import fs from 'fs'

async function authenticateGoogleDrive() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './service-account-key.json'
  const absolutePath = path.resolve(process.cwd(), keyPath)
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Service account key file not found at ${absolutePath}`)
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: absolutePath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  const drive = google.drive({ version: 'v3', auth })
  return drive
}

interface CourseStructure {
  modules: {
    name: string
    order: number
    subjects: {
      name: string
      order: number
      lessons: {
        name: string
        code?: string
        order: number
        content?: string
        contentType: string
        contentUrl?: string
        description?: string
      }[]
    }[]
  }[]
}

function extractDriveFolderId(url: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  // Se não for uma URL, assumir que é o ID direto
  if (url.match(/^[a-zA-Z0-9-_]+$/)) {
    return url
  }
  
  return null
}

async function parseGoogleDriveFolder(drive: any, folderId: string): Promise<CourseStructure> {
  const structure: CourseStructure = { modules: [] }

  try {
    // Listar todos os arquivos e pastas dentro da pasta principal
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'name'
    })

    const items = response.data.files || []
    console.log(`Encontrados ${items.length} módulos na pasta principal`)
    
    // Processar módulos (pastas de primeiro nível)
    for (let moduleIndex = 0; moduleIndex < items.length; moduleIndex++) {
      const item = items[moduleIndex]
      
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const module = {
          name: item.name,
          order: moduleIndex + 1,
          subjects: [] as any[]
        }

        // Listar disciplinas dentro do módulo
        const subjectsResponse = await drive.files.list({
          q: `'${item.id}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType)',
          orderBy: 'name'
        })

        const subjects = subjectsResponse.data.files || []
        console.log(`  Módulo '${module.name}': ${subjects.length} disciplinas encontradas`)

        for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex++) {
          const subjectItem = subjects[subjectIndex]
          
          if (subjectItem.mimeType === 'application/vnd.google-apps.folder') {
            const subject = {
              name: subjectItem.name,
              order: subjectIndex + 1,
              lessons: [] as any[]
            }

            // Listar aulas dentro da disciplina
            const lessonsResponse = await drive.files.list({
              q: `'${subjectItem.id}' in parents and trashed = false`,
              fields: 'files(id, name, mimeType)',
              orderBy: 'name'
            })

            const lessons = lessonsResponse.data.files || []
            console.log(`    Disciplina '${subject.name}': ${lessons.length} arquivos/pastas encontrados`)

            let actualLessonIndex = 0
            for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
              const lessonItem = lessons[lessonIndex]
              
              // Ignorar pastas - apenas processar arquivos
              if (lessonItem.mimeType === 'application/vnd.google-apps.folder') {
                continue
              }
              
              // Determinar tipo de conteúdo baseado no mimeType
              let contentType = 'text'
              if (lessonItem.mimeType.includes('video')) {
                contentType = 'video'
              } else if (lessonItem.mimeType.includes('audio')) {
                contentType = 'audio'
              } else if (lessonItem.mimeType.includes('pdf')) {
                contentType = 'pdf'
              } else if (lessonItem.mimeType.includes('presentation') || lessonItem.mimeType.includes('powerpoint')) {
                contentType = 'slides'
              } else if (lessonItem.mimeType.includes('spreadsheet') || lessonItem.mimeType.includes('excel')) {
                contentType = 'spreadsheet'
              }
              
              // Gerar link do Google Drive para o arquivo
              const driveLink = `https://drive.google.com/file/d/${lessonItem.id}/view`
              
              // Extrair código e nome da aula (formato: "AULA01-Nome da Aula" ou "A01-Nome")
              const lessonFileName = lessonItem.name.replace(/\.(docx?|pdf|txt|pptx?|xlsx?|mp4|mp3|m4a)$/i, '')
              const lessonCodeMatch = lessonFileName.match(/^([A-Z0-9]+)-(.+)$/)
              
              let lessonCode: string
              let lessonName: string
              
              if (lessonCodeMatch) {
                lessonCode = lessonCodeMatch[1]
                lessonName = lessonCodeMatch[2].trim()
              } else {
                // Se não seguir o padrão, gerar código automático
                lessonCode = `A${String(actualLessonIndex + 1).padStart(2, '0')}`
                lessonName = lessonFileName
              }
              
              const lesson = {
                name: lessonName,
                code: lessonCode,
                order: actualLessonIndex + 1,
                content: undefined as string | undefined,
                contentType: contentType,
                contentUrl: driveLink,
                description: `Aula ${lessonCode}: ${lessonName}`
              }
              actualLessonIndex++

              // Tentar obter o conteúdo baseado no tipo do arquivo
              try {
                if (lessonItem.mimeType === 'application/vnd.google-apps.document') {
                  // Google Docs
                  const content = await drive.files.export({
                    fileId: lessonItem.id,
                    mimeType: 'text/plain'
                  })
                  lesson.content = content.data as string
                } else if (lessonItem.mimeType === 'application/vnd.google-apps.presentation') {
                  // Google Slides - exportar como texto
                  const content = await drive.files.export({
                    fileId: lessonItem.id,
                    mimeType: 'text/plain'
                  })
                  lesson.content = content.data as string
                } else if (lessonItem.mimeType === 'application/vnd.google-apps.spreadsheet') {
                  // Google Sheets - exportar como CSV
                  const content = await drive.files.export({
                    fileId: lessonItem.id,
                    mimeType: 'text/csv'
                  })
                  lesson.content = content.data as string
                } else if (lessonItem.mimeType && !lessonItem.mimeType.startsWith('application/vnd.google-apps')) {
                  // Outros arquivos (PDF, DOCX, etc) - baixar conteúdo
                  try {
                    const response = await drive.files.get({
                      fileId: lessonItem.id,
                      alt: 'media'
                    })
                    // Para arquivos binários, apenas registrar que existe
                    lesson.content = `[Arquivo: ${lessonItem.name}]`
                  } catch (err) {
                    console.log(`Arquivo ${lessonItem.name} não pôde ter conteúdo extraído`)
                    lesson.content = ''
                  }
                }
              } catch (error) {
                console.error(`Erro ao processar aula ${lessonItem.name}:`, error)
                lesson.content = ''
              }

              // Apenas adicionar se for um arquivo válido
              subject.lessons.push(lesson)
              console.log(`      Aula adicionada: '${lesson.name}' (tipo: ${lessonItem.mimeType})`)
            }
            
            console.log(`    Total de aulas processadas para '${subject.name}': ${subject.lessons.length}`)

            module.subjects.push(subject)
          }
        }

        structure.modules.push(module)
      }
    }

    return structure
  } catch (error) {
    console.error('Erro ao processar pasta do Google Drive:', error)
    throw error
  }
}

async function importToDatabase(structure: CourseStructure, courseId: string, supabase: any) {
  const results = {
    modules: 0,
    subjects: 0,
    lessons: 0,
    errors: [] as string[]
  }

  try {
    // Buscar o maior order_index existente para módulos
    const { data: existingModules } = await supabase
      .from('course_modules')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)

    const startModuleIndex = existingModules && existingModules.length > 0 
      ? (existingModules[0].order_index + 1) 
      : 0

    // Importar módulos
    for (let moduleIdx = 0; moduleIdx < structure.modules.length; moduleIdx++) {
      const moduleData = structure.modules[moduleIdx]
      
      const { data: module, error: moduleError } = await supabase
        .from('course_modules')
        .insert({
          title: moduleData.name,
          course_id: courseId,
          order_index: startModuleIndex + moduleIdx,
          is_required: true
        })
        .select()
        .single()

      if (moduleError) {
        results.errors.push(`Erro ao criar módulo ${moduleData.name}: ${moduleError.message}`)
        continue
      }

      results.modules++

      // Importar disciplinas do módulo
      for (let subjectIdx = 0; subjectIdx < moduleData.subjects.length; subjectIdx++) {
        const subjectData = moduleData.subjects[subjectIdx]
        
        // Extrair código da disciplina se existir (formato: "DCA01-Nome" -> código: "DCA01")
        const codeMatch = subjectData.name.match(/^([A-Z0-9]+)-(.+)$/)
        const subjectCode = codeMatch ? codeMatch[1] : `SUB${Date.now()}${subjectIdx}`
        const subjectName = codeMatch ? codeMatch[2].trim() : subjectData.name

        // Verificar se a disciplina já existe
        let subjectId: string
        const { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .eq('code', subjectCode)
          .single()

        if (existingSubject) {
          subjectId = existingSubject.id
        } else {
          // Criar nova disciplina
          const { data: newSubject, error: subjectError } = await supabase
            .from('subjects')
            .insert({
              code: subjectCode,
              name: subjectName
            })
            .select()
            .single()

          if (subjectError) {
            results.errors.push(`Erro ao criar disciplina ${subjectData.name}: ${subjectError.message}`)
            continue
          }

          subjectId = newSubject.id
        }

        // Associar disciplina ao módulo
        const { error: linkError } = await supabase
          .from('module_subjects')
          .insert({
            module_id: module.id,
            subject_id: subjectId,
            order_index: subjectIdx
          })

        if (linkError) {
          // Se já existe a associação, ignorar o erro
          if (!linkError.message.includes('duplicate')) {
            results.errors.push(`Erro ao associar disciplina ${subjectData.name}: ${linkError.message}`)
            continue
          }
        } else {
          results.subjects++
        }

        // Importar aulas da disciplina
        for (let lessonIdx = 0; lessonIdx < subjectData.lessons.length; lessonIdx++) {
          const lessonData = subjectData.lessons[lessonIdx]
          
          // Criar título completo com código
          const fullTitle = lessonData.code ? `${lessonData.code} - ${lessonData.name}` : lessonData.name
          
          // Primeiro criar a aula na tabela lessons
          const { data: newLesson, error: lessonError } = await supabase
            .from('lessons')
            .insert({
              title: fullTitle,
              description: lessonData.description || `Aula importada do Google Drive`,
              content: lessonData.content || '',
              content_type: lessonData.contentType || 'text',
              content_url: lessonData.contentUrl || null,
              order_index: lessonIdx,
              module_id: module.id
            })
            .select()
            .single()

          if (lessonError) {
            results.errors.push(`Erro ao criar aula ${lessonData.name}: ${lessonError.message}`)
            continue
          }
          
          // Depois associar a aula à disciplina na tabela subject_lessons
          if (newLesson) {
            const { error: linkError } = await supabase
              .from('subject_lessons')
              .insert({
                lesson_id: newLesson.id,
                subject_id: subjectId
              })
            
            if (linkError) {
              results.errors.push(`Erro ao associar aula ${lessonData.name} à disciplina: ${linkError.message}`)
              // Deletar a aula criada se não conseguir associar
              await supabase.from('lessons').delete().eq('id', newLesson.id)
              continue
            }
            
            results.lessons++
          }
        }
      }
    }

    return results
  } catch (error) {
    console.error('Erro ao importar para o banco de dados:', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { driveUrl, courseId } = await req.json()

    if (!driveUrl || !courseId) {
      return NextResponse.json(
        { error: 'URL do Drive e ID do curso são obrigatórios' },
        { status: 400 }
      )
    }

    // Extrair ID da pasta
    const folderId = extractDriveFolderId(driveUrl)
    if (!folderId) {
      return NextResponse.json(
        { error: 'URL do Google Drive inválida' },
        { status: 400 }
      )
    }

    // Autenticar com Google Drive
    const drive = await authenticateGoogleDrive()

    // Processar estrutura da pasta
    const structure = await parseGoogleDriveFolder(drive, folderId)

    if (structure.modules.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum módulo encontrado na pasta especificada' },
        { status: 400 }
      )
    }

    // Importar para o banco de dados
    const results = await importToDatabase(structure, courseId, supabase)

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${results.modules} módulos, ${results.subjects} disciplinas e ${results.lessons} aulas importados`,
      modulesImported: results.modules,
      subjectsImported: results.subjects,
      lessonsImported: results.lessons,
      errors: results.errors,
      structure
    })

  } catch (error: any) {
    console.error('Erro na importação:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar importação do Google Drive' },
      { status: 500 }
    )
  }
}