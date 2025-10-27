import { NextRequest, NextResponse, after } from 'next/server'
import { google, type drive_v3 } from 'googleapis'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database, Json } from '@/lib/database.types'
import { parseAnswerKeyFromText, type ParsedAnswerKeyEntry } from '../tests/utils/answer-key'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { pipeline } from 'stream/promises'
import { uploadFileWithTus } from '@/lib/storage/tusUpload'

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
type DriveClient = drive_v3.Drive

const DEFAULT_RETRY_ATTEMPTS = 6
const DEFAULT_RETRY_DELAY_MS = 300
const DEFAULT_ACTION_TIMEOUT_MS = 60_000
const RATE_LIMIT_INTERVAL_MS = Number(process.env.GOOGLE_DRIVE_RATE_LIMIT_INTERVAL_MS ?? 200)
const MAX_RATE_LIMIT_BACKOFF_MS = 8_000
const MAX_DOC_EXPORT_BYTES = Number(process.env.GOOGLE_DRIVE_MAX_EXPORT_BYTES ?? 25 * 1024 * 1024)
const DRIVE_IMPORT_BUCKET = process.env.DRIVE_IMPORT_BUCKET ?? 'drive-imports'
const SUPABASE_TUS_THRESHOLD_BYTES = Number(process.env.SUPABASE_TUS_THRESHOLD_BYTES ?? 50 * 1024 * 1024)
const DRIVE_DOWNLOAD_REQUEST_TIMEOUT_MS = Number(process.env.GOOGLE_DRIVE_DOWNLOAD_REQUEST_TIMEOUT_MS ?? 90_000)
const DRIVE_STREAM_TIMEOUT_MS = Number(process.env.GOOGLE_DRIVE_STREAM_TIMEOUT_MS ?? 180_000)

let rateLimitChain: Promise<void> = Promise.resolve()
let lastDriveRequestTimestamp = 0
let storageBucketInitialized = false

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function streamWithTimeout(
  source: NodeJS.ReadableStream,
  destination: NodeJS.WritableStream,
  label: string,
  timeoutMs: number
) {
  let timeout: NodeJS.Timeout | undefined
  let settled = false

  const cleanup = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = undefined
    }
    settled = true
  }

  return await new Promise<void>((resolve, reject) => {
    timeout = setTimeout(() => {
      if (settled) return
      const timeoutError = new TimeoutError(label, timeoutMs)
      // Garantir que os streams sejam interrompidos para evitar vazamentos
      if (typeof (source as any)?.destroy === 'function') {
        (source as any).destroy(timeoutError)
      }
      if (typeof (destination as any)?.destroy === 'function') {
        (destination as any).destroy(timeoutError)
      }
      reject(timeoutError)
    }, timeoutMs)

    pipeline(source, destination)
      .then(() => {
        cleanup()
        resolve()
      })
      .catch(error => {
        cleanup()
        reject(error)
      })
  })
}

async function enforceDriveRateLimit() {
  rateLimitChain = rateLimitChain.then(async () => {
    const now = Date.now()
    const elapsed = now - lastDriveRequestTimestamp
    if (elapsed < RATE_LIMIT_INTERVAL_MS) {
      await wait(RATE_LIMIT_INTERVAL_MS - elapsed)
    }
    lastDriveRequestTimestamp = Date.now()
  })
  await rateLimitChain
}

function extractGoogleErrorReason(error: any): string | undefined {
  return (
    error?.errors?.[0]?.reason ??
    error?.response?.data?.error?.errors?.[0]?.reason ??
    error?.response?.data?.error?.status ??
    (typeof error?.code === 'string' ? error.code : undefined)
  )
}

function isRateLimitError(error: any): boolean {
  const statusCode = error?.code ?? error?.response?.status
  if (statusCode === 429) return true
  const reason = extractGoogleErrorReason(error)
  if (!reason) {
    const message: string | undefined = error?.message
    return Boolean(message && /rate limit/i.test(message))
  }
  const normalized = reason.toLowerCase()
  return ['ratelimitexceeded', 'userratelimitexceeded', 'quotaexceeded', 'dailylimitexceeded'].includes(normalized)
}

function getDriveFileSizeBytes(file: drive_v3.Schema$File | undefined): number {
  if (!file) return 0
  const raw =
    typeof file.size === 'string'
      ? parseInt(file.size, 10)
      : typeof file.size === 'number'
        ? file.size
        : typeof file.quotaBytesUsed === 'string'
          ? parseInt(file.quotaBytesUsed, 10)
          : typeof file.quotaBytesUsed === 'number'
            ? file.quotaBytesUsed
            : 0
  return Number.isFinite(raw) ? Math.max(raw, 0) : 0
}

function slugifyForStorage(value: string) {
  const normalized = normalizeForMatching(value)
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item'
}

async function ensureStorageBucketExists(supabase: SupabaseClient<Database>, job?: ImportJobContext) {
  if (storageBucketInitialized) return
  const { data, error } = await supabase.storage.getBucket(DRIVE_IMPORT_BUCKET)
  if (error || !data) {
    const { error: createError } = await supabase.storage.createBucket(DRIVE_IMPORT_BUCKET, {
      public: true,
      fileSizeLimit: undefined
    })
    if (createError && !createError.message?.toLowerCase().includes('already exists')) {
      throw createError
    }
    if (job) {
      await logJob(job, 'info', 'Bucket de importação preparado', { bucket: DRIVE_IMPORT_BUCKET })
    }
  }
  storageBucketInitialized = true
}

