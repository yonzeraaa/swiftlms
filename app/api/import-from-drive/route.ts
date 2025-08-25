import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import path from 'path'
import fs from 'fs'

// Função para atualizar progresso no Supabase
async function updateImportProgress(supabase: any, importId: string, userId: string, courseId: string, progress: any) {
  try {
    // Primeiro verificar se existe
    const { data: existing } = await supabase
      .from('import_progress')
      .select('id')
      .eq('id', importId)
      .single()
    
    if (existing) {
      // Se existe, fazer update
      const { data, error } = await supabase
        .from('import_progress')
        .update({
          ...progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', importId)
        .select()
        .single()
      
      if (error) {
        console.error('[PROGRESS] Erro ao atualizar progresso:', error)
      } else {
        console.log('[PROGRESS] Progresso atualizado com sucesso:', {
          percentage: progress.percentage,
          processed: `${progress.processed_modules}/${progress.total_modules} módulos, ${progress.processed_subjects}/${progress.total_subjects} disciplinas, ${progress.processed_lessons}/${progress.total_lessons} aulas`
        })
      }
    } else {
      // Se não existe, criar
      const { data, error } = await supabase
        .from('import_progress')
        .insert({
          id: importId,
          user_id: userId,
          course_id: courseId,
          ...progress,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('[PROGRESS] Erro ao criar progresso:', error)
      } else {
        console.log('[PROGRESS] Progresso criado com sucesso')
      }
    }
    
    // Adicionar pequeno delay para garantir que a UI possa atualizar
    await new Promise(resolve => setTimeout(resolve, 50))
  } catch (err) {
    console.error('[PROGRESS] Erro ao salvar progresso:', err)
  }
}

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
        questions?: any[]
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

// Função para contar todos os itens antes de processar
async function countDriveFolderItems(drive: any, folderId: string): Promise<{totalModules: number, totalSubjects: number, totalLessons: number}> {
  let totalModules = 0
  let totalSubjects = 0
  let totalLessons = 0
  
  try {
    // Listar módulos (pastas de primeiro nível)
    const modulesResponse = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
      pageSize: 1000
    })
    
    const modules = modulesResponse.data.files || []
    totalModules = modules.length
    console.log(`Contando: ${totalModules} módulos encontrados`)
    
    // Para cada módulo, contar disciplinas
    for (const module of modules) {
      const subjectsResponse = await drive.files.list({
        q: `'${module.id}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
        pageSize: 1000
      })
      
      const subjects = subjectsResponse.data.files || []
      totalSubjects += subjects.length
      console.log(`  Módulo '${module.name}': ${subjects.length} disciplinas`)
      
      // Para cada disciplina, contar aulas (TODOS os arquivos, não apenas alguns tipos)
      for (const subject of subjects) {
        const lessonsResponse = await drive.files.list({
          q: `'${subject.id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
          fields: 'files(id, name, mimeType)',
          pageSize: 1000
        })
        
        const lessons = lessonsResponse.data.files || []
        totalLessons += lessons.length
        console.log(`    Disciplina '${subject.name}': ${lessons.length} aulas`)
        
        // Log dos tipos de arquivo encontrados para debug
        const mimeTypes = lessons.reduce((acc: any, lesson: any) => {
          acc[lesson.mimeType] = (acc[lesson.mimeType] || 0) + 1
          return acc
        }, {})
        if (Object.keys(mimeTypes).length > 0) {
          console.log(`      Tipos de arquivo:`, mimeTypes)
        }
      }
    }
    
    console.log(`\nTotal contabilizado: ${totalModules} módulos, ${totalSubjects} disciplinas, ${totalLessons} aulas`)
    return { totalModules, totalSubjects, totalLessons }
  } catch (error) {
    console.error('Erro ao contar itens:', error)
    throw error
  }
}

