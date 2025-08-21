import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import path from 'path'
import fs from 'fs'
import { getProgressStore } from '../import-from-drive-status/route'

async function authenticateGoogleDrive() {
  console.log('Iniciando autenticação Google Drive...')
  console.log('Ambiente:', process.env.NODE_ENV)
  console.log('GOOGLE_SERVICE_ACCOUNT_KEY existe?', !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  console.log('Tamanho da chave:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0)
  
  // Primeiro tentar usar as credenciais do ambiente (para produção)
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  
  if (serviceAccountKey && serviceAccountKey.trim() !== '') {
    console.log('Tentando usar GOOGLE_SERVICE_ACCOUNT_KEY do ambiente...')
    console.log('Tipo da variável:', typeof serviceAccountKey)
    console.log('Primeiros 50 caracteres:', serviceAccountKey.substring(0, 50))
    
    // Se a chave estiver disponível como variável de ambiente (JSON string)
    try {
      // Limpar possíveis problemas de formatação
      let cleanedKey = serviceAccountKey.trim()
      
      // Se começar e terminar com aspas simples ou duplas, remover
      if ((cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) || 
          (cleanedKey.startsWith("'") && cleanedKey.endsWith("'"))) {
        cleanedKey = cleanedKey.slice(1, -1)
      }
      
      // Tentar decodificar se estiver em base64
      let jsonString = cleanedKey
      try {
        // Verificar se é base64
        if (!jsonString.includes('{')) {
          console.log('Tentando decodificar de base64...')
          jsonString = Buffer.from(cleanedKey, 'base64').toString('utf-8')
        }
      } catch (e) {
        console.log('Não é base64, usando string original')
      }
      
      console.log('Tentando parsear JSON...')
      const credentials = JSON.parse(jsonString)
      
      console.log('Credenciais parseadas com sucesso')
      console.log('Client email:', credentials.client_email)
      console.log('Project ID:', credentials.project_id)
      
      // Garantir que private_key tem quebras de linha corretas
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
      }
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      })
      
      const drive = google.drive({ version: 'v3', auth })
      console.log('Google Drive autenticado com sucesso via variável de ambiente')
      return drive
    } catch (error) {
      console.error('Erro ao parsear GOOGLE_SERVICE_ACCOUNT_KEY:', error)
      console.error('Primeiros 200 caracteres da chave original:', serviceAccountKey.substring(0, 200))
      console.error('Últimos 50 caracteres:', serviceAccountKey.substring(serviceAccountKey.length - 50))
      
      // Tentar método alternativo com credenciais individuais
      console.log('Tentando método alternativo com variáveis separadas...')
      try {
        if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
          const auth = new google.auth.GoogleAuth({
            credentials: {
              client_email: process.env.GOOGLE_CLIENT_EMAIL,
              private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
          })
          
          const drive = google.drive({ version: 'v3', auth })
          console.log('Google Drive autenticado com sucesso via variáveis separadas')
          return drive
        }
      } catch (altError) {
        console.error('Método alternativo também falhou:', altError)
      }
      
      throw new Error(`Erro ao processar credenciais: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }
  
  console.log('GOOGLE_SERVICE_ACCOUNT_KEY não encontrada ou vazia, tentando arquivo local...')
  
  // Fallback para arquivo local (desenvolvimento)
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './service-account-key.json'
  const absolutePath = path.resolve(process.cwd(), keyPath)
  
  console.log('Procurando arquivo em:', absolutePath)
  console.log('Arquivo existe?', fs.existsSync(absolutePath))
  
  if (!fs.existsSync(absolutePath)) {
    const errorMsg = `Service account key não encontrado. 
    
Para produção (Vercel):
1. Vá para Settings > Environment Variables no Vercel
2. Adicione GOOGLE_SERVICE_ACCOUNT_KEY com o JSON completo
3. Certifique-se de que está marcado para Production
4. Faça redeploy do projeto

Para desenvolvimento local:
Coloque o arquivo service-account-key.json na raiz do projeto

Path tentado: ${absolutePath}`
    
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  console.log('Usando arquivo local para autenticação')
  const auth = new google.auth.GoogleAuth({
    keyFile: absolutePath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  const drive = google.drive({ version: 'v3', auth })
  console.log('Google Drive autenticado com sucesso via arquivo local')
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

async function parseGoogleDriveFolder(drive: any, folderId: string, importId?: string): Promise<CourseStructure> {
  const structure: CourseStructure = { modules: [] }
  
  // Atualizar progresso se importId fornecido
  const updateProgress = (progress: any) => {
    if (importId) {
      const progressStore = getProgressStore()
      if (progressStore) {
        progressStore.set(importId, progress)
      }
    }
  }

  try {
    // Listar todos os arquivos e pastas dentro da pasta principal
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'name'
    })

    const items = response.data.files || []
    console.log(`Encontrados ${items.length} módulos na pasta principal`)
    
    // Contar total de itens para progresso
    let totalModules = items.filter((i: any) => i.mimeType === 'application/vnd.google-apps.folder').length
    let processedModules = 0
    let totalSubjects = 0
    let processedSubjects = 0
    let totalLessons = 0
    let processedLessons = 0
    
    // Processar módulos (pastas de primeiro nível)
    for (let moduleIndex = 0; moduleIndex < items.length; moduleIndex++) {
      const item = items[moduleIndex]
      
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const module = {
          name: item.name,
          order: moduleIndex + 1,
          subjects: [] as any[]
        }
        
        // Atualizar progresso
        updateProgress({
          currentStep: 'Processando módulos',
          totalModules,
          processedModules,
          totalSubjects,
          processedSubjects,
          totalLessons,
          processedLessons,
          currentItem: module.name,
          errors: []
        })

        // Listar disciplinas dentro do módulo
        const subjectsResponse = await drive.files.list({
          q: `'${item.id}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType)',
          orderBy: 'name'
        })

        const subjects = subjectsResponse.data.files || []
        console.log(`  Módulo '${module.name}': ${subjects.length} disciplinas encontradas`)
        totalSubjects += subjects.filter((s: any) => s.mimeType === 'application/vnd.google-apps.folder').length

        for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex++) {
          const subjectItem = subjects[subjectIndex]
          
          if (subjectItem.mimeType === 'application/vnd.google-apps.folder') {
            const subject = {
              name: subjectItem.name,
              order: subjectIndex + 1,
              lessons: [] as any[]
            }
            
            // Atualizar progresso
            updateProgress({
              currentStep: 'Processando disciplinas',
              totalModules,
              processedModules,
              totalSubjects,
              processedSubjects,
              totalLessons,
              processedLessons,
              currentItem: subject.name,
              errors: []
            })

            // Listar aulas dentro da disciplina
            const lessonsResponse = await drive.files.list({
              q: `'${subjectItem.id}' in parents and trashed = false`,
              fields: 'files(id, name, mimeType)',
              orderBy: 'name'
            })

            const lessons = lessonsResponse.data.files || []
            console.log(`    Disciplina '${subject.name}': ${lessons.length} arquivos/pastas encontrados`)
            totalLessons += lessons.filter((l: any) => l.mimeType !== 'application/vnd.google-apps.folder').length

            let actualLessonIndex = 0
            for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
              const lessonItem = lessons[lessonIndex]
              
              // Ignorar pastas - apenas processar arquivos
              if (lessonItem.mimeType === 'application/vnd.google-apps.folder') {
                console.log(`      Ignorando pasta: ${lessonItem.name}`)
                // TODO: Poderia processar subpastas recursivamente se necessário
                continue
              }
              
              console.log(`      Processando arquivo: ${lessonItem.name} (${lessonItem.mimeType})`)
              
              // Determinar tipo de conteúdo baseado no mimeType
              let contentType = 'text'
              if (lessonItem.mimeType.includes('video') || lessonItem.mimeType.includes('mp4') || lessonItem.mimeType.includes('avi') || lessonItem.mimeType.includes('mov')) {
                contentType = 'video'
              } else if (lessonItem.mimeType.includes('audio') || lessonItem.mimeType.includes('mp3') || lessonItem.mimeType.includes('wav') || lessonItem.mimeType.includes('m4a')) {
                contentType = 'audio'
              } else if (lessonItem.mimeType.includes('pdf')) {
                contentType = 'pdf'
              } else if (lessonItem.mimeType.includes('presentation') || lessonItem.mimeType.includes('powerpoint') || lessonItem.mimeType.includes('slide')) {
                contentType = 'slides'
              } else if (lessonItem.mimeType.includes('spreadsheet') || lessonItem.mimeType.includes('excel') || lessonItem.mimeType.includes('sheet')) {
                contentType = 'spreadsheet'
              } else if (lessonItem.mimeType.includes('image') || lessonItem.mimeType.includes('png') || lessonItem.mimeType.includes('jpg') || lessonItem.mimeType.includes('jpeg')) {
                contentType = 'image'
              } else if (lessonItem.mimeType.includes('zip') || lessonItem.mimeType.includes('rar') || lessonItem.mimeType.includes('compressed')) {
                contentType = 'archive'
              }
              
              // Gerar link do Google Drive para o arquivo
              const driveLink = `https://drive.google.com/file/d/${lessonItem.id}/view`
              
              // Lista expandida de extensões de arquivo
              const fileExtensions = /\.(docx?|pdf|txt|pptx?|xlsx?|mp4|mp3|m4a|wav|avi|mov|zip|rar|png|jpg|jpeg|gif|svg|html?|css|js|json|xml|csv|odt|ods|odp)$/i
              
              // Extrair código e nome da aula (formato: "AULA01-Nome da Aula" ou "A01-Nome")
              const lessonFileName = lessonItem.name.replace(fileExtensions, '')
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
              processedLessons++
              
              // Atualizar progresso
              updateProgress({
                currentStep: 'Processando aulas',
                totalModules,
                processedModules,
                totalSubjects,
                processedSubjects,
                totalLessons,
                processedLessons,
                currentItem: lesson.name,
                errors: []
              })
            }
            
            console.log(`    Total de aulas processadas para '${subject.name}': ${subject.lessons.length}`)

            module.subjects.push(subject)
            processedSubjects++
          }
        }

        structure.modules.push(module)
        processedModules++
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

    // Gerar ID único para esta importação
    const importId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Processar estrutura da pasta
    const structure = await parseGoogleDriveFolder(drive, folderId, importId)

    if (structure.modules.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum módulo encontrado na pasta especificada' },
        { status: 400 }
      )
    }

    // Importar para o banco de dados
    const results = await importToDatabase(structure, courseId, supabase)

    // Atualizar progresso final
    const progressStore = getProgressStore()
    if (progressStore) {
      progressStore.set(importId, {
        currentStep: 'Importação concluída',
        totalModules: results.modules,
        processedModules: results.modules,
        totalSubjects: results.subjects,
        processedSubjects: results.subjects,
        totalLessons: results.lessons,
        processedLessons: results.lessons,
        currentItem: '',
        errors: results.errors,
        completed: true
      })
    }
    
    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${results.modules} módulos, ${results.subjects} disciplinas e ${results.lessons} aulas importados`,
      modulesImported: results.modules,
      subjectsImported: results.subjects,
      lessonsImported: results.lessons,
      errors: results.errors,
      structure,
      importId
    })

  } catch (error: any) {
    console.error('Erro na importação:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar importação do Google Drive' },
      { status: 500 }
    )
  }
}