async function uploadLargeDriveFile(options: {
  drive: DriveClient
  supabase: SupabaseClient<Database>
  fileId: string
  courseId: string
  moduleName: string
  subjectName: string
  itemName: string
  exportMimeType?: string
  targetExtension?: string
  originalMimeType?: string | null
  job?: ImportJobContext
}) {
  const {
    drive,
    supabase,
    fileId,
    courseId,
    moduleName,
    subjectName,
    itemName,
    exportMimeType,
    targetExtension,
    originalMimeType,
    job
  } = options

  await ensureStorageBucketExists(supabase, job)

  const moduleSlug = slugifyForStorage(moduleName)
  const subjectSlug = slugifyForStorage(subjectName)
  const extension = targetExtension || (exportMimeType === 'application/pdf' ? 'pdf' : (originalMimeType?.split('/').pop() || 'bin'))
  const storagePath = `${courseId}/${moduleSlug}/${subjectSlug}/${fileId}.${extension}`

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'drive-import-'))
  const tempFile = path.join(tempDir, `${fileId}.${extension}`)

  try {
    if (job) {
      await logJob(job, 'info', 'Baixando arquivo grande do Google Drive', {
        moduleName,
        subjectName,
        itemName,
        fileId,
        exportMimeType: exportMimeType ?? null,
        originalMimeType: originalMimeType ?? null,
      })
    }

    const label = exportMimeType
      ? `drive.files.export (${fileId})`
      : `drive.files.get (${fileId})`

    const response = await executeWithRetries(
      label,
      () =>
        exportMimeType
          ? drive.files.export({ fileId, mimeType: exportMimeType }, { responseType: 'stream' })
          : drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' }),
      { timeoutMs: DRIVE_DOWNLOAD_REQUEST_TIMEOUT_MS }
    )

    const downloadStream = response.data as NodeJS.ReadableStream | undefined
    if (!downloadStream) {
      throw new Error(`Stream não retornada pelo Google Drive para ${fileId}`)
    }

    const writeStream = fs.createWriteStream(tempFile)
    await streamWithTimeout(
      downloadStream,
      writeStream,
      `download ${itemName}`,
      DRIVE_STREAM_TIMEOUT_MS
    )

    const contentType = exportMimeType ?? originalMimeType ?? 'application/octet-stream'
    const fileStats = await fs.promises.stat(tempFile)
    const downloadedSize = fileStats.size
    const shouldUseTus = downloadedSize >= SUPABASE_TUS_THRESHOLD_BYTES

    let uploadMethod: 'tus' | 'standard' = 'standard'

    if (shouldUseTus) {
      await uploadFileWithTus({
        bucket: DRIVE_IMPORT_BUCKET,
        objectPath: storagePath,
        filePath: tempFile,
        contentType,
        metadata: {
          courseId,
          moduleName,
          subjectName,
          fileId,
          itemName,
          provider: 'google'
        }
      })
      uploadMethod = 'tus'
    } else {
      const { error: uploadError } = await supabase.storage
        .from(DRIVE_IMPORT_BUCKET)
        .upload(storagePath, fs.createReadStream(tempFile), { contentType, upsert: true })

      if (uploadError) {
        throw uploadError
      }
    }

    const { data: publicUrlData } = supabase.storage.from(DRIVE_IMPORT_BUCKET).getPublicUrl(storagePath)
    const publicUrl = publicUrlData?.publicUrl ?? ''

    if (job) {
      await logJob(job, 'info', 'Arquivo salvo no storage', {
        bucket: DRIVE_IMPORT_BUCKET,
        storagePath,
        publicUrl,
        moduleName,
        subjectName,
        fileId,
        itemName,
        contentType,
        uploadMethod,
        sizeBytes: downloadedSize
      })
    }

    return { storagePath, publicUrl, contentType }
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  }
}

class TimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`Timeout após ${timeoutMs}ms ao executar ${label}`)
    this.name = 'TimeoutError'
  }
}