async function parseGoogleDriveFolder(drive: any, folderId: string, importId?: string, totals?: {totalModules: number, totalSubjects: number, totalLessons: number}, supabase?: any, userId?: string, courseId?: string): Promise<CourseStructure> {
  const structure: CourseStructure = { modules: [] }
  
  // Usar totais pré-calculados se fornecidos, senão inicializar com zero
  let totalModules = totals?.totalModules || 0
  let totalSubjects = totals?.totalSubjects || 0  
  let totalLessons = totals?.totalLessons || 0
  let processedModules = 0
  let processedSubjects = 0
  let processedLessons = 0
  
  // Atualizar progresso se importId fornecido
  const updateProgress = async (progress: any) => {
    if (importId && supabase && userId && courseId) {
      // Garantir que processed_lessons seja usado corretamente
      const processedLessonsValue = progress.processed_lessons !== undefined ? progress.processed_lessons : processedLessons
      const fullProgress = {
        ...progress,
        processed_lessons: processedLessonsValue,
        percentage: totalModules + totalSubjects + totalLessons > 0 
          ? Math.round(((processedModules + processedSubjects + processedLessonsValue) / (totalModules + totalSubjects + totalLessons)) * 100)
          : 0
      }
      console.log(`[PROGRESS] Atualizando progresso:`, fullProgress)
      await updateImportProgress(supabase, importId, userId, courseId, fullProgress)
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
    console.log(`Processando ${items.length} itens na pasta principal`)
    
    // Se não temos totais pré-calculados, contar agora (fallback)
    if (!totals) {
      console.log('Aviso: Totais não fornecidos, contando durante processamento...')
      totalModules = items.filter((i: any) => i.mimeType === 'application/vnd.google-apps.folder').length
    }
    
    // Atualizar progresso inicial
    await updateProgress({
      phase: 'processing',
      current_step: 'Iniciando processamento',
      total_modules: totalModules,
      processed_modules: processedModules,
      total_subjects: totalSubjects,
      processed_subjects: processedSubjects,
      total_lessons: totalLessons,
      processed_lessons: processedLessons,
      current_item: 'Preparando importação...',
      errors: []
    })
    
    // Processar módulos (pastas de primeiro nível)
    for (let moduleIndex = 0; moduleIndex < items.length; moduleIndex++) {
      const item = items[moduleIndex]
      
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const module = {
          name: item.name,
          order: moduleIndex + 1,
          subjects: [] as any[]
        }
        
        // Atualizar progresso ANTES de processar o módulo
        await updateProgress({
          current_step: `Processando módulo ${processedModules + 1}/${totalModules}`,
          total_modules: totalModules,
          processed_modules: processedModules,
          total_subjects: totalSubjects,
          processed_subjects: processedSubjects,
          total_lessons: totalLessons,
          processed_lessons: processedLessons,
          current_item: `Módulo: ${module.name}`,
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

        for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex++) {
          const subjectItem = subjects[subjectIndex]
          
          if (subjectItem.mimeType === 'application/vnd.google-apps.folder') {
            const subject = {
              name: subjectItem.name,
              order: subjectIndex + 1,
              lessons: [] as any[]
            }
            
            // Atualizar progresso ANTES de processar a disciplina
            await updateProgress({
              current_step: `Processando disciplina ${processedSubjects + 1}/${totalSubjects}`,
              total_modules: totalModules,
              processed_modules: processedModules,
              total_subjects: totalSubjects,
              processed_subjects: processedSubjects,
              total_lessons: totalLessons,
              processed_lessons: processedLessons,
              current_item: `Disciplina: ${subject.name}`,
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
              
              // Atualizar progresso ANTES de processar a aula
              await updateProgress({
                current_step: `Processando aula ${processedLessons + 1}/${totalLessons}`,
                total_modules: totalModules,
                processed_modules: processedModules,
                total_subjects: totalSubjects,
                processed_subjects: processedSubjects,
                total_lessons: totalLessons,
                processed_lessons: processedLessons,
                current_item: `Aula: ${lessonItem.name}`,
                errors: []
              })
              
              // Determinar tipo de conteúdo baseado no mimeType e nome do arquivo
              // IMPORTANTE: O banco só aceita 'video', 'text', 'quiz' ou 'assignment'
              let contentType = 'text' // Padrão para a maioria dos arquivos
              const mimeType = lessonItem.mimeType.toLowerCase()
              const fileName = lessonItem.name.toLowerCase()
              
              // Detectar testes/quizzes pelo nome do arquivo
              const isTest = fileName.includes('teste') || 
                            fileName.includes('test') || 
                            fileName.includes('quiz') || 
                            fileName.includes('prova') || 
                            fileName.includes('avaliação') || 
                            fileName.includes('avaliacao') || 
                            fileName.includes('simulado') || 
                            fileName.includes('exercício') || 
                            fileName.includes('exercicio') || 
                            fileName.includes('questões') || 
                            fileName.includes('questoes') || 
                            fileName.includes('multipla escolha') || 
                            fileName.includes('verdadeiro falso') || 
                            fileName.includes('v ou f')
              
              if (isTest) {
                contentType = 'quiz'
                console.log(`        ✓ Detectado como TESTE/QUIZ: ${lessonItem.name}`)
              }
              // Arquivos de vídeo
              else if (mimeType.includes('video') || 
                  mimeType === 'video/mp4' || 
                  mimeType === 'video/mpeg' || 
                  mimeType === 'video/quicktime' || 
                  mimeType === 'video/x-msvideo' ||
                  mimeType === 'application/vnd.google-apps.video') {
                contentType = 'video'
              }
              // Todos os outros tipos serão tratados como 'text'
              // Isso inclui: PDFs, áudio, apresentações, planilhas, imagens, etc.
              
              console.log(`        Tipo detectado: ${contentType} para ${lessonItem.name} (${mimeType})`)
              
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
              
              const lesson: any = {
                name: lessonName,
                code: lessonCode,
                order: actualLessonIndex + 1,
                content: undefined as string | undefined,
                contentType: contentType,
                contentUrl: driveLink,
                description: `Aula ${lessonCode}: ${lessonName}`,
                // Se for quiz, marcar para processar questões depois
                needsQuestionProcessing: contentType === 'quiz',
                questions: undefined as any[] | undefined
              }
              actualLessonIndex++

              // Atualizar progresso para indicar download de conteúdo
              await updateProgress({
                current_step: `Baixando conteúdo da aula ${processedLessons + 1}/${totalLessons}`,
                total_modules: totalModules,
                processed_modules: processedModules,
                total_subjects: totalSubjects,
                processed_subjects: processedSubjects,
                total_lessons: totalLessons,
                processed_lessons: processedLessons,
                current_item: `Baixando: ${lessonItem.name}`,
                errors: []
              })
              
              // Tentar obter o conteúdo baseado no tipo do arquivo
              try {
                if (lessonItem.mimeType === 'application/vnd.google-apps.document') {
                  // Google Docs
                  const content = await drive.files.export({
                    fileId: lessonItem.id,
                    mimeType: 'text/plain'
                  })
                  lesson.content = content.data as string
                  
                  // Se for quiz, processar questões do conteúdo
                  if (contentType === 'quiz' && lesson.content) {
                    console.log(`        Processando questões do teste: ${lessonItem.name}`)
                    lesson.questions = await extractQuestionsFromContent(lesson.content)
                    console.log(`        Questões encontradas: ${lesson.questions?.length || 0}`)
                  }
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
              
              // Atualizar progresso APÓS processar a aula
              await updateProgress({
                current_step: `Aula ${processedLessons}/${totalLessons} processada`,
                total_modules: totalModules,
                processed_modules: processedModules,
                total_subjects: totalSubjects,
                processed_subjects: processedSubjects,
                total_lessons: totalLessons,
                processed_lessons: processedLessons,
                current_item: `Concluído: ${lesson.name}`,
                phase: 'processing',
                errors: []
              })
            }
            
            console.log(`    Total de aulas processadas para '${subject.name}': ${subject.lessons.length}`)

            module.subjects.push(subject)
            processedSubjects++
            
            // Atualizar progresso após processar disciplina
            await updateProgress({
              current_step: `Disciplina ${processedSubjects}/${totalSubjects} processada`,
              total_modules: totalModules,
              processed_modules: processedModules,
              total_subjects: totalSubjects,
              processed_subjects: processedSubjects,
              total_lessons: totalLessons,
              processed_lessons: processedLessons,
              current_item: `Concluído: ${subject.name}`,
              phase: 'processing',
              errors: []
            })
          }
        }

        structure.modules.push(module)
        processedModules++
        
        // Atualizar progresso após processar módulo
        await updateProgress({
          current_step: `Módulo ${processedModules}/${totalModules} processado`,
          total_modules: totalModules,
          processed_modules: processedModules,
          total_subjects: totalSubjects,
          processed_subjects: processedSubjects,
          total_lessons: totalLessons,
          processed_lessons: processedLessons,
          current_item: `Concluído: ${module.name}`,
          phase: 'processing',
          errors: []
        })
      }
    }

    return structure
  } catch (error) {
    console.error('Erro ao processar pasta do Google Drive:', error)
    throw error
  }
}

// Função para extrair questões de um conteúdo de texto
async function extractQuestionsFromContent(content: string): Promise<any[]> {
  const questions = []
  const lines = content.split('\n')
  
  let currentQuestion: any = null
  let questionNumber = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Detectar início de nova questão (formato: "1." ou "Questão 1" ou "Q1")
    const questionMatch = line.match(/^(\d+[\.)\s]|Questão\s+\d+|Q\d+)/i)
    
    if (questionMatch) {
      // Salvar questão anterior se existir
      if (currentQuestion && currentQuestion.question) {
        questions.push(currentQuestion)
      }
      
      questionNumber++
      
      // Extrair o texto da questão
      const questionText = line.replace(questionMatch[0], '').trim()
      
      // Detectar tipo de questão
      let questionType = 'multiple_choice' // padrão
      
      if (line.toLowerCase().includes('verdadeiro') || 
          line.toLowerCase().includes('falso') || 
          line.toLowerCase().includes('v ou f')) {
        questionType = 'true_false'
      }
      
      currentQuestion = {
        question: questionText,
        type: questionType,
        options: [],
        correct_answer: null,
        points: 1,
        order: questionNumber
      }
    }
    // Detectar opções de resposta (formato: "a)" ou "A." ou "(a)")
    else if (currentQuestion && line.match(/^[a-e][\.)\s\)]|^\([a-e]\)/i)) {
      const optionText = line.replace(/^[a-e][\.)\s\)]|^\([a-e]\)/i, '').trim()
      
      // Verificar se é a resposta correta (marcada com * ou CORRETA ou similar)
      const isCorrect = line.includes('*') || 
                       line.toLowerCase().includes('correta') || 
                       line.toLowerCase().includes('correct') ||
                       line.toLowerCase().includes('✓')
      
      currentQuestion.options.push(optionText.replace(/[*✓]|\(correta\)|\(correct\)/gi, '').trim())
      
      if (isCorrect) {
        currentQuestion.correct_answer = currentQuestion.options.length - 1
      }
    }
    // Detectar resposta para questões verdadeiro/falso
    else if (currentQuestion && currentQuestion.type === 'true_false') {
      if (line.toLowerCase().includes('resposta:') || 
          line.toLowerCase().includes('gabarito:')) {
        if (line.toLowerCase().includes('verdadeiro') || line.toLowerCase().includes('v')) {
          currentQuestion.correct_answer = true
        } else if (line.toLowerCase().includes('falso') || line.toLowerCase().includes('f')) {
          currentQuestion.correct_answer = false
        }
      }
    }
  }
  
  // Adicionar última questão se existir
  if (currentQuestion && currentQuestion.question) {
    questions.push(currentQuestion)
  }
  
  return questions
}

