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
  console.log('[GOOGLE_AUTH] Iniciando autenticação Google Drive...')
  console.log('[GOOGLE_AUTH] Ambiente:', process.env.NODE_ENV)
  console.log('[GOOGLE_AUTH] GOOGLE_SERVICE_ACCOUNT_KEY existe?', !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  console.log('[GOOGLE_AUTH] Tamanho da chave:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0)
  
  // Primeiro tentar usar as credenciais do ambiente (para produção)
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  
  if (serviceAccountKey && serviceAccountKey.trim() !== '') {
    console.log('[GOOGLE_AUTH] Tentando usar GOOGLE_SERVICE_ACCOUNT_KEY do ambiente...')
    console.log('[GOOGLE_AUTH] Tipo da variável:', typeof serviceAccountKey)
    console.log('[GOOGLE_AUTH] Primeiros 50 caracteres:', serviceAccountKey.substring(0, 50))
    
    // Se a chave estiver disponível como variável de ambiente (JSON string)
    try {
      // Limpar possíveis problemas de formatação
      let cleanedKey = serviceAccountKey.trim()
      
      // Se começar e terminar com aspas simples ou duplas, remover
      if ((cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) || 
          (cleanedKey.startsWith("'") && cleanedKey.endsWith("'"))) {
        cleanedKey = cleanedKey.slice(1, -1)
        console.log('[GOOGLE_AUTH] Removidas aspas da chave')
      }
      
      // Tentar decodificar se estiver em base64
      let jsonString = cleanedKey
      try {
        // Verificar se é base64 (não contém caracteres JSON típicos)
        if (!jsonString.includes('{') && !jsonString.includes('}')) {
          console.log('[GOOGLE_AUTH] Detectado formato base64, decodificando...')
          jsonString = Buffer.from(cleanedKey, 'base64').toString('utf-8')
          console.log('[GOOGLE_AUTH] Decodificação base64 bem-sucedida')
        } else {
          console.log('[GOOGLE_AUTH] Formato JSON direto detectado')
        }
      } catch (decodeError) {
        console.log('[GOOGLE_AUTH] Falha na decodificação base64, usando string original:', decodeError)
      }
      
      // Verificar se a string JSON tem conteúdo válido antes do parse
      if (!jsonString.trim() || jsonString.trim().length < 10) {
        throw new Error('String JSON vazia ou muito curta após processamento')
      }
      
      // Verificar se parece com JSON válido
      if (!jsonString.trim().startsWith('{') || !jsonString.trim().endsWith('}')) {
        throw new Error('String não parece ser JSON válido (não começa com { ou não termina com })')
      }
      
      console.log('[GOOGLE_AUTH] Tentando parsear JSON...')
      console.log('[GOOGLE_AUTH] Primeiros 100 caracteres do JSON:', jsonString.substring(0, 100))
      
      let credentials
      try {
        credentials = JSON.parse(jsonString)
      } catch (parseError) {
        console.error('[GOOGLE_AUTH] ERRO JSON.parse:', parseError)
        console.error('[GOOGLE_AUTH] String que falhou no parse (primeiros 500 chars):', jsonString.substring(0, 500))
        console.error('[GOOGLE_AUTH] String que falhou no parse (últimos 100 chars):', jsonString.substring(jsonString.length - 100))
        throw new Error(`Falha ao fazer parse do JSON das credenciais: ${parseError instanceof Error ? parseError.message : 'Erro desconhecido'}`)
      }
      
      // Validar campos obrigatórios
      if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
        console.error('[GOOGLE_AUTH] Campos obrigatórios ausentes:', {
          hasClientEmail: !!credentials.client_email,
          hasPrivateKey: !!credentials.private_key,
          hasProjectId: !!credentials.project_id
        })
        throw new Error('Credenciais incompletas: campos obrigatórios ausentes')
      }
      
      console.log('[GOOGLE_AUTH] Credenciais parseadas com sucesso')
      console.log('[GOOGLE_AUTH] Client email:', credentials.client_email)
      console.log('[GOOGLE_AUTH] Project ID:', credentials.project_id)
      console.log('[GOOGLE_AUTH] Private key length:', credentials.private_key?.length)
      
      // Garantir que private_key tem quebras de linha corretas
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
      }
      
      console.log('[GOOGLE_AUTH] Criando GoogleAuth...')
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      })
      
      console.log('[GOOGLE_AUTH] Criando instância do Google Drive...')
      const drive = google.drive({ version: 'v3', auth })
      console.log('[GOOGLE_AUTH] Google Drive autenticado com sucesso via variável de ambiente')
      
      // Testar a conexão fazendo uma chamada simples
      try {
        console.log('[GOOGLE_AUTH] Testando conexão com o Google Drive...')
        await drive.files.list({ pageSize: 1 })
        console.log('[GOOGLE_AUTH] Teste de conexão bem-sucedido')
      } catch (testError) {
        console.error('[GOOGLE_AUTH] Falha no teste de conexão:', testError)
        throw new Error(`Autenticação criada mas conexão falhou: ${testError instanceof Error ? testError.message : 'Erro desconhecido'}`)
      }
      
      return drive
    } catch (error) {
      console.error('[GOOGLE_AUTH] Erro ao processar GOOGLE_SERVICE_ACCOUNT_KEY:', error)
      console.error('[GOOGLE_AUTH] Primeiros 200 caracteres da chave original:', serviceAccountKey.substring(0, 200))
      console.error('[GOOGLE_AUTH] Últimos 50 caracteres da chave original:', serviceAccountKey.substring(serviceAccountKey.length - 50))
      
      // Tentar método alternativo com credenciais individuais
      console.log('[GOOGLE_AUTH] Tentando método alternativo com variáveis separadas...')
      try {
        if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
          console.log('[GOOGLE_AUTH] Variáveis separadas encontradas')
          const auth = new google.auth.GoogleAuth({
            credentials: {
              client_email: process.env.GOOGLE_CLIENT_EMAIL,
              private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
          })
          
          const drive = google.drive({ version: 'v3', auth })
          console.log('[GOOGLE_AUTH] Google Drive autenticado com sucesso via variáveis separadas')
          return drive
        } else {
          console.log('[GOOGLE_AUTH] Variáveis separadas não encontradas')
        }
      } catch (altError) {
        console.error('[GOOGLE_AUTH] Método alternativo também falhou:', altError)
      }
      
      throw new Error(`Erro ao processar credenciais do Google Drive: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Verifique a configuração da variável GOOGLE_SERVICE_ACCOUNT_KEY.`)
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
    
    const modulesList = modulesResponse.data.files || []
    totalModules = modulesList.length
    console.log(`Contando: ${totalModules} módulos encontrados`)
    
    // Para cada módulo, contar disciplinas
    for (const moduleItem of modulesList) {
      const subjectsResponse = await drive.files.list({
        q: `'${moduleItem.id}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
        pageSize: 1000
      })
      
      const subjects = subjectsResponse.data.files || []
      totalSubjects += subjects.length
      console.log(`  Módulo '${moduleItem.name}': ${subjects.length} disciplinas`)
      
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
        const courseModule = {
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
          current_item: `Módulo: ${courseModule.name}`,
          errors: []
        })

        // Listar disciplinas dentro do módulo
        const subjectsResponse = await drive.files.list({
          q: `'${item.id}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType)',
          orderBy: 'name'
        })

        const subjects = subjectsResponse.data.files || []
        console.log(`  Módulo '${courseModule.name}': ${subjects.length} disciplinas encontradas`)

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

            // Processamento em lotes para evitar timeout
            const BATCH_SIZE = 5 // Processar 5 aulas por vez
            const DELAY_BETWEEN_BATCHES = 100 // 100ms de delay entre lotes
            
            let actualLessonIndex = 0
            const validLessons = lessons.filter((item: any) => item.mimeType !== 'application/vnd.google-apps.folder')
            
            // Processar aulas em lotes
            for (let batchStart = 0; batchStart < validLessons.length; batchStart += BATCH_SIZE) {
              const batch = validLessons.slice(batchStart, Math.min(batchStart + BATCH_SIZE, validLessons.length))
              
              console.log(`      Processando lote ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${batch.length} aulas`)
              
              // Processar aulas do lote
              for (const lessonItem of batch) {
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
                
                // Determinar tipo de conteúdo baseado no mimeType
                let contentType = 'text' // Padrão para a maioria dos arquivos
                const mimeType = lessonItem.mimeType.toLowerCase()
                
                // Arquivos de vídeo
                if (mimeType.includes('video') || 
                    mimeType === 'video/mp4' || 
                    mimeType === 'video/mpeg' || 
                    mimeType === 'video/quicktime' || 
                    mimeType === 'video/x-msvideo' ||
                    mimeType === 'application/vnd.google-apps.video') {
                  contentType = 'video'
                }
                
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
                  description: `Aula ${lessonCode}: ${lessonName}`
                }
                actualLessonIndex++

                // Download de conteúdo otimizado (apenas para tipos específicos)
                try {
                  if (lessonItem.mimeType === 'application/vnd.google-apps.document') {
                    // Google Docs - apenas arquivos pequenos
                    console.log(`        Baixando conteúdo do Google Docs: ${lessonItem.name}`)
                    const content = await drive.files.export({
                      fileId: lessonItem.id,
                      mimeType: 'text/plain'
                    })
                    lesson.content = content.data as string
                  } else if (lessonItem.mimeType === 'application/vnd.google-apps.presentation') {
                    // Google Slides - exportar como texto (resumido)
                    console.log(`        Baixando conteúdo do Google Slides: ${lessonItem.name}`)
                    const content = await drive.files.export({
                      fileId: lessonItem.id,
                      mimeType: 'text/plain'
                    })
                    lesson.content = content.data as string
                  } else {
                    // Para outros tipos, apenas registrar referência (não baixar conteúdo)
                    lesson.content = `[Arquivo referenciado: ${lessonItem.name}]`
                  }
                } catch (error) {
                  console.log(`      Erro ao baixar conteúdo de ${lessonItem.name}, usando referência apenas`)
                  lesson.content = `[Arquivo: ${lessonItem.name}]`
                }

                // Adicionar aula à lista
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
              
              // Delay pequeno entre lotes para evitar sobrecarga
              if (batchStart + BATCH_SIZE < validLessons.length) {
                console.log(`      Aguardando ${DELAY_BETWEEN_BATCHES}ms antes do próximo lote...`)
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
              }
            }
            
            console.log(`    Total de aulas processadas para '${subject.name}': ${subject.lessons.length}`)

            courseModule.subjects.push(subject)
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

        structure.modules.push(courseModule)
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
          current_item: `Concluído: ${courseModule.name}`,
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
    await updateDatabaseProgress('Salvando no banco de dados', 'Preparando importação...')
    
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
      
      await updateDatabaseProgress(
        `Salvando módulo ${moduleIdx + 1}/${structure.modules.length}`,
        `Módulo: ${moduleData.name}`
      )
      
      const { data: createdModule, error: moduleError } = await supabase
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
        
        await updateDatabaseProgress(
          `Salvando disciplina ${subjectIdx + 1}/${moduleData.subjects.length} do módulo ${moduleIdx + 1}`,
          `Disciplina: ${subjectData.name}`
        )
        
        // Extrair código da disciplina se existir (formatos: "DCA01-Nome", "DCA01 - Nome", "DCA01_Nome")
        const codeMatch = subjectData.name.match(/^([A-Z0-9]+)\s*[-_]\s*(.+)$/)
        const subjectCode = codeMatch ? codeMatch[1] : `SUB${Date.now()}${subjectIdx}`
        // Manter o nome completo da disciplina (com código) conforme solicitado
        const subjectName = subjectData.name

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
            module_id: createdModule.id,
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
          .eq('module_id', createdModule.id)
          .order('order_index', { ascending: false })
          .limit(1)
        
        const startLessonIndex = existingLessons && existingLessons.length > 0 
          ? (existingLessons[0].order_index + 1) 
          : 0
        
        // Processar todas as aulas
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
            .eq('module_id', createdModule.id)
            .eq('title', fullTitle)
            .single()
          
          if (existingLesson) {
            console.log(`Aula já existe: ${fullTitle}, pulando...`)
            continue
          }
          
          // Criar a aula na tabela lessons
          const { data: newLesson, error: lessonError } = await supabase
            .from('lessons')
            .insert({
              title: fullTitle,
              description: lessonData.description || `Aula importada do Google Drive`,
              content: lessonData.content || '',
              content_type: lessonData.contentType || 'text',
              content_url: lessonData.contentUrl || null,
              order_index: startLessonIndex + lessonIdx,
              module_id: createdModule.id
            })
            .select()
            .single()

          if (lessonError) {
            results.errors.push(`Erro ao criar aula ${lessonData.name}: ${lessonError.message}`)
            continue
          }
          
          // Associar a aula à disciplina
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
      } // Fim do loop de subjects
    } // Fim do loop de modules
    
    return results
  } catch (error) {
    console.error('Erro ao importar para o banco de dados:', error)
    throw error
  }
}