async function withTimeout<T>(label: string, action: () => Promise<T>, timeoutMs: number): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(label, timeoutMs))
    }, timeoutMs)

    action()
      .then(result => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

async function executeWithRetries<T>(
  label: string,
  action: () => Promise<T>,
  options: { retries?: number; delayMs?: number; timeoutMs?: number } = {}
): Promise<T> {
  const {
    retries = DEFAULT_RETRY_ATTEMPTS,
    delayMs = DEFAULT_RETRY_DELAY_MS,
    timeoutMs = DEFAULT_ACTION_TIMEOUT_MS
  } = options

  let attempt = 0
  let error: unknown

  while (attempt < retries) {
    try {
      await enforceDriveRateLimit()
      return await withTimeout(label, action, timeoutMs)
    } catch (err) {
      error = err
      attempt += 1
      const rateLimited = isRateLimitError(err)
      const exponentialDelay = delayMs * Math.pow(2, attempt)
      const computedDelay = rateLimited
        ? Math.min(MAX_RATE_LIMIT_BACKOFF_MS, Math.max(delayMs, exponentialDelay))
        : Math.max(delayMs, delayMs * attempt)
      console.warn(
        `[IMPORT][RETRY] ${label} falhou (tentativa ${attempt}/${retries})${rateLimited ? ' - rate limited' : ''}`,
        err
      )
      if (attempt < retries) {
        await wait(computedDelay)
      }
    }
  }

  throw error instanceof Error ? error : new Error(`Falha ao executar ${label}`)
}

function ensureName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

function removeDiacritics(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeForMatching(value: string) {
  return removeDiacritics(value).toLowerCase()
}

async function listFolderContents(
  drive: DriveClient,
  folderId: string,
  querySuffix: string
) {
  const files: drive_v3.Schema$File[] = []
  let pageToken: string | undefined

  do {
    const response = await executeWithRetries(
      `drive.files.list (${folderId})`,
      () =>
        drive.files.list({
          q: `'${folderId}' in parents and trashed = false ${querySuffix}`,
          fields: 'nextPageToken, files(id, name, mimeType, size, quotaBytesUsed)',
          pageSize: 1000,
          orderBy: 'name',
          pageToken
        })
    )

    if (response.data.files) {
      files.push(...response.data.files)
    }

    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  return files
}

function isTestFile(title: string) {
  const normalizedTitle = normalizeForMatching(title)

  if (!normalizedTitle) {
    return false
  }

  return /\bteste\b/.test(normalizedTitle)
}

function formatTitle(rawName: string) {
  return rawName.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function generateCode(prefix: string, index: number) {
  return `${prefix}${String(index).padStart(2, '0')}`
}


function generateSubjectCode(moduleName: string, subjectName: string) {
  const base = normalizeForMatching(`${moduleName} ${subjectName}`)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const code = base.length > 0 ? base.toUpperCase().slice(0, 32) : null
  return code ? `SUB_${code}` : `SUB_${Date.now()}`
}

interface ExistingSubjectInfo {
  id: string
  name: string
  code?: string | null
  moduleId?: string
}

interface ExistingCourseState {
  modulesByName: Map<string, { id: string; title: string }>
  subjectsByModuleId: Map<string, Map<string, ExistingSubjectInfo>>
  subjectsByCode: Map<string, ExistingSubjectInfo>
  existingLessonUrls: Set<string>
  existingTestUrls: Set<string>
}

async function loadExistingCourseState(supabase: any, courseId: string): Promise<ExistingCourseState | null> {
  try {
    const modulesByName = new Map<string, { id: string; title: string }>()
    const subjectsByModuleId = new Map<string, Map<string, ExistingSubjectInfo>>()
    const subjectsByCode = new Map<string, ExistingSubjectInfo>()
    const existingLessonUrls = new Set<string>()
    const existingTestUrls = new Set<string>()

    const { data: moduleRows, error: moduleError } = await supabase
      .from('course_modules')
      .select('id, title')
      .eq('course_id', courseId)

    if (moduleError) {
      throw moduleError
    }

    const moduleIds: string[] = []

    for (const moduleRow of moduleRows || []) {
      if (moduleRow?.id && moduleRow?.title) {
        moduleIds.push(moduleRow.id)
        modulesByName.set(normalizeForMatching(moduleRow.title), { id: moduleRow.id, title: moduleRow.title })
      }
    }

    const subjectIds: string[] = []

    if (moduleIds.length > 0) {
      const { data: moduleSubjectRows, error: moduleSubjectError } = await supabase
        .from('module_subjects')
        .select('module_id, subject_id, subjects ( id, name, code )')
        .in('module_id', moduleIds)

      if (moduleSubjectError) {
        throw moduleSubjectError
      }

      for (const row of moduleSubjectRows || []) {
        const moduleId = row?.module_id
        const subjectId = row?.subject_id
        const subjectName = row?.subjects?.name

        if (!moduleId || !subjectId || !subjectName) continue

        subjectIds.push(subjectId)
        if (!subjectsByModuleId.has(moduleId)) {
          subjectsByModuleId.set(moduleId, new Map())
        }
          const subjectInfo: ExistingSubjectInfo = {
            id: subjectId,
            name: subjectName,
            code: row?.subjects?.code ?? null,
            moduleId,
          }

          subjectsByModuleId.get(moduleId)!.set(normalizeForMatching(subjectName), subjectInfo)

          if (subjectInfo.code) {
            subjectsByCode.set(subjectInfo.code.toUpperCase(), subjectInfo)
          }
      }
    }

    if (subjectIds.length > 0) {
      const { data: subjectLessonRows, error: subjectLessonError } = await supabase
        .from('subject_lessons')
        .select('lessons ( content_url )')
        .in('subject_id', subjectIds)

      if (subjectLessonError) {
        throw subjectLessonError
      }

      for (const row of subjectLessonRows || []) {
        const url = row?.lessons?.content_url
        if (typeof url === 'string' && url.length > 0) {
          existingLessonUrls.add(url)
        }
      }
    }

    const { data: testsRows, error: testsError } = await supabase
      .from('tests')
      .select('google_drive_url')
      .eq('course_id', courseId)

    if (testsError) {
      throw testsError
    }

    for (const row of testsRows || []) {
      const url = row?.google_drive_url
      if (typeof url === 'string' && url.length > 0) {
        existingTestUrls.add(url)
      }
    }

    return { modulesByName, subjectsByModuleId, subjectsByCode, existingLessonUrls, existingTestUrls }
  } catch (error) {
    console.warn('[IMPORT] Não foi possível carregar estado existente:', error)
    return null
  }
}

// Função para atualizar progresso no Supabase
async function updateImportProgress(
  supabase: any,
  importId: string,
  userId: string,
  courseId: string,
  progress: any,
  job?: ImportJobContext
) {
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
          processed: `${progress.processed_modules}/${progress.total_modules} módulos, ${progress.processed_subjects}/${progress.total_subjects} disciplinas, ${progress.processed_lessons}/${progress.total_lessons} aulas/testes`
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
    
    if (job) {
      const processedItems =
        progress.processed_lessons ??
        progress.processed_modules ??
        progress.processed_subjects ??
        null

      const totalItems =
        (progress.total_modules ?? 0) +
        (progress.total_subjects ?? 0) +
        (progress.total_lessons ?? 0)

      await updateJob(job, {
        processed_items: processedItems,
        total_items: totalItems > 0 ? totalItems : null,
        current_step: progress.current_step,
        status: progress.completed ? 'completed' : progress.phase ?? 'processing',
      })

      await logJob(job, 'info', progress.current_step ?? 'Progresso atualizado', {
        percentage: progress.percentage ?? null,
        processed_modules: progress.processed_modules ?? null,
        total_modules: progress.total_modules ?? null,
        processed_subjects: progress.processed_subjects ?? null,
        total_subjects: progress.total_subjects ?? null,
        processed_lessons: progress.processed_lessons ?? null,
        total_lessons: progress.total_lessons ?? null,
        current_item: progress.current_item ?? null,
        completed: progress.completed ?? false
      })
    }
  } catch (err) {
    console.error('[PROGRESS] Erro ao salvar progresso:', err)
  }
}

async function authenticateGoogleDrive(): Promise<DriveClient> {
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
        await executeWithRetries('drive.files.list (ping)', () => drive.files.list({ pageSize: 1 }))
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
      code?: string
      existingId?: string
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
      tests: {
        name: string
        code?: string
        order: number
        contentType: string
        contentUrl: string
        description?: string
        answerKey?: ParsedAnswerKeyEntry[]
        requiresManualAnswerKey?: boolean
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

async function parseGoogleDriveFolder(
  drive: DriveClient,
  folderId: string,
  courseId: string,
  importId?: string,
  supabase?: any,
  userId?: string,
  job?: ImportJobContext
): Promise<CourseStructure> {
  const structure: CourseStructure = { modules: [] }
  
  let totalModules = 0
  let totalSubjects = 0  
  let totalLessons = 0
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
      await updateImportProgress(supabase, importId, userId, courseId, fullProgress, job)
    }
  }

  try {
    const items = await listFolderContents(
      drive,
      folderId,
      `and mimeType = '${FOLDER_MIME_TYPE}'`
    )

    console.log(`Processando ${items.length} módulos na pasta principal`)
    totalModules = items.length
    
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
    
    const existingState = supabase && courseId
      ? await loadExistingCourseState(supabase, courseId)
      : null
    
    // Processar módulos (pastas de primeiro nível)
    for (let moduleIndex = 0; moduleIndex < items.length; moduleIndex++) {
      const item = items[moduleIndex]
      
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const moduleName = ensureName(item.name, `Módulo ${moduleIndex + 1}`)
        const courseModule = {
          name: moduleName,
          order: moduleIndex + 1,
          subjects: [] as any[]
        }
        const normalizedModuleName = normalizeForMatching(moduleName)
        const existingModuleInfo = existingState?.modulesByName.get(normalizedModuleName)
        const moduleAlreadyImported = Boolean(existingModuleInfo)
        const existingModuleId = existingModuleInfo?.id
        const existingSubjectsForModule = existingModuleId
          ? existingState?.subjectsByModuleId.get(existingModuleId)
          : undefined
        
        await logJob(job, 'info', 'Listando disciplinas do módulo', {
          moduleName,
          folderId: item.id,
        })

        const subjectCandidates = await listFolderContents(drive, item.id!, '')
        const subjects = subjectCandidates.filter(candidate => candidate.mimeType === FOLDER_MIME_TYPE)
        const strayFiles = subjectCandidates.filter(candidate => candidate.mimeType !== FOLDER_MIME_TYPE)

        if (strayFiles.length > 0) {
          console.warn(`  Arquivos soltos ignorados em '${courseModule.name}':`, strayFiles.map(file => file.name))
        }

        console.log(`  Módulo '${moduleName}': ${subjects.length} disciplinas encontradas`)
        totalSubjects += subjects.length

        await logJob(job, 'info', 'Disciplinas listadas', {
          moduleName,
          subjectsFound: subjects.length,
          strayFiles: strayFiles.length,
        })

        // Atualizar progresso ANTES de processar o módulo (já com total de disciplinas conhecido)
        await updateProgress({
          current_step: `Processando módulo ${processedModules + 1}/${totalModules}`,
          total_modules: totalModules,
          processed_modules: processedModules,
          total_subjects: totalSubjects,
          processed_subjects: processedSubjects,
          total_lessons: totalLessons,
          processed_lessons: processedLessons,
          current_item: `Módulo: ${moduleName}`,
          errors: []
        })

        for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex++) {
          const subjectItem = subjects[subjectIndex]
          
          if (subjectItem.mimeType === FOLDER_MIME_TYPE) {
            const subjectName = ensureName(subjectItem.name, `${moduleName} - Disciplina ${subjectIndex + 1}`)
            const normalizedSubjectName = normalizeForMatching(subjectName)
            const explicitCodeMatch = subjectName.match(/^([A-Za-z0-9]{3,})\s*[-_]/)
            const explicitSubjectCode = explicitCodeMatch ? explicitCodeMatch[1].toUpperCase() : undefined
            const generatedSubjectCode = generateSubjectCode(moduleName, subjectName)
            const subjectCode = (explicitSubjectCode || generatedSubjectCode).slice(0, 32)
            const existingSubjectByCode = explicitSubjectCode
              ? existingState?.subjectsByCode.get(explicitSubjectCode.toUpperCase())
              : undefined
            const existingSubjectEntry = existingSubjectByCode && existingSubjectByCode.moduleId === existingModuleId
              ? existingSubjectByCode
              : existingSubjectsForModule?.get(normalizedSubjectName)
            const existingSubjectId = existingSubjectEntry?.id

            await logJob(job, 'info', 'Listando itens da disciplina', {
              moduleName,
              subjectName,
              folderId: subjectItem.id,
            })

            const subjectAssets = await listFolderContents(drive, subjectItem.id!, '')
            const lessons = subjectAssets.filter(asset => asset.mimeType !== FOLDER_MIME_TYPE)
            const nestedFolders = subjectAssets.filter(asset => asset.mimeType === FOLDER_MIME_TYPE)
            totalLessons += lessons.length

            const subject = {
              name: subjectName,
              code: subjectCode,
              existingId: existingSubjectId,
              order: subjectIndex + 1,
              lessons: [] as any[],
              tests: [] as any[]
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
              current_item: `Disciplina: ${subjectName}`,
              errors: []
            })

            if (nestedFolders.length > 0) {
            console.warn(
              `    Pastas aninhadas ignoradas em '${subjectName}':`,
              nestedFolders.map(folder => ensureName(folder.name, 'Pasta sem título'))
            )
          }

            console.log(`    Disciplina '${subjectName}': ${lessons.length} arquivos detectados`)

            await logJob(job, 'info', 'Itens da disciplina listados', {
              moduleName,
              subjectName,
              lessonsFound: lessons.length,
              nestedFolders: nestedFolders.length,
            })

            // Processamento em lotes para evitar timeout
            const BATCH_SIZE = 5 // Processar 5 aulas por vez
            const DELAY_BETWEEN_BATCHES = 25 // Delay curto entre lotes para reduzir uso da API
            
            let lessonOrder = 0
            let testOrder = 0
            const validLessons = lessons
            
            // Processar aulas em lotes
            for (let batchStart = 0; batchStart < validLessons.length; batchStart += BATCH_SIZE) {
              const batch = validLessons.slice(batchStart, Math.min(batchStart + BATCH_SIZE, validLessons.length))
              
              console.log(`      Processando lote ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${batch.length} aulas`)
              
              // Processar aulas do lote
              for (const lessonItem of batch) {
                const itemName = lessonItem.name || 'Arquivo sem nome'
                console.log(`      Processando arquivo: ${itemName} (${lessonItem.mimeType})`)

                await updateProgress({
                  current_step: `Processando item ${processedLessons + 1}/${totalLessons}`,
                  total_modules: totalModules,
                  processed_modules: processedModules,
                  total_subjects: totalSubjects,
                  processed_subjects: processedSubjects,
                  total_lessons: totalLessons,
                  processed_lessons: processedLessons,
                  current_item: `Arquivo: ${itemName}`,
                  errors: []
                })

                const mimeType = (lessonItem.mimeType || '').toLowerCase()
                const driveLink = `https://drive.google.com/file/d/${lessonItem.id}/view`
                const fileExtensions = /\.(docx?|pdf|txt|pptx?|xlsx?|mp4|mp3|m4a|wav|avi|mov|zip|rar|png|jpg|jpeg|gif|svg|html?|css|js|json|xml|csv|odt|ods|odp)$/i
                const baseName = (lessonItem.name || '').replace(fileExtensions, '')
                const formattedTitle = formatTitle(baseName || itemName)
                const isTest = isTestFile(formattedTitle)

                const fileSizeBytes = getDriveFileSizeBytes(lessonItem)
                let completedLabel: string

                if (isTest) {
                  if (existingState?.existingTestUrls?.has(driveLink)) {
                    console.log(`      Teste já importado detectado: '${itemName}', pulando.`)
                    processedLessons++
                    await updateProgress({
                      current_step: `Item ${processedLessons}/${totalLessons} processado`,
                      total_modules: totalModules,
                      processed_modules: processedModules,
                      total_subjects: totalSubjects,
                      processed_subjects: processedSubjects,
                      total_lessons: totalLessons,
                      processed_lessons: processedLessons,
                      current_item: `Pulado: ${itemName}`,
                      phase: 'processing',
                      errors: []
                    })
                    continue
                  }

                  testOrder += 1
                  const normalizedOriginalName = (baseName || itemName).trim()
                  const testName = normalizedOriginalName.length > 0 ? normalizedOriginalName : `Teste ${testOrder}`

                  let extractedAnswerKey: ParsedAnswerKeyEntry[] | undefined
                  let requiresManualAnswerKey = true
                  const skippingLargeDoc =
                    lessonItem.mimeType === 'application/vnd.google-apps.document' &&
                    fileSizeBytes > MAX_DOC_EXPORT_BYTES

                  if (skippingLargeDoc) {
                    if (job) {
                      await logJob(job, 'warn', 'Teste demasiado grande para exportar gabarito automaticamente', {
                        moduleName,
                        subjectName,
                        fileId: lessonItem.id,
                        itemName,
                        sizeBytes: fileSizeBytes,
                        limitBytes: MAX_DOC_EXPORT_BYTES
                      })
                    }
                  } else if (lessonItem.mimeType === 'application/vnd.google-apps.document') {
                    try {
                      console.log(`        Tentando extrair gabarito do Google Docs: ${itemName}`)
                      if (job) {
                        await logJob(job, 'info', 'Exportando gabarito do teste', {
                          moduleName,
                          subjectName,
                          fileId: lessonItem.id,
                          itemName,
                        })
                      }
                      const exported = await executeWithRetries(
                        `drive.files.export (${lessonItem.id})`,
                        () =>
                          drive.files.export({
                            fileId: lessonItem.id!,
                            mimeType: 'text/plain'
                          }),
                        { timeoutMs: 15000, retries: 2 }
                      )
                      const rawContent = typeof exported.data === 'string' ? exported.data : ''
                      if (rawContent.trim().length > 0) {
                        const parsed = parseAnswerKeyFromText(rawContent)
                        if (parsed.length > 0) {
                          extractedAnswerKey = parsed
                          requiresManualAnswerKey = false
                          if (job && parsed.length > 0) {
                            await logJob(job, 'info', 'Gabarito extraído automaticamente', {
                              moduleName,
                              subjectName,
                              fileId: lessonItem.id,
                              questions: parsed.length,
                              sizeBytes: fileSizeBytes || null
                            })
                          }
                        }
                      }
                    } catch (answerKeyError) {
                      console.warn(`        Não foi possível extrair gabarito automático para ${itemName}:`, answerKeyError)
                      if (job) {
                        await logJob(job, 'warn', 'Falha ao extrair gabarito automaticamente', {
                          moduleName,
                          subjectName,
                          fileId: lessonItem.id,
                          itemName,
                          sizeBytes: fileSizeBytes || null,
                          error: answerKeyError instanceof Error ? answerKeyError.message : 'Erro desconhecido',
                        })
                      }
                    }
                  }

                  subject.tests.push({
                    name: testName,
                    order: testOrder,
                    contentType: 'test',
                    contentUrl: driveLink,
                    description: testName,
                    answerKey: extractedAnswerKey,
                    requiresManualAnswerKey
                  })
                  existingState?.existingTestUrls?.add(driveLink)

                  console.log(`      Teste detectado: '${testName}' (${mimeType}) - gabarito automático: ${extractedAnswerKey?.length || 0}`)
                  completedLabel = `Teste ${testName}`
                } else {
                  if (existingState?.existingLessonUrls?.has(driveLink)) {
                    console.log(`      Aula já importada detectada: '${itemName}', pulando.`)
                    processedLessons++
                    await updateProgress({
                      current_step: `Item ${processedLessons}/${totalLessons} processado`,
                      total_modules: totalModules,
                      processed_modules: processedModules,
                      total_subjects: totalSubjects,
                      processed_subjects: processedSubjects,
                      total_lessons: totalLessons,
                      processed_lessons: processedLessons,
                      current_item: `Pulado: ${itemName}`,
                      phase: 'processing',
                      errors: []
                    })
                    continue
                  }

                  let contentType = 'text'

                  if (
                    mimeType.includes('video') ||
                    mimeType === 'video/mp4' ||
                    mimeType === 'video/mpeg' ||
                    mimeType === 'video/quicktime' ||
                    mimeType === 'video/x-msvideo' ||
                    mimeType === 'application/vnd.google-apps.video'
                  ) {
                    contentType = 'video'
                  }

                  const codeMatch = baseName.match(/^([A-Z0-9]+)[-_ ]+(.+)$/)
                  const lessonCode = codeMatch ? codeMatch[1] : generateCode('A', lessonOrder + 1)
                  const lessonName = codeMatch
                    ? codeMatch[2].trim()
                    : formattedTitle || `Aula ${lessonOrder + 1}`

                  const lesson: any = {
                    name: lessonName,
                    code: lessonCode,
                    order: lessonOrder + 1,
                    content: undefined as string | undefined,
                    contentType,
                    contentUrl: driveLink,
                    description: `Aula ${lessonCode}: ${lessonName}`
                  }
                  lessonOrder += 1

                  const skippingLargeContent =
                    (lessonItem.mimeType === 'application/vnd.google-apps.document' ||
                      lessonItem.mimeType === 'application/vnd.google-apps.presentation') &&
                    fileSizeBytes > MAX_DOC_EXPORT_BYTES

                  try {
                    if (skippingLargeContent) {
                      const exportMimeType =
                        lessonItem.mimeType === 'application/vnd.google-apps.document' ||
                        lessonItem.mimeType === 'application/vnd.google-apps.presentation'
                          ? 'application/pdf'
                          : undefined
                      const storageResult = await uploadLargeDriveFile({
                        drive,
                        supabase,
                        fileId: lessonItem.id!,
                        courseId,
                        moduleName,
                        subjectName,
                        itemName,
                        exportMimeType,
                        targetExtension: exportMimeType ? 'pdf' : undefined,
                        originalMimeType: lessonItem.mimeType,
                        job
                      })
                      lesson.content = ''
                      lesson.contentUrl = storageResult.publicUrl
                      if (job) {
                        await logJob(job, 'info', 'Arquivo grande armazenado no bucket', {
                          moduleName,
                          subjectName,
                          fileId: lessonItem.id,
                          itemName,
                          sizeBytes: fileSizeBytes,
                          limitBytes: MAX_DOC_EXPORT_BYTES,
                          storagePath: storageResult.storagePath
                        })
                      }
                      completedLabel = `${lesson.name} (arquivo armazenado)`
                    } else if (mimeType === 'application/vnd.google-apps.document') {
                      console.log(`        Baixando conteúdo do Google Docs: ${itemName}`)
                      if (job) {
                        await logJob(job, 'info', 'Exportando conteúdo do Google Docs', {
                          moduleName,
                          subjectName,
                          fileId: lessonItem.id,
                          itemName,
                          sizeBytes: fileSizeBytes || null
                        })
                      }
                      const content = await executeWithRetries(
                        `drive.files.export (${lessonItem.id})`,
                        () =>
                          drive.files.export({
                            fileId: lessonItem.id!,
                            mimeType: 'text/plain'
                          }),
                        { timeoutMs: 15000, retries: 2 }
                      )
                      lesson.content = (content.data as string) ?? ''
                    } else if (mimeType === 'application/vnd.google-apps.presentation') {
                      console.log(`        Baixando conteúdo do Google Slides: ${itemName}`)
                      if (job) {
                        await logJob(job, 'info', 'Exportando conteúdo do Google Slides', {
                          moduleName,
                          subjectName,
                          fileId: lessonItem.id,
                          itemName,
                          sizeBytes: fileSizeBytes || null
                        })
                      }
                      const content = await executeWithRetries(
                        `drive.files.export (${lessonItem.id})`,
                        () =>
                          drive.files.export({
                            fileId: lessonItem.id!,
                            mimeType: 'text/plain'
                          }),
                        { timeoutMs: 15000, retries: 2 }
                      )
                      lesson.content = (content.data as string) ?? ''
                    } else {
                      lesson.content = `[Arquivo referenciado: ${itemName}]`
                    }
                  } catch (error) {
                    console.log(`      Erro ao baixar conteúdo de ${itemName}, usando referência apenas`)
                    lesson.content = `[Arquivo: ${itemName}]`
                    lesson.contentUrl = driveLink
                    if (job) {
                      await logJob(job, 'warn', 'Falha ao exportar conteúdo do arquivo', {
                        moduleName,
                        subjectName,
                        fileId: lessonItem.id,
                        itemName,
                        sizeBytes: fileSizeBytes || null,
                        error: error instanceof Error ? error.message : 'Erro desconhecido'
                      })
                    }
                  }

                  subject.lessons.push(lesson)
                  existingState?.existingLessonUrls?.add(driveLink)
                  console.log(`      Aula adicionada: '${lesson.name}' (tipo: ${lessonItem.mimeType})`)
                  completedLabel = lesson.name
                }

                processedLessons++

                await updateProgress({
                  current_step: `Item ${processedLessons}/${totalLessons} processado`,
                  total_modules: totalModules,
                  processed_modules: processedModules,
                  total_subjects: totalSubjects,
                  processed_subjects: processedSubjects,
                  total_lessons: totalLessons,
                  processed_lessons: processedLessons,
                  current_item: `Concluído: ${completedLabel}`,
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

            const subjectHasNewContent = subject.lessons.length > 0 || subject.tests.length > 0
            const subjectIsNew = !existingSubjectId

            if (subjectHasNewContent || subjectIsNew) {
              courseModule.subjects.push(subject)
            } else {
              console.log(`    Nenhum item novo encontrado para '${subject.name}', pulando disciplina.`)
            }

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
              current_item: subjectHasNewContent || subjectIsNew
                ? `Concluído: ${subject.name}`
                : `Sem novidades: ${subject.name}`,
              phase: 'processing',
              errors: []
            })
          }
        }

        const moduleHasNewContent = courseModule.subjects.length > 0
        if (moduleHasNewContent || !moduleAlreadyImported) {
          structure.modules.push(courseModule)
        } else {
          console.log(`  Nenhum conteúdo novo encontrado para o módulo '${courseModule.name}', pulando.`)
        }
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
          current_item: moduleHasNewContent || !moduleAlreadyImported
            ? `Concluído: ${courseModule.name}`
            : `Sem novidades: ${courseModule.name}`,
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

async function importToDatabase(
  structure: CourseStructure,
  courseId: string,
  supabase: any,
  importId?: string,
  userId?: string,
  user?: any,
  job?: ImportJobContext
) {
  const results = {
    modules: 0,
    subjects: 0,
    lessons: 0,
    tests: 0,
    skipped: {
      modules: 0,
      subjects: 0,
      lessons: 0,
      tests: 0
    },
    errors: [] as string[]
  }

  // Função para atualizar progresso durante importação
  const updateDatabaseProgress = async (step: string, item: string) => {
    if (importId && supabase && userId) {
      await updateImportProgress(supabase, importId, userId, courseId, {
        current_step: step,
        current_item: item
      }, job)
    }
    await logJob(job, 'info', step, { item })
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
        `Verificando módulo ${moduleIdx + 1}/${structure.modules.length}`,
        `Módulo: ${moduleData.name}`
      )
      
      // Verificar se o módulo já existe no curso
      const { data: existingModule } = await supabase
        .from('course_modules')
        .select('id, order_index')
        .eq('course_id', courseId)
        .eq('title', moduleData.name)
        .single()

      let createdModule: any

      if (existingModule) {
        console.log(`Módulo já existe: ${moduleData.name}, pulando criação...`)
        results.skipped.modules++
        createdModule = existingModule
      } else {
        // Criar novo módulo
        await updateDatabaseProgress(
          `Salvando módulo ${moduleIdx + 1}/${structure.modules.length}`,
          `Módulo: ${moduleData.name}`
        )
        
        const { data: newModule, error: moduleError } = await supabase
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
        createdModule = newModule
      }

      // Importar disciplinas do módulo
      for (let subjectIdx = 0; subjectIdx < moduleData.subjects.length; subjectIdx++) {
        const subjectData = moduleData.subjects[subjectIdx]
        
        await updateDatabaseProgress(
          `Salvando disciplina ${subjectIdx + 1}/${moduleData.subjects.length} do módulo ${moduleIdx + 1}`,
          `Disciplina: ${subjectData.name}`
        )
        
        const subjectName = subjectData.name
        const generatedSubjectCode = subjectData.code || generateSubjectCode(moduleData.name, subjectName)

        let subjectId = subjectData.existingId as string | undefined
        let subjectCodeToUse = generatedSubjectCode

        if (!subjectId) {
          const { data: subjectByCode } = await supabase
            .from('subjects')
            .select('id, code')
            .eq('code', generatedSubjectCode)
            .maybeSingle()

          if (subjectByCode) {
            subjectId = subjectByCode.id
            subjectCodeToUse = subjectByCode.code
          }
        }

        if (!subjectId) {
          const { data: subjectByName } = await supabase
            .from('subjects')
            .select('id, code')
            .eq('name', subjectName)
            .maybeSingle()

          if (subjectByName) {
            subjectId = subjectByName.id
            subjectCodeToUse = subjectByName.code || subjectCodeToUse
          }
        }

        if (subjectId) {
          console.log(`Disciplina já existente identificada: ${subjectName}`)
          results.skipped.subjects++
        } else {
          const { data: newSubject, error: subjectError } = await supabase
            .from('subjects')
            .insert({
              code: subjectCodeToUse,
              name: subjectName
            })
            .select()
            .single()

          if (subjectError) {
            results.errors.push(`Erro ao criar disciplina ${subjectData.name}: ${subjectError.message}`)
            continue
          }

          results.subjects++
          subjectId = newSubject.id
        }

        // Verificar se a associação disciplina-módulo já existe
        const { data: existingAssociation } = await supabase
          .from('module_subjects')
          .select('id')
          .eq('module_id', createdModule.id)
          .eq('subject_id', subjectId)
          .single()

        if (!existingAssociation) {
          // Associar disciplina ao módulo
          const { error: linkError } = await supabase
            .from('module_subjects')
            .insert({
              module_id: createdModule.id,
              subject_id: subjectId,
              order_index: subjectIdx
            })

          if (linkError) {
            results.errors.push(`Erro ao associar disciplina ${subjectData.name}: ${linkError.message}`)
            continue
          }
        } else {
          console.log(`Associação já existe entre módulo ${createdModule.id} e disciplina ${subjectId}`)
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
            results.skipped.lessons++
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
          
          // Verificar se a associação aula-disciplina já existe
          const { data: existingLessonAssociation } = await supabase
            .from('subject_lessons')
            .select('id')
            .eq('lesson_id', newLesson.id)
            .eq('subject_id', subjectId)
            .single()

          if (!existingLessonAssociation) {
            // Associar a aula à disciplina
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
          } else {
            console.log(`Associação já existe entre aula ${newLesson.id} e disciplina ${subjectId}`)
          }
          
          results.lessons++
        }

        // Processar testes detectados na disciplina
        const subjectTests = subjectData.tests || []
        if (subjectTests.length > 0) {
          console.log(`Processando ${subjectTests.length} testes para disciplina ${subjectData.name}`)
        }

        for (let testIdx = 0; testIdx < subjectTests.length; testIdx++) {
          const testData = subjectTests[testIdx]
          const baseTestTitle = (testData.name || testData.description || '').trim()
          const testTitle = baseTestTitle.length > 0 ? baseTestTitle : `Teste ${testIdx + 1}`

          await updateDatabaseProgress(
            `Salvando teste ${testIdx + 1}/${subjectTests.length}`,
            `Teste: ${testTitle}`
          )

          if (!testData.contentUrl) {
            results.skipped.tests++
            results.errors.push(`Teste ${testTitle} ignorado: link do Drive ausente`)
            continue
          }

          const { data: existingTest } = await supabase
            .from('tests')
            .select('id, title, description')
            .eq('course_id', courseId)
            .eq('google_drive_url', testData.contentUrl)
            .maybeSingle()

          if (existingTest) {
            console.log(`Teste já existente para URL ${testData.contentUrl}, verificando atualizações de gabarito...`)
            const hasAnswerKey = Array.isArray(testData.answerKey) && testData.answerKey.length > 0

            if (hasAnswerKey && testData.answerKey) {
              const answerKeyRows = testData.answerKey
                .filter(entry => Number.isFinite(entry.questionNumber) && entry.correctAnswer)
                .map(entry => ({
                  test_id: existingTest.id,
                  question_number: entry.questionNumber,
                  correct_answer: entry.correctAnswer,
                  points: entry.points ?? 10
                }))

              if (answerKeyRows.length > 0) {
                const { error: deleteError } = await supabase
                  .from('test_answer_keys')
                  .delete()
                  .eq('test_id', existingTest.id)

                if (deleteError) {
                  results.errors.push(`Erro ao limpar gabarito antigo do teste ${testTitle}: ${deleteError.message}`)
                } else {
                  const { error: insertError } = await supabase
                    .from('test_answer_keys')
                    .insert(answerKeyRows)

                  if (insertError) {
                    results.errors.push(`Erro ao atualizar gabarito do teste ${testTitle}: ${insertError.message}`)
                  } else {
                    await supabase
                      .from('tests')
                      .update({
                        title: testTitle,
                        description: (testData.description?.trim() || existingTest.description)?.trim() || null,
                        is_active: true,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', existingTest.id)
                    console.log(`Gabarito atualizado para teste existente: ${testTitle}`)
                  }
                }
              }
            }

            results.skipped.tests++
            continue
          }

          const hasAnswerKey = Array.isArray(testData.answerKey) && testData.answerKey.length > 0

          const { data: newTest, error: testError } = await supabase
            .from('tests')
            .insert({
              title: testTitle,
              description: testData.description?.trim() || testTitle,
              course_id: courseId,
              module_id: createdModule.id,
              subject_id: subjectId,
              google_drive_url: testData.contentUrl,
              is_active: hasAnswerKey,
              max_attempts: 3,
              passing_score: 70,
              duration_minutes: 60
            })
            .select()
            .single()

          if (testError || !newTest) {
            results.errors.push(`Erro ao criar teste ${testTitle}: ${testError?.message ?? 'falha desconhecida'}`)
            continue
          }

          if (hasAnswerKey && testData.answerKey) {
            const answerKeyRows = testData.answerKey
              .filter(entry => Number.isFinite(entry.questionNumber) && entry.correctAnswer)
              .map(entry => ({
                test_id: newTest.id,
                question_number: entry.questionNumber,
                correct_answer: entry.correctAnswer,
                points: entry.points ?? 10
              }))

            if (answerKeyRows.length > 0) {
              const { error: answerKeyError } = await supabase
                .from('test_answer_keys')
                .insert(answerKeyRows)

              if (answerKeyError) {
                results.errors.push(`Erro ao salvar gabarito para teste ${testTitle}: ${answerKeyError.message}`)
              }
            }
          } else if (testData.requiresManualAnswerKey) {
            results.errors.push(`Teste ${testTitle} importado sem gabarito detectado automaticamente. Configure o gabarito manualmente e ative o teste quando estiver pronto.`)
          }

          results.tests++
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
  folderId: string,
  jobId?: string,
  jobProvider?: string,
  supabaseClient?: SupabaseClient<Database>
) {
  const supabase = supabaseClient ?? createAdminClient()
  const provider = jobProvider ?? 'google'
  const jobContext = jobId ? { jobId, supabase, provider } : undefined
  
  try {
    console.log(`[IMPORT-BACKGROUND] Iniciando processamento em background para ${importId}`)
    await updateJob(jobContext, {
      status: 'indexing',
      started_at: new Date().toISOString(),
      error: null,
    })
    await logJob(jobContext, 'info', 'Job iniciado', { importId, courseId })
    
    // Autenticar com Google Drive
    console.log(`[IMPORT-BACKGROUND] Autenticando Google Drive...`)
    const drive = await authenticateGoogleDrive()
    
    await updateJob(jobContext, {
      status: 'indexing',
    })
    await logJob(jobContext, 'info', 'Autenticação concluída')
    
    // Atualizar progresso inicial
    await updateJob(jobContext, { current_step: 'Iniciando processamento' })
    await updateImportProgress(supabase, importId, userId, courseId, {
      phase: 'processing',
      current_step: 'Iniciando processamento',
      total_modules: 0,
      processed_modules: 0,
      total_subjects: 0,
      processed_subjects: 0,
      total_lessons: 0,
      processed_lessons: 0,
      current_item: 'Preparando para processar arquivos',
      percentage: 0,
      errors: []
    }, jobContext)
    
    // FASE 2: Processar estrutura da pasta
    console.log(`[IMPORT-BACKGROUND] === FASE 2: Processando conteúdo ===`)
    await updateJob(jobContext, { status: 'processing', current_step: 'Processando conteúdo' })
    const structure = await parseGoogleDriveFolder(drive, folderId, courseId, importId, supabase, userId, jobContext)

    if (structure.modules.length === 0) {
      await updateImportProgress(supabase, importId, userId, courseId, {
        current_step: 'Erro: Nenhum módulo encontrado',
        current_item: 'Verifique se a pasta contém a estrutura correta',
        errors: ['Nenhum módulo encontrado na pasta especificada'],
        completed: true,
        percentage: 0
      }, jobContext)
      await updateJob(jobContext, {
        status: 'failed',
        error: 'Nenhum módulo encontrado',
        finished_at: new Date().toISOString(),
      })
      return
    }

    // FASE 3: Importar para o banco de dados
    console.log(`[IMPORT-BACKGROUND] === FASE 3: Salvando no banco ===`)
    await updateJob(jobContext, { status: 'saving', current_step: 'Salvando no banco de dados' })
    const results = await importToDatabase(structure, courseId, supabase, importId, userId, undefined, jobContext)

    // Atualizar progresso final
    const totalImported = results.modules + results.subjects + results.lessons + results.tests
    const totalSkipped =
      results.skipped.modules +
      results.skipped.subjects +
      results.skipped.lessons +
      results.skipped.tests
    
    let summaryMessage = `${results.modules} módulos, ${results.subjects} disciplinas, ${results.lessons} aulas e ${results.tests} testes importados`
    if (totalSkipped > 0) {
      summaryMessage += ` (${totalSkipped} itens já existiam e foram pulados)`
    }
    
    const totalLessonLikeItems =
      results.lessons +
      results.tests +
      results.skipped.lessons +
      results.skipped.tests

    await updateImportProgress(supabase, importId, userId, courseId, {
      current_step: 'Importação concluída',
      total_modules: results.modules + results.skipped.modules,
      processed_modules: results.modules + results.skipped.modules,
      total_subjects: results.subjects + results.skipped.subjects,
      processed_subjects: results.subjects + results.skipped.subjects,
      total_lessons: totalLessonLikeItems,
      processed_lessons: totalLessonLikeItems,
      current_item: summaryMessage,
      errors: results.errors,
      completed: true,
      percentage: 100
    }, jobContext)

    await updateJob(jobContext, {
      status: 'completed',
      processed_items: totalLessonLikeItems,
      finished_at: new Date().toISOString(),
      current_step: 'Importação concluída',
      error: null,
    })
    await logJob(jobContext, 'info', 'Importação concluída', {
      summaryMessage,
      totalImported,
      totalSkipped,
    })
    
    console.log(`[IMPORT-BACKGROUND] Importação concluída com sucesso: ${importId}`)

  } catch (error: any) {
    console.error(`[IMPORT-BACKGROUND] Erro na importação ${importId}:`, error)
    await logJob(jobContext, 'error', 'Importação falhou', { message: error?.message })
    await updateJob(jobContext, {
      status: 'failed',
      error: error?.message ?? 'Erro ao processar importação',
      finished_at: new Date().toISOString(),
      current_step: 'Erro na importação',
    })
    
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
    }, jobContext)
  }
}

if (process.env.NODE_ENV === 'test') {
  // @ts-expect-error - exposed only for Vitest suites
  globalThis.__IMPORT_FROM_DRIVE_TESTABLES = {
    FOLDER_MIME_TYPE,
    ensureName,
    isTestFile,
    listFolderContents,
    parseGoogleDriveFolder,
    importToDatabase,
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
    
    // Criar job de importação
    const provider = 'google'
    const sourceMetadata = { driveUrl, folderId }

    const { data: jobRecord, error: jobError } = await supabase
      .from('file_import_jobs')
      .insert({
        user_id: user.id,
        course_id: courseId,
        source_identifier: folderId,
        provider,
        source_type: 'google_drive_folder',
        source_metadata: sourceMetadata as unknown as Json,
        status: 'queued',
        metadata: { importId }
      })
      .select()
      .single()

    if (jobError) {
      console.error('[IMPORT] Falha ao criar job de importação', jobError)
      return NextResponse.json(
        { error: 'Não foi possível iniciar o job de importação' },
        { status: 500 }
      )
    }

    const jobContext = jobRecord ? { jobId: jobRecord.id, supabase, provider } : undefined
    await logJob(jobContext, 'info', 'Job criado', { importId })
    
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
    }, jobContext)
    
    // Iniciar processamento em background (não aguardar resposta)
    after(async () => {
      try {
        await processImportInBackground(
          driveUrl,
          courseId,
          importId,
          user.id,
          folderId,
          jobRecord?.id,
          provider
        )
      } catch (error) {
        console.error('[IMPORT] Erro no processamento em background:', error)
      }
    })
    
    // Retornar imediatamente com o ID da importação
    return NextResponse.json({
      success: true,
      message: 'Importação iniciada. Acompanhe o progresso em tempo real.',
      importId,
      jobId: jobRecord?.id ?? null,
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
type ImportJobContext = {
  jobId: string
  supabase: SupabaseClient<Database>
  provider: string
}

async function logJob(
  job: ImportJobContext | undefined,
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, unknown>
) {
  if (!job) return
  try {
    const contextJson: Json | null = context ? (context as unknown as Json) : null
    await job.supabase.from('file_import_logs').insert({
      job_id: job.jobId,
      level,
      message,
      context: contextJson,
      provider: job.provider,
    })
    await job.supabase.from('file_import_events').insert({
      job_id: job.jobId,
      level,
      message,
      context: contextJson,
      provider: job.provider,
    })
  } catch (error) {
    console.error('[IMPORT][LOG] Falha ao registrar log', level, message, context, error)
  }
}

async function updateJob(
  job: ImportJobContext | undefined,
  updates: Partial<Database['public']['Tables']['file_import_jobs']['Update']>
) {
  if (!job) return
  try {
    const payload = job.provider ? { ...updates, provider: job.provider } : updates
    await job.supabase
      .from('file_import_jobs')
      .update(payload)
      .eq('id', job.jobId)
  } catch (error) {
    console.error('[IMPORT][JOB] Falha ao atualizar job', job.jobId, updates, error)
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  iterator: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  const executing: Promise<void>[] = []

  const enqueue = (item: T, index: number) => {
    const p = (async () => {
      results[index] = await iterator(item, index)
    })()
    executing.push(p.then(() => {
      const idx = executing.indexOf(p as any)
      if (idx >= 0) executing.splice(idx, 1)
    }))
  }

  items.forEach((item, index) => {
    enqueue(item, index)
    if (executing.length >= limit) {
      executing.shift()
    }
  })

  await Promise.all(executing)
  return results
}