async function importToDatabase(structure: CourseStructure, courseId: string, supabase: any, importId?: string, userId?: string, user?: any) {
  const results = {
    modules: 0,
    subjects: 0,
    lessons: 0,
    errors: [] as string[]
  }

  // Função para atualizar progresso durante importação
  const updateDatabaseProgress = async (step: string, item: string) => {
    if (importId && supabase && userId) {
      await updateImportProgress(supabase, importId, userId, courseId, {
        current_step: step,
        current_item: item
      })
    }
  }
  
  try {
    updateDatabaseProgress('Salvando no banco de dados', 'Preparando importação...')
    
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
      
      updateDatabaseProgress(
        `Salvando módulo ${moduleIdx + 1}/${structure.modules.length}`,
        `Módulo: ${moduleData.name}`
      )
      
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
        
        updateDatabaseProgress(
          `Salvando disciplina ${subjectIdx + 1}/${moduleData.subjects.length} do módulo ${moduleIdx + 1}`,
          `Disciplina: ${subjectData.name}`
        )
        
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

        // Buscar o maior order_index existente para aulas neste módulo
        const { data: existingLessons } = await supabase
          .from('lessons')
          .select('order_index')
          .eq('module_id', module.id)
          .order('order_index', { ascending: false })
          .limit(1)
        
        const startLessonIndex = existingLessons && existingLessons.length > 0 
          ? (existingLessons[0].order_index + 1) 
          : 0
        
        // Importar aulas da disciplina
        for (let lessonIdx = 0; lessonIdx < subjectData.lessons.length; lessonIdx++) {
          const lessonData = subjectData.lessons[lessonIdx]
          
          await updateDatabaseProgress(
            `Salvando aula ${lessonIdx + 1}/${subjectData.lessons.length}`,
            `Aula: ${lessonData.name}`
          )
          
          // Criar título completo com código
          const fullTitle = lessonData.code ? `${lessonData.code} - ${lessonData.name}` : lessonData.name
          
          // Verificar se a aula já existe
          const { data: existingLesson } = await supabase
            .from('lessons')
            .select('id')
            .eq('module_id', module.id)
            .eq('title', fullTitle)
            .single()
          
          if (existingLesson) {
            console.log(`Aula já existe: ${fullTitle}, pulando...`)
            continue
          }
          
          // Criar a aula na tabela lessons com order_index único
          const { data: newLesson, error: lessonError } = await supabase
            .from('lessons')
            .insert({
              title: fullTitle,
              description: lessonData.description || `Aula importada do Google Drive`,
              content: lessonData.content || '',
              content_type: lessonData.contentType || 'text',
              content_url: lessonData.contentUrl || null,
              order_index: startLessonIndex + lessonIdx,
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
            
            // Se for quiz e tem questões, salvar no banco de questões
            if (lessonData.contentType === 'quiz' && lessonData.questions && lessonData.questions.length > 0) {
              console.log(`Salvando ${lessonData.questions.length} questões para a aula ${lessonData.name}`)
              
              for (const questionData of lessonData.questions) {
                try {
                  // Criar a questão no banco
                  const { data: question, error: questionError } = await supabase
                    .from('questions')
                    .insert({
                      question: questionData.question,
                      type: questionData.type,
                      options: questionData.options || [],
                      correct_answer: questionData.correct_answer,
                      points: questionData.points || 1,
                      difficulty: 'medium', // Padrão
                      subject_id: subjectId,
                      created_by: user?.id,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                    .select()
                    .single()
                  
                  if (questionError) {
                    console.error(`Erro ao criar questão: ${questionError.message}`)
                    results.errors.push(`Erro ao criar questão para ${lessonData.name}: ${questionError.message}`)
                  } else {
                    console.log(`Questão criada com sucesso: ${question.id}`)
                    
                    // Criar teste se ainda não existir
                    const { data: existingTest } = await supabase
                      .from('tests')
                      .select('id')
                      .eq('lesson_id', newLesson.id)
                      .single()
                    
                    let testId = existingTest?.id
                    
                    if (!testId) {
                      const { data: newTest, error: testError } = await supabase
                        .from('tests')
                        .insert({
                          title: `Teste - ${fullTitle}`,
                          description: `Teste da aula ${lessonData.name}`,
                          lesson_id: newLesson.id,
                          duration: 60, // 60 minutos padrão
                          passing_score: 70, // 70% padrão
                          max_attempts: 3,
                          is_active: true,
                          created_by: user?.id,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        })
                        .select()
                        .single()
                      
                      if (testError) {
                        console.error(`Erro ao criar teste: ${testError.message}`)
                        results.errors.push(`Erro ao criar teste para ${lessonData.name}: ${testError.message}`)
                      } else {
                        testId = newTest.id
                      }
                    }
                    
                    // Associar questão ao teste
                    if (testId && question) {
                      const { error: testQuestionError } = await supabase
                        .from('test_questions')
                        .insert({
                          test_id: testId,
                          question_id: question.id,
                          order_index: questionData.order || 0,
                          points: questionData.points || 1
                        })
                      
                      if (testQuestionError) {
                        console.error(`Erro ao associar questão ao teste: ${testQuestionError.message}`)
                      }
                    }
                  }
                } catch (err) {
                  console.error('Erro ao processar questão:', err)
                  results.errors.push(`Erro ao processar questão: ${err}`)
                }
              }
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
  let importId: string | undefined
  
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
    importId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Inicializar progresso no Supabase
    await updateImportProgress(supabase, importId, user.id, courseId, {
      phase: 'counting',
      current_step: 'Contando arquivos...',
      total_modules: 0,
      processed_modules: 0,
      total_subjects: 0,
      processed_subjects: 0,
      total_lessons: 0,
      processed_lessons: 0,
      current_item: 'Analisando estrutura do Google Drive',
      percentage: 0,
      errors: []
    })
    
    console.log(`[IMPORT] Iniciando importação com ID: ${importId}`)
    
    // FASE 1: Contar todos os itens primeiro
    console.log('\n=== FASE 1: Contando itens ===')
    const totals = await countDriveFolderItems(drive, folderId)
    
    // Atualizar progresso com totais
    await updateImportProgress(supabase, importId, user.id, courseId, {
      phase: 'processing',
      current_step: 'Iniciando processamento',
      total_modules: totals.totalModules,
      processed_modules: 0,
      total_subjects: totals.totalSubjects,
      processed_subjects: 0,
      total_lessons: totals.totalLessons,
      processed_lessons: 0,
      current_item: 'Preparando para processar arquivos',
      percentage: 0,
      errors: []
    })
    
    // FASE 2: Processar estrutura da pasta
    console.log('\n=== FASE 2: Processando conteúdo ===')
    const structure = await parseGoogleDriveFolder(drive, folderId, importId, totals, supabase, user.id, courseId)

    if (structure.modules.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum módulo encontrado na pasta especificada' },
        { status: 400 }
      )
    }

    // Importar para o banco de dados
    const results = await importToDatabase(structure, courseId, supabase, importId, user.id, user)

    // Atualizar progresso final
    await updateImportProgress(supabase, importId, user.id, courseId, {
      current_step: 'Importação concluída',
      total_modules: results.modules,
      processed_modules: results.modules,
      total_subjects: results.subjects,
      processed_subjects: results.subjects,
      total_lessons: results.lessons,
      processed_lessons: results.lessons,
      current_item: '',
      errors: results.errors,
      completed: true,
      percentage: 100
    })
    
    // Retornar importId e resultados
    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${results.modules} módulos, ${results.subjects} disciplinas e ${results.lessons} aulas importados`,
      importId,
      modulesImported: results.modules,
      subjectsImported: results.subjects,
      lessonsImported: results.lessons,
      errors: results.errors,
      structure
    })

  } catch (error: any) {
    console.error('Erro na importação:', error)
    
    // Atualizar progresso com erro
    if (importId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await updateImportProgress(supabase, importId, user.id, '', {
          current_step: 'Erro na importação',
          total_modules: 0,
          processed_modules: 0,
          total_subjects: 0,
          processed_subjects: 0,
          total_lessons: 0,
          processed_lessons: 0,
          current_item: error.message || 'Erro desconhecido',
          errors: [error.message || 'Erro ao processar importação'],
          completed: true,
          percentage: 0
        })
      }
    }
    
    return NextResponse.json(
      { error: error.message || 'Erro ao processar importação do Google Drive' },
      { status: 500 }
    )
  }
}