// Função para processamento assíncrono em background
async function processImportInBackground(
  driveUrl: string,
  courseId: string,
  importId: string,
  userId: string,
  folderId: string
) {
  const supabase = await createClient()
  
  try {
    console.log(`[IMPORT-BACKGROUND] Iniciando processamento em background para ${importId}`)
    
    // Autenticar com Google Drive
    console.log(`[IMPORT-BACKGROUND] Autenticando Google Drive...`)
    const drive = await authenticateGoogleDrive()
    
    // FASE 1: Contar todos os itens primeiro
    console.log(`[IMPORT-BACKGROUND] === FASE 1: Contando itens ===`)
    const totals = await countDriveFolderItems(drive, folderId)
    
    // Atualizar progresso com totais
    await updateImportProgress(supabase, importId, userId, courseId, {
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
    console.log(`[IMPORT-BACKGROUND] === FASE 2: Processando conteúdo ===`)
    const structure = await parseGoogleDriveFolder(drive, folderId, importId, totals, supabase, userId, courseId)

    if (structure.modules.length === 0) {
      await updateImportProgress(supabase, importId, userId, courseId, {
        current_step: 'Erro: Nenhum módulo encontrado',
        current_item: 'Verifique se a pasta contém a estrutura correta',
        errors: ['Nenhum módulo encontrado na pasta especificada'],
        completed: true,
        percentage: 0
      })
      return
    }

    // FASE 3: Importar para o banco de dados
    console.log(`[IMPORT-BACKGROUND] === FASE 3: Salvando no banco ===`)
    const results = await importToDatabase(structure, courseId, supabase, importId, userId)

    // Atualizar progresso final
    await updateImportProgress(supabase, importId, userId, courseId, {
      current_step: 'Importação concluída',
      total_modules: results.modules,
      processed_modules: results.modules,
      total_subjects: results.subjects,
      processed_subjects: results.subjects,
      total_lessons: results.lessons,
      processed_lessons: results.lessons,
      current_item: `${results.modules} módulos, ${results.subjects} disciplinas, ${results.lessons} aulas importados`,
      errors: results.errors,
      completed: true,
      percentage: 100
    })
    
    console.log(`[IMPORT-BACKGROUND] Importação concluída com sucesso: ${importId}`)

  } catch (error: any) {
    console.error(`[IMPORT-BACKGROUND] Erro na importação ${importId}:`, error)
    
    // Atualizar progresso com erro
    await updateImportProgress(supabase, importId, userId, courseId, {
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

    // Gerar ID único para esta importação
    const importId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`[IMPORT] Iniciando importação com ID: ${importId}`)
    
    // Inicializar progresso no Supabase
    await updateImportProgress(supabase, importId, user.id, courseId, {
      phase: 'starting',
      current_step: 'Iniciando importação...',
      total_modules: 0,
      processed_modules: 0,
      total_subjects: 0,
      processed_subjects: 0,
      total_lessons: 0,
      processed_lessons: 0,
      current_item: 'Preparando processamento em background',
      percentage: 0,
      errors: []
    })
    
    // Iniciar processamento em background (não aguardar)
    // Usar setImmediate para garantir que a resposta seja enviada primeiro
    setImmediate(() => {
      processImportInBackground(driveUrl, courseId, importId, user.id, folderId)
        .catch(error => {
          console.error(`[IMPORT] Erro no processamento em background:`, error)
        })
    })
    
    // Retornar imediatamente com o ID da importação
    return NextResponse.json({
      success: true,
      message: 'Importação iniciada. Acompanhe o progresso em tempo real.',
      importId,
      status: 'processing'
    }, {
      status: 202, // HTTP 202 Accepted - processamento assíncrono
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error: any) {
    console.error('Erro ao iniciar importação:', error)
    
    return NextResponse.json(
      { error: error.message || 'Erro ao iniciar importação do Google Drive' },
      { status: 500 }
    )
  }
}