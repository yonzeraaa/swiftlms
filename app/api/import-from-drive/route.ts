import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'
import { google, type drive_v3 } from 'googleapis'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database, Json } from '@/lib/database.types'
import { parseAnswerKeyFromText, type ParsedAnswerKeyEntry } from '../tests/utils/answer-key'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export const maxDuration = 300

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
type DriveClient = drive_v3.Drive

const DEFAULT_RETRY_ATTEMPTS = 6
const DEFAULT_RETRY_DELAY_MS = 300
// Aumentado de 60s para 5min para evitar timeout em operações longas
const DEFAULT_ACTION_TIMEOUT_MS = Number(process.env.GOOGLE_DRIVE_DEFAULT_TIMEOUT_MS ?? 300_000) // 5 minutos
const LIST_FOLDER_TIMEOUT_MS = Number(process.env.GOOGLE_DRIVE_LIST_TIMEOUT_MS ?? 300_000) // 5 minutos para listagens
const EXPORT_FILE_TIMEOUT_MS = Number(process.env.GOOGLE_DRIVE_EXPORT_TIMEOUT_MS ?? 180_000) // 3 minutos para exports
const RATE_LIMIT_WINDOW_MS = Number(process.env.GOOGLE_DRIVE_RATE_LIMIT_WINDOW_MS ?? 100_000)
const RATE_LIMIT_BUCKET_CAPACITY = Number(process.env.GOOGLE_DRIVE_RATE_LIMIT_TOKENS ?? 300)
const DEFAULT_REQUEST_COST = Number(process.env.GOOGLE_DRIVE_DEFAULT_REQUEST_COST ?? 1)
const LIST_REQUEST_COST = Number(process.env.GOOGLE_DRIVE_LIST_COST ?? 10)
const EXPORT_REQUEST_COST = Number(process.env.GOOGLE_DRIVE_EXPORT_COST ?? 10)
const RATE_LIMIT_COOLDOWN_MS = Number(process.env.GOOGLE_DRIVE_RATE_LIMIT_COOLDOWN_MS ?? 30_000)
const MAX_RATE_LIMIT_BACKOFF_MS = Number(process.env.GOOGLE_DRIVE_MAX_RATE_LIMIT_BACKOFF_MS ?? 30_000)
const MAX_DOC_EXPORT_BYTES = Number(process.env.GOOGLE_DRIVE_MAX_EXPORT_BYTES ?? 25 * 1024 * 1024)
const SUPPORTED_FILE_EXTENSION_REGEX = /\.(docx?|pdf|txt|pptx?|xlsx?|mp4|mp3|m4a|wav|avi|mov|zip|rar|png|jpg|jpeg|gif|svg|html?|css|js|json|xml|csv|odt|ods|odp)$/i

const TEST_KEYWORDS = [
  'teste',
  'test',
  'quiz',
  'avaliacao',
  'avaliacaofinal',
  'avaliacaoparcial',
  'avaliacaodiagnostica',
  'avaliacao',
  'avaliacoes',
  'prova',
  'provas',
  'assessment',
  'assessments',
  'exam',
  'exame',
  'exames',
  'simulado',
  'simulados',
  'gabarito',
  'checklist',
  'avaliacaointermediaria',
  'avaliacaocontinuada',
]

const TEST_FOLDER_KEYWORDS = [
  'teste',
  'testes',
  'test',
  'tests',
  'quiz',
  'quizzes',
  'avaliacao',
  'avaliacoes',
  'prova',
  'provas',
  'assessment',
  'assessments',
  'exam',
  'exames',
  'simulado',
  'simulados',
]

const LESSON_FOLDER_KEYWORDS = [
  'aulas',
  'lessons',
  'conteudo',
  'conteudos',
  'conteúdo',
  'materiais',
  'materials',
  'slides',
  'apresentacoes',
  'apresentações',
  'arquivos',
  'conteudo extra',
  'complementares',
]

// Regex mais rigoroso: exige mínimo 2 letras no prefixo
// Exemplos válidos: MLTA02, DLA0201, DLA020101
// Exemplos inválidos: A02, B0201, X020101 (apenas 1 letra)
const MODULE_CODE_REGEX = /^([a-z]{2,}[0-9]{2})(?=[\s._-]|$)/i
const SUBJECT_CODE_REGEX = /^([a-z]{2,}[0-9]{4})(?=[\s._-]|$)/i
const LESSON_CODE_REGEX = /^([a-z]{2,}[0-9]{6})(?=[\s._-]|$)/i

let rateLimitChain: Promise<void> = Promise.resolve()

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class TokenBucket {
  private readonly capacity: number
  private readonly refillIntervalMs: number
  private tokens: number
  private lastRefill: number

  constructor(capacity: number, refillIntervalMs: number) {
    this.capacity = Math.max(1, Number.isFinite(capacity) ? capacity : 1)
    this.refillIntervalMs = Math.max(1_000, Number.isFinite(refillIntervalMs) ? refillIntervalMs : 60_000)
    this.tokens = this.capacity
    this.lastRefill = Date.now()
  }

  async consume(cost: number) {
    const required = Math.max(0, Number.isFinite(cost) ? cost : 0)
    if (required === 0) return

    let waitAccumulated = 0

    while (true) {
      this.refill()
      if (this.tokens >= required) {
        this.tokens -= required
        if (waitAccumulated > 0) {
          console.log(
            `[GOOGLE][RATE_LIMIT] Tokens disponíveis novamente após aguardar ${waitAccumulated}ms (custo ${required}, capacidade ${this.capacity}).`
          )
        }
        return
      }
      const elapsed = Date.now() - this.lastRefill
      const waitMs = Math.max(200, this.refillIntervalMs - elapsed)
      waitAccumulated += waitMs
      console.log(
        `[GOOGLE][RATE_LIMIT] Tokens insuficientes (${this.tokens}/${required}). Aguardando ${waitMs}ms (acumulado ${waitAccumulated}ms) para renovar a janela.`
      )
      await wait(waitMs)
    }
  }

  private refill() {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    if (elapsed < this.refillIntervalMs) return

    this.tokens = this.capacity
    this.lastRefill = now
  }
}

const driveRateLimitBucket = new TokenBucket(RATE_LIMIT_BUCKET_CAPACITY, RATE_LIMIT_WINDOW_MS)

async function enforceDriveRateLimit(cost: number = DEFAULT_REQUEST_COST) {
  const normalizedCost = Math.max(DEFAULT_REQUEST_COST, Number.isFinite(cost) ? cost : DEFAULT_REQUEST_COST)
  const clampedCost = Math.min(normalizedCost, Math.max(DEFAULT_REQUEST_COST, RATE_LIMIT_BUCKET_CAPACITY))
  rateLimitChain = rateLimitChain.then(async () => {
    await driveRateLimitBucket.consume(clampedCost)
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

function getFileExtension(name: string | null | undefined): string | null {
  if (!name) return null
  const match = name.match(/\.([a-z0-9]+)$/i)
  return match ? match[1].toLowerCase() : null
}

function isVideoMimeType(mimeType: string | null | undefined, name?: string | null): boolean {
  const normalized = (mimeType ?? '').toLowerCase()
  if (normalized.startsWith('video/')) return true
  const ext = getFileExtension(name)
  if (!ext) return false
  return ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv'].includes(ext)
}

function isAudioMimeType(mimeType: string | null | undefined, name?: string | null): boolean {
  const normalized = (mimeType ?? '').toLowerCase()
  if (normalized.startsWith('audio/')) return true
  const ext = getFileExtension(name)
  if (!ext) return false
  return ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus', 'wma'].includes(ext)
}

function isMediaFile(item: drive_v3.Schema$File): boolean {
  return isVideoMimeType(item.mimeType ?? '', item.name ?? null) || isAudioMimeType(item.mimeType ?? '', item.name ?? null)
}

interface MediaFileInfo {
  moduleName: string
  subjectName: string
  itemName: string
  mimeType: string
  sizeBytes: number | null
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

interface RetryOptions {
  retries?: number
  delayMs?: number
  timeoutMs?: number
  rateLimitCost?: number
}

async function executeWithRetries<T>(
  label: string,
  action: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = DEFAULT_RETRY_ATTEMPTS,
    delayMs = DEFAULT_RETRY_DELAY_MS,
    timeoutMs = DEFAULT_ACTION_TIMEOUT_MS,
    rateLimitCost = DEFAULT_REQUEST_COST
  } = options

  let attempt = 0
  let error: unknown

  while (attempt < retries) {
    try {
      await enforceDriveRateLimit(rateLimitCost)
      console.log(`[DRIVE][EXEC] Executando ${label} (tentativa ${attempt + 1}/${retries}, timeout: ${timeoutMs}ms)`)
      const startTime = Date.now()
      const result = await withTimeout(label, action, timeoutMs)
      const duration = Date.now() - startTime
      console.log(`[DRIVE][EXEC] ✓ ${label} concluído em ${duration}ms`)
      return result
    } catch (err) {
      error = err
      attempt += 1
      const isTimeout = err instanceof TimeoutError
      const rateLimited = isRateLimitError(err)
      const exponentialDelay = delayMs * Math.pow(2, attempt)
      const computedDelay = rateLimited
        ? Math.min(MAX_RATE_LIMIT_BACKOFF_MS, Math.max(delayMs, exponentialDelay))
        : Math.max(delayMs, delayMs * attempt)
      const waitDuration = rateLimited
        ? Math.max(RATE_LIMIT_COOLDOWN_MS, computedDelay)
        : computedDelay
      console.warn(
        `[IMPORT][RETRY] ${label} falhou (tentativa ${attempt}/${retries})${rateLimited ? ' - rate limited' : isTimeout ? ' - TIMEOUT' : ''}`,
        err
      )
      if (attempt < retries) {
        console.log(`[IMPORT][RETRY] Aguardando ${waitDuration}ms antes de tentar novamente...`)
        await wait(waitDuration)
      }
    }
  }

  console.error(`[IMPORT][RETRY] ${label} falhou após ${retries} tentativas. Erro final:`, error)
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

function matchesKeyword(value: string | null | undefined, keywords: string[]) {
  if (!value) return false
  const normalized = normalizeForMatching(value)
  return keywords.some(keyword => normalized.includes(keyword))
}

function isTestFolderName(name: string) {
  return matchesKeyword(name, TEST_FOLDER_KEYWORDS)
}

interface ParsedStructuredName {
  code: string
  name: string
}

function parseStructuredName(rawName: string | null | undefined, pattern: RegExp): ParsedStructuredName | null {
  if (!rawName) return null
  const trimmed = rawName.trim()
  const match = trimmed.match(pattern)
  if (!match) {
    return null
  }

  const code = match[1].toUpperCase()
  let remainder = trimmed.slice(match[0].length)
  remainder = remainder.replace(/^[\s._:\-]+/, '').trim()
  const readableName = remainder.length > 0 ? remainder : trimmed

  return {
    code,
    name: readableName,
  }
}

async function listFolderContents(
  drive: DriveClient,
  folderId: string,
  querySuffix: string
) {
  const files: drive_v3.Schema$File[] = []
  let pageToken: string | undefined

  console.log(`[DRIVE][LIST] Listando conteúdo da pasta ${folderId}...`)

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
        }),
      { rateLimitCost: LIST_REQUEST_COST, timeoutMs: LIST_FOLDER_TIMEOUT_MS }
    )

    if (response.data.files) {
      files.push(...response.data.files)
      console.log(`[DRIVE][LIST] Pasta ${folderId}: ${response.data.files.length} itens encontrados (total: ${files.length})`)
    }

    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  console.log(`[DRIVE][LIST] Listagem completa da pasta ${folderId}: ${files.length} itens no total`)
  return files
}

/**
 * Detecta o tipo de item baseado no padrão de código no nome
 * - Módulos: LETRAS + 2 dígitos (ex: MLTA02)
 * - Disciplinas: LETRAS + 4 dígitos (ex: DLA0201)
 * - Aulas: LETRAS + 6 dígitos (ex: DLA020101)
 */
interface CodePattern {
  type: 'module' | 'subject' | 'lesson' | 'unknown'
  code: string
  prefix: string
  number: string
}

function extractCodePattern(name: string | null | undefined): CodePattern {
  if (!name) {
    return { type: 'unknown', code: '', prefix: '', number: '' }
  }

  // Remove extensões de arquivo
  const cleanName = name.replace(/\.[^.]+$/, '').trim()

  // Padrões de código (ordem importante: testar do mais específico para o menos específico)
  // Aula: LETRAS + 6 dígitos (ex: DLA020101)
  const lessonPattern = /^([A-Za-z]+)(\d{6})(?:\s|$|-|_)/
  // Disciplina: LETRAS + 4 dígitos (ex: DLA0201)
  const subjectPattern = /^([A-Za-z]+)(\d{4})(?:\s|$|-|_)/
  // Módulo: LETRAS + 2 dígitos (ex: MLTA02)
  const modulePattern = /^([A-Za-z]+)(\d{2})(?:\s|$|-|_)/

  // Testar do mais específico para o menos específico
  let match = cleanName.match(lessonPattern)
  if (match) {
    return {
      type: 'lesson',
      code: match[1] + match[2],
      prefix: match[1],
      number: match[2]
    }
  }

  match = cleanName.match(subjectPattern)
  if (match) {
    return {
      type: 'subject',
      code: match[1] + match[2],
      prefix: match[1],
      number: match[2]
    }
  }

  match = cleanName.match(modulePattern)
  if (match) {
    return {
      type: 'module',
      code: match[1] + match[2],
      prefix: match[1],
      number: match[2]
    }
  }

  return { type: 'unknown', code: '', prefix: '', number: '' }
}

function isModuleFolder(name: string | null | undefined): boolean {
  return extractCodePattern(name).type === 'module'
}

function isSubjectFolder(name: string | null | undefined): boolean {
  return extractCodePattern(name).type === 'subject'
}

function isLessonFile(name: string | null | undefined): boolean {
  return extractCodePattern(name).type === 'lesson'
}

function isTestFile(title: string) {
  return matchesKeyword(title, TEST_KEYWORDS)
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
        processed_tests: progress.processed_tests ?? null,
        total_tests: progress.total_tests ?? null,
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
        await executeWithRetries(
          'drive.files.list (ping)',
          () => drive.files.list({ pageSize: 1 }),
          { rateLimitCost: LIST_REQUEST_COST }
        )
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
    originalIndex: number
    name: string
    code?: string
    order: number
    skip?: boolean
    subjects: {
      originalIndex: number
      name: string
      code?: string
      existingId?: string
      order: number
      skip?: boolean
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

interface ParseResult {
  structure: CourseStructure
  totalModules?: number
  status?: 'cancelled'
  resumeState?: ImportResumeState | null
}

interface ImportRuntimeOptions {
  startTime: number
  maxRuntimeMs: number
  resumeState: ImportResumeState | null
  jobMetadata: Record<string, unknown>
  progressSnapshot: ProgressSnapshot
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

interface ParseOptions {
  collectMedia?: boolean
  mediaFiles?: MediaFileInfo[]
  resumeState?: ImportResumeState | null
  progressSnapshot?: ProgressSnapshot
  warnings?: string[]
}

interface ImportResumeState {
  moduleIndex: number
  subjectIndex: number
  itemIndex: number
}

interface ProgressSnapshot {
  processedModules: number
  processedSubjects: number
  processedLessons: number
  processedTests: number
  totalModules: number
  totalSubjects: number
  totalLessons: number
  totalTests: number
}

interface ImportChunkResult {
  status: 'completed' | 'partial' | 'cancelled'
  resumeState: ImportResumeState | null
  results: ReturnType<typeof createEmptyResults>
}

function createProgressSnapshot(progress?: {
  processed_modules: number | null
  processed_subjects: number | null
  processed_lessons: number | null
  processed_tests: number | null
  total_modules: number | null
  total_subjects: number | null
  total_lessons: number | null
  total_tests: number | null
} | null): ProgressSnapshot {
  return {
    processedModules: progress?.processed_modules ?? 0,
    processedSubjects: progress?.processed_subjects ?? 0,
    processedLessons: progress?.processed_lessons ?? 0,
    processedTests: progress?.processed_tests ?? 0,
    totalModules: progress?.total_modules ?? 0,
    totalSubjects: progress?.total_subjects ?? 0,
    totalLessons: progress?.total_lessons ?? 0,
    totalTests: progress?.total_tests ?? 0,
  }
}

/**
 * Verifica se o usuário solicitou o cancelamento da importação
 * Consulta o banco de dados para verificar a flag cancellation_requested
 *
 * @param jobContext - Contexto do job com Supabase client e jobId
 * @returns true se cancelamento foi solicitado, false caso contrário
 */
async function checkCancellationRequested(
  jobContext: ImportJobContext | undefined
): Promise<boolean> {
  if (!jobContext) {
    return false
  }

  try {
    const { data: job, error } = await jobContext.supabase
      .from('drive_import_jobs')
      .select('cancellation_requested, status')
      .eq('id', jobContext.jobId)
      .maybeSingle()

    if (error) {
      console.error('[CANCEL_CHECK] Error checking cancellation:', error)
      return false
    }

    // Retorna true se flag de cancelamento está ativa OU status é 'cancelled'
    return (job as any)?.cancellation_requested === true || (job as any)?.status === 'cancelled'
  } catch (error) {
    console.error('[CANCEL_CHECK] Exception checking cancellation:', error)
    return false
  }
}

async function parseGoogleDriveFolder(
  drive: DriveClient,
  folderId: string,
  courseId: string,
  importId?: string,
  supabase?: any,
  userId?: string,
  job?: ImportJobContext,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const structure: CourseStructure = { modules: [] }
  const resumeState = options.resumeState ?? null
  const resumeModuleIndex = resumeState?.moduleIndex ?? 0
  const progressSnapshot = options.progressSnapshot ?? createProgressSnapshot(null)

  // Determina se é resume baseado APENAS em progresso real no banco
  // Se há qualquer contador processado > 0, então há progresso = resume
  // Isso garante que Discovery rode na primeira execução (quando tudo é 0)
  // E que Discovery seja pulada quando há progresso (mesmo se resumeState for null)
  const isResume =
    progressSnapshot.processedModules > 0 ||
    progressSnapshot.processedSubjects > 0 ||
    progressSnapshot.processedLessons > 0 ||
    progressSnapshot.processedTests > 0

  let totalModules = isResume ? progressSnapshot.totalModules : 0
  let totalSubjects = isResume ? progressSnapshot.totalSubjects : 0
  let totalLessons = isResume ? progressSnapshot.totalLessons : 0
  let totalTests = isResume ? progressSnapshot.totalTests : 0
  let processedModules = isResume ? progressSnapshot.processedModules : 0
  let processedSubjects = isResume ? progressSnapshot.processedSubjects : 0
  let processedLessons = isResume ? progressSnapshot.processedLessons : 0
  let processedTests = isResume ? progressSnapshot.processedTests : 0

  console.log(`[IMPORT][INIT] Modo: ${isResume ? 'RESUME' : 'NOVA IMPORTAÇÃO'}`)
  if (!isResume) {
    console.log(`[IMPORT][INIT] Totais resetados - iniciando scan completo`)
  } else {
    console.log(`[IMPORT][INIT] Continuando de: módulo ${resumeModuleIndex}, totais: ${totalModules}M/${totalSubjects}D/${totalLessons}A/${totalTests}T`)
  }
  
  // Atualizar progresso se importId fornecido
  const updateProgress = async (progress: any) => {
    if (importId && supabase && userId && courseId) {
      // Garantir que processed_lessons e processed_tests sejam usados corretamente
      const processedLessonsValue = progress.processed_lessons !== undefined ? progress.processed_lessons : processedLessons
      const processedTestsValue = progress.processed_tests !== undefined ? progress.processed_tests : processedTests
      const fullProgress = {
        ...progress,
        processed_lessons: processedLessonsValue,
        processed_tests: processedTestsValue,
        percentage: totalModules + totalSubjects + totalLessons + totalTests > 0
          ? Math.round(((processedModules + processedSubjects + processedLessonsValue + processedTestsValue) / (totalModules + totalSubjects + totalLessons + totalTests)) * 100)
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

    console.log(`[IMPORT][SCAN] Encontradas ${items.length} pastas na raiz`)

    const moduleInfoCache = items.map((item, index) => {
      const displayName = ensureName(item.name, `Módulo ${index + 1}`)
      const parsed = parseStructuredName(displayName, MODULE_CODE_REGEX)

      if (parsed) {
        console.log(`[IMPORT][SCAN] ✓ Módulo válido detectado: "${displayName}" → Código: ${parsed.code}`)
      } else {
        const warningMessage = `Pasta '${displayName}' ignorada - não corresponde ao padrão de módulo (esperado: mín. 2 letras + 2 dígitos, ex: MLTA02)`
        options.warnings?.push(warningMessage)
        console.warn(`[IMPORT][SCAN] ✗ ${warningMessage}`)
      }

      return { displayName, parsed }
    })

    const validModules = moduleInfoCache.filter(info => info?.parsed)
    const invalidModules = moduleInfoCache.filter(info => !info?.parsed)

    console.log(`[IMPORT][SCAN] Resultado: ${validModules.length} módulos válidos, ${invalidModules.length} pastas ignoradas`)

    const remainingValidModules = moduleInfoCache.reduce((count, info, index) => {
      if (!info?.parsed) return count
      if (resumeState && index < resumeModuleIndex) return count
      return count + 1
    }, 0)

    // REMOVIDO: Não incrementa totalModules durante processamento
    // totalModules deve ser fixo após Discovery phase
    // if (remainingValidModules > 0) {
    //   const requiredModulesTotal = processedModules + remainingValidModules
    //   if (totalModules < requiredModulesTotal) {
    //     totalModules = requiredModulesTotal
    //   }
    // }

    console.log(`[IMPORT][SCAN] Processando ${remainingValidModules} módulos válidos`)

    const existingState = supabase && courseId
      ? await loadExistingCourseState(supabase, courseId)
      : null

    // FASE 1: DISCOVERY - Contar todos os itens antes de processar
    if (!isResume) {
      console.log(`╔══════════════════════════════════════════╗`)
      console.log(`║   FASE DISCOVERY - CONTANDO ITENS       ║`)
      console.log(`║   Modo: NOVA IMPORTAÇÃO                  ║`)
      console.log(`╚══════════════════════════════════════════╝`)
      await updateProgress({
        phase: 'scanning',
        current_step: 'FASE 1: Descobrindo estrutura',
        current_item: 'Contando módulos, disciplinas, aulas e testes antes de processar...',
        total_modules: 0,
        // NÃO reseta processed_modules - preserva progresso existente
        total_subjects: 0,
        // NÃO reseta processed_subjects - preserva progresso existente
        total_lessons: 0,
        // NÃO reseta processed_lessons - preserva progresso existente
        total_tests: 0,
        // NÃO reseta processed_tests - preserva progresso existente
        errors: []
      })

      let discoveredSubjects = 0
      let discoveredLessons = 0
      let discoveredTests = 0

      for (let moduleIndex = 0; moduleIndex < items.length; moduleIndex++) {
        const item = items[moduleIndex]
        const moduleInfo = moduleInfoCache[moduleIndex]

        if (!moduleInfo?.parsed) continue

        // Contar disciplinas do módulo
        const subjectCandidates = await listFolderContents(drive, item.id!, '')
        const subjects = subjectCandidates.filter(c => c.mimeType === FOLDER_MIME_TYPE)

        for (const subjectItem of subjects) {
          const subjectName = ensureName(subjectItem.name, `Disciplina`)
          const parsedSubject = parseStructuredName(subjectName, SUBJECT_CODE_REGEX)

          if (!parsedSubject) continue

          discoveredSubjects++

          const subjectAssets = await listFolderContents(drive, subjectItem.id!, '')
          const directFiles = subjectAssets.filter(a => a.mimeType !== FOLDER_MIME_TYPE)
          const nestedFolders = subjectAssets.filter(a => a.mimeType === FOLDER_MIME_TYPE)
          const forcedTestIds = new Set<string>()
          const aggregatedAssets: drive_v3.Schema$File[] = [...directFiles]

          for (const nestedFolder of nestedFolders) {
            const folderName = ensureName(nestedFolder.name, 'Subpasta')
            const nestedItems = await listFolderContents(drive, nestedFolder.id!, '')
            const nestedFiles = nestedItems.filter(item => item.mimeType !== FOLDER_MIME_TYPE)

            if (isTestFolderName(folderName)) {
              for (const nestedItem of nestedFiles) {
                if (nestedItem.id) {
                  forcedTestIds.add(nestedItem.id)
                }
              }
            }

            aggregatedAssets.push(...nestedFiles)
          }

          const classifiedForCount = aggregatedAssets
            .map(asset => {
              const itemName = asset.name || 'Arquivo sem nome'
              const baseName = (asset.name || '').replace(SUPPORTED_FILE_EXTENSION_REGEX, '')
              const formattedTitle = formatTitle(baseName || itemName)
              const parsedLesson = parseStructuredName(baseName || itemName, LESSON_CODE_REGEX)
              const lessonCode = parsedLesson?.code ?? null
              const forcedTest = asset.id ? forcedTestIds.has(asset.id) : false
              const mimeType = (asset.mimeType || '').toLowerCase()
              const isFormTest = mimeType === 'application/vnd.google-apps.form'
              const keywordTest = isTestFile(formattedTitle)
              const treatAsTest = forcedTest || isFormTest || keywordTest
              const matchesSubjectPrefix = lessonCode ? lessonCode.startsWith(parsedSubject.code) : false

              if (treatAsTest) return 'test'
              if (matchesSubjectPrefix) return 'lesson'
              return null
            })
            .filter(Boolean)

          // Contar testes e aulas separadamente
          const testsCount = classifiedForCount.filter(type => type === 'test').length
          const lessonsCount = classifiedForCount.filter(type => type === 'lesson').length

          discoveredTests += testsCount
          discoveredLessons += lessonsCount
        }
      }

      totalSubjects = discoveredSubjects
      totalLessons = discoveredLessons
      totalTests = discoveredTests

      console.log(`╔══════════════════════════════════════════╗`)
      console.log(`║   DISCOVERY COMPLETA!                   ║`)
      console.log(`║   Total: ${totalModules}M / ${totalSubjects}D / ${totalLessons}A / ${totalTests}T ║`)
      console.log(`╚══════════════════════════════════════════╝`)

      // Atualizar progresso com totais descobertos
      // IMPORTANTE: NÃO resetamos processed_* para preservar progresso em caso de retry
      await updateProgress({
        phase: 'processing',
        current_step: 'FASE 2: Iniciando processamento',
        total_modules: totalModules,
        // NÃO reseta processed_modules - preserva progresso existente
        total_subjects: totalSubjects,
        // NÃO reseta processed_subjects - preserva progresso existente
        total_lessons: totalLessons,
        // NÃO reseta processed_lessons - preserva progresso existente
        total_tests: totalTests,
        // NÃO reseta processed_tests - preserva progresso existente
        current_item: `✓ Encontrados ${totalModules} módulos, ${totalSubjects} disciplinas, ${totalLessons} aulas, ${totalTests} testes`,
        errors: []
      })
    } else {
      // Se for resume, atualizar progresso com totais salvos
      await updateProgress({
        phase: 'processing',
        current_step: 'Continuando importação',
        total_modules: totalModules,
        processed_modules: processedModules,
        total_subjects: totalSubjects,
        processed_subjects: processedSubjects,
        total_lessons: totalLessons,
        processed_lessons: processedLessons,
        total_tests: totalTests,
        processed_tests: processedTests,
        current_item: 'Preparando importação...',
        errors: []
      })
    }

    // Processar módulos (pastas de primeiro nível)
    for (let moduleIndex = 0; moduleIndex < items.length; moduleIndex++) {
      const item = items[moduleIndex]
      const moduleInfo = moduleInfoCache[moduleIndex]

      // VERIFICAÇÃO DE CANCELAMENTO: Checa se usuário cancelou a importação
      const shouldCancel = await checkCancellationRequested(job)
      if (shouldCancel) {
        console.log('[IMPORT] Cancelamento solicitado pelo usuário, parando processamento de módulos')
        return {
          status: 'cancelled',
          structure,
          resumeState: {
            moduleIndex,
            subjectIndex: 0,
            itemIndex: 0
          }
        }
      }

      if (resumeState && moduleIndex < resumeModuleIndex) {
        continue
      }

      if (!moduleInfo?.parsed) {
        console.warn(`[IMPORT] Pasta ignorada por não corresponder ao formato de módulo esperado: ${moduleInfo?.displayName ?? item.name}`)
        await logJob(job, 'warn', 'Módulo ignorado por nome inválido', {
          folderId: item.id,
          name: moduleInfo?.displayName ?? item.name ?? `Módulo ${moduleIndex + 1}`,
        })
        continue
      }

      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const moduleCode = moduleInfo.parsed.code
        const moduleRawName = ensureName(item.name, `Módulo ${moduleIndex + 1}`)
        const moduleDisplayName =
          moduleInfo.parsed.name.length > 0 ? `${moduleCode} - ${moduleInfo.parsed.name}` : moduleCode
        const moduleName = moduleDisplayName
        const courseModule = {
          originalIndex: moduleIndex,
          name: moduleDisplayName,
          code: moduleCode,
          order: moduleIndex + 1,
          subjects: [] as any[]
        }
        const normalizedModuleName = normalizeForMatching(moduleDisplayName)
        const normalizedRawModuleName = normalizeForMatching(moduleRawName)
        const existingModuleInfo =
          existingState?.modulesByName.get(normalizedModuleName) ??
          existingState?.modulesByName.get(normalizedRawModuleName)
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
        const resumeSubjectIndex = resumeState && moduleIndex === resumeModuleIndex ? resumeState.subjectIndex : null

        console.log(`[IMPORT][SCAN] Módulo "${moduleName}": encontradas ${subjects.length} pastas`)

        if (strayFiles.length > 0) {
          const warningMessage = `Arquivos soltos ignorados em '${courseModule.name}': ${strayFiles.map(file => ensureName(file.name, 'Arquivo sem nome')).join(', ')}`
          options.warnings?.push(warningMessage)
          console.warn(`  ${warningMessage}`)
        }

        const subjectEntries = subjects.map((candidate, index) => {
          const subjectRawName = ensureName(candidate.name, `${moduleName} - Disciplina ${index + 1}`)
          const parsed = parseStructuredName(subjectRawName, SUBJECT_CODE_REGEX)
          const subjectDisplayName = parsed
            ? parsed.name.length > 0
              ? `${parsed.code} - ${parsed.name}`
              : parsed.code
            : subjectRawName

          if (parsed) {
            console.log(`[IMPORT][SCAN]   ✓ Disciplina válida: "${subjectDisplayName}" → Código: ${parsed.code}`)
          } else {
            const warningMessage = `Disciplina '${subjectRawName}' ignorada - não corresponde ao padrão (esperado: mín. 2 letras + 4 dígitos, ex: DLA0201)`
            options.warnings?.push(warningMessage)
            console.warn(`[IMPORT][SCAN]   ✗ ${warningMessage}`)
          }

          return {
            item: candidate,
            rawName: subjectRawName,
            displayName: subjectDisplayName,
            parsed,
            originalIndex: index,
          }
        })

        const validSubjects = subjectEntries.filter(entry => entry.parsed)
        const invalidSubjects = subjectEntries.filter(entry => !entry.parsed)

        console.log(`[IMPORT][SCAN]   Resultado: ${validSubjects.length} disciplinas válidas, ${invalidSubjects.length} pastas ignoradas`)

        const remainingValidSubjects = subjectEntries.reduce((count, entry) => {
          if (!entry.parsed) return count
          if (resumeSubjectIndex !== null && entry.originalIndex < resumeSubjectIndex) return count
          return count + 1
        }, 0)

        console.log(`[IMPORT][SCAN]   Processando ${remainingValidSubjects} disciplinas válidas`)

        // REMOVIDO: Não incrementa totalSubjects durante processamento
        // totalSubjects deve ser fixo após Discovery phase
        // const requiredSubjectsTotal = processedSubjects + remainingValidSubjects
        // if (totalSubjects < requiredSubjectsTotal) {
        //   totalSubjects = requiredSubjectsTotal
        // }

        await logJob(job, 'info', 'Disciplinas listadas', {
          moduleName,
          moduleCode,
          subjectsFound: subjects.length,
          validSubjects: remainingValidSubjects,
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

        for (const subjectEntry of subjectEntries) {
          const subjectItem = subjectEntry.item
          const subjectIndex = subjectEntry.originalIndex
          const parsedSubject = subjectEntry.parsed

          // VERIFICAÇÃO DE CANCELAMENTO: Checa a cada disciplina
          const shouldCancel = await checkCancellationRequested(job)
          if (shouldCancel) {
            console.log('[IMPORT] Cancelamento solicitado pelo usuário, parando processamento de disciplinas')
            return {
              status: 'cancelled',
              structure,
              resumeState: {
                moduleIndex,
                subjectIndex,
                itemIndex: 0
              }
            }
          }

          if (!parsedSubject) {
            await logJob(job, 'warn', 'Disciplina ignorada por nome inválido', {
              moduleName,
              moduleCode,
              folderId: subjectItem.id,
              name: subjectEntry.displayName,
            })
            continue
          }

          if (resumeSubjectIndex !== null && subjectIndex < resumeSubjectIndex) {
            continue
          }

          if (subjectItem.mimeType === FOLDER_MIME_TYPE) {
            const subjectRawName = subjectEntry.rawName ?? subjectEntry.displayName
            const subjectName = subjectEntry.displayName
            const subjectReadableName = parsedSubject.name.length > 0 ? parsedSubject.name : subjectRawName
            const subjectCode = parsedSubject.code
            const normalizedSubjectName = normalizeForMatching(subjectName)
            const normalizedSubjectRawName = normalizeForMatching(subjectRawName)
            const normalizedReadableName = normalizeForMatching(subjectReadableName)
            let existingSubjectEntry = existingState?.subjectsByCode.get(subjectCode)
            if (existingSubjectEntry && existingSubjectEntry.moduleId !== existingModuleId) {
              existingSubjectEntry = undefined
            }
            if (!existingSubjectEntry) {
              existingSubjectEntry =
                existingSubjectsForModule?.get(normalizedSubjectName) ??
                existingSubjectsForModule?.get(normalizedSubjectRawName) ??
                existingSubjectsForModule?.get(normalizedReadableName)
            }
            const existingSubjectId = existingSubjectEntry?.id

            await logJob(job, 'info', 'Listando itens da disciplina', {
              moduleName,
              moduleCode,
              subjectName,
              subjectRawName,
              subjectCode,
              folderId: subjectItem.id,
            })

            const subjectAssets = await listFolderContents(drive, subjectItem.id!, '')
            const directFiles = subjectAssets.filter(asset => asset.mimeType !== FOLDER_MIME_TYPE)
            const nestedFolders = subjectAssets.filter(asset => asset.mimeType === FOLDER_MIME_TYPE)

            const collectedMediaIds = new Set<string>()
            const registerMediaAsset = (asset: drive_v3.Schema$File) => {
              if (!options.collectMedia || !options.mediaFiles) return
              if (!asset?.id) return
              if (collectedMediaIds.has(asset.id)) return
              if (!isMediaFile(asset)) return
              collectedMediaIds.add(asset.id)
              options.mediaFiles.push({
                moduleName,
                subjectName,
                itemName: ensureName(asset.name, 'Arquivo sem nome'),
                mimeType: asset.mimeType ?? 'desconhecido',
                sizeBytes: getDriveFileSizeBytes(asset) || null
              })
            }

            for (const mediaAsset of directFiles) {
              registerMediaAsset(mediaAsset)
            }

            const forcedTestIds = new Set<string>()
            const seenLessonIds = new Set<string>()
            const lessonAssets: drive_v3.Schema$File[] = []

            const addLessonAsset = (asset: drive_v3.Schema$File) => {
              if (!asset?.id) return
              if (seenLessonIds.has(asset.id)) return
              seenLessonIds.add(asset.id)
              lessonAssets.push(asset)
            }

            directFiles.forEach(addLessonAsset)

            for (const nestedFolder of nestedFolders) {
              const folderName = ensureName(nestedFolder.name, 'Subpasta')

              if (isTestFolderName(folderName)) {
                await logJob(job, 'info', 'Subpasta de testes detectada', {
                  moduleName,
                  moduleCode,
                  subjectName,
                  subjectCode,
                  folderName,
                })
                const nestedItems = await listFolderContents(drive, nestedFolder.id!, '')
                for (const nestedItem of nestedItems) {
                  if (nestedItem.mimeType === FOLDER_MIME_TYPE) {
                    const warningMessage = `Subpasta adicional encontrada dentro da pasta de testes "${folderName}" em ${subjectName}`
                    options.warnings?.push(warningMessage)
                    console.warn(`    ${warningMessage}`)
                    continue
                  }
                  registerMediaAsset(nestedItem)
                  if (nestedItem.id) {
                    forcedTestIds.add(nestedItem.id)
                  }
                  addLessonAsset(nestedItem)
                }
                continue
              }

              const treatAsLessons = matchesKeyword(folderName, LESSON_FOLDER_KEYWORDS)
              if (treatAsLessons) {
                await logJob(job, 'info', 'Subpasta de aulas detectada', {
                  moduleName,
                  moduleCode,
                  subjectName,
                  subjectCode,
                  folderName,
                })
              } else {
                const warningMessage = `Subpasta '${folderName}' encontrada em '${subjectName}' - conteúdo será tratado como aulas`
                options.warnings?.push(warningMessage)
                console.warn(`    ${warningMessage}`)
              }

              const nestedItems = await listFolderContents(drive, nestedFolder.id!, '')
              const nestedFiles = nestedItems.filter(item => item.mimeType !== FOLDER_MIME_TYPE)
              const deeperFolders = nestedItems.filter(item => item.mimeType === FOLDER_MIME_TYPE)

              for (const nestedFile of nestedFiles) {
                registerMediaAsset(nestedFile)
                addLessonAsset(nestedFile)
              }

              if (deeperFolders.length > 0) {
                const warningMessage = `Pastas adicionais encontradas dentro de '${folderName}' (${deeperFolders.length})`
                options.warnings?.push(warningMessage)
                console.warn(`    ${warningMessage}`)
              }
            }

            const isResumeSubject = resumeSubjectIndex !== null && subjectIndex === resumeSubjectIndex
            const resumeItemIndex = isResumeSubject ? (resumeState?.itemIndex ?? 0) : 0

            type ClassifiedAsset = {
              asset: drive_v3.Schema$File
              type: 'lesson' | 'test'
              baseName: string
              formattedTitle: string
              readableName: string
              code?: string
              parsed: ParsedStructuredName | null
            }

            const classifyAsset = (asset: drive_v3.Schema$File): ClassifiedAsset | null => {
              const itemName = asset.name || 'Arquivo sem nome'
              const baseName = (asset.name || '').replace(SUPPORTED_FILE_EXTENSION_REGEX, '')
              const formattedTitle = formatTitle(baseName || itemName)
              const parsedLesson = parseStructuredName(baseName || itemName, LESSON_CODE_REGEX)
              const lessonCode = parsedLesson?.code ?? null
              const readableName = parsedLesson?.name.length ? parsedLesson.name : formattedTitle
              const forcedTest = asset.id ? forcedTestIds.has(asset.id) : false
              const mimeType = (asset.mimeType || '').toLowerCase()
              const isFormTest = mimeType === 'application/vnd.google-apps.form'
              const keywordTest = isTestFile(formattedTitle)
              const treatAsTest = forcedTest || isFormTest || keywordTest
              const matchesSubjectPrefix = lessonCode ? lessonCode.startsWith(subjectCode) : false

              if (treatAsTest) {
                return {
                  asset,
                  type: 'test',
                  baseName,
                  formattedTitle,
                  readableName: readableName.length > 0 ? readableName : formattedTitle,
                  code: lessonCode ?? undefined,
                  parsed: parsedLesson ?? null,
                }
              }

              if (matchesSubjectPrefix) {
                return {
                  asset,
                  type: 'lesson',
                  baseName,
                  formattedTitle,
                  readableName: readableName.length > 0 ? readableName : formattedTitle,
                  code: lessonCode ?? undefined,
                  parsed: parsedLesson ?? null,
                }
              }

              const warningMessage = `Arquivo '${formattedTitle}' ignorado em '${subjectRawName}' - esperado código de aula iniciando com ${subjectCode}`
              options.warnings?.push(warningMessage)
              console.warn(`    ${warningMessage}`)
              return null
            }

            const classifiedAssets = lessonAssets
              .map(classifyAsset)
              .filter((asset): asset is ClassifiedAsset => asset !== null)

            const lessonsInSubject = classifiedAssets.filter(asset => asset.type === 'lesson').length
            const testsInSubject = classifiedAssets.length - lessonsInSubject

            let initialLessonOrder = 0
            let initialTestOrder = 0
            if (isResumeSubject && resumeItemIndex > 0) {
              const processedItems = classifiedAssets.slice(0, resumeItemIndex)
              for (const processedItem of processedItems) {
                if (processedItem.type === 'test') {
                  initialTestOrder += 1
                } else {
                  initialLessonOrder += 1
                }
              }
            }

            const pendingItems = isResumeSubject
              ? Math.max(classifiedAssets.length - resumeItemIndex, 0)
              : classifiedAssets.length

            // REMOVIDO: Não incrementa totalLessons durante processamento
            // totalLessons deve ser fixo após Discovery phase
            // const requiredLessonsTotal = processedLessons + pendingItems
            // if (totalLessons < requiredLessonsTotal) {
            //   totalLessons = requiredLessonsTotal
            // }

            const subject = {
              originalIndex: subjectIndex,
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

            console.log(
              `    Disciplina '${subjectName}': ${lessonsInSubject} aulas válidas e ${testsInSubject} testes identificados (de ${lessonAssets.length} arquivos)`
            )

            await logJob(job, 'info', 'Itens da disciplina listados', {
              moduleName,
              moduleCode,
              subjectName,
              subjectCode,
              lessonsFound: lessonsInSubject,
              testsFound: testsInSubject,
              totalFiles: lessonAssets.length,
              nestedFolders: nestedFolders.length,
            })

            // Processamento em lotes para evitar timeout
            const BATCH_SIZE = 5 // Processar 5 itens por vez
            const DELAY_BETWEEN_BATCHES = 25 // Delay curto entre lotes para reduzir uso da API
            
            let lessonOrder = initialLessonOrder
            let testOrder = initialTestOrder
            const validItems = classifiedAssets
            const startIndex = isResumeSubject ? resumeItemIndex : 0
            
            for (let batchStart = startIndex; batchStart < validItems.length; batchStart += BATCH_SIZE) {
              const batchEnd = Math.min(batchStart + BATCH_SIZE, validItems.length)
              const batch = validItems.slice(batchStart, batchEnd)

              // VERIFICAÇÃO DE CANCELAMENTO: Checa a cada batch de itens
              const shouldCancel = await checkCancellationRequested(job)
              if (shouldCancel) {
                console.log('[IMPORT] Cancelamento solicitado pelo usuário, parando processamento de items/batches')
                return {
                  status: 'cancelled',
                  structure,
                  resumeState: {
                    moduleIndex,
                    subjectIndex,
                    itemIndex: batchStart
                  }
                }
              }

              const batchNumber = Math.floor((batchStart - startIndex) / BATCH_SIZE) + 1

              console.log(`      Processando lote ${batchNumber}: ${batch.length} itens`)
              
              for (const entry of batch) {
                const lessonItem = entry.asset
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
                const driveLink = lessonItem.id ? `https://drive.google.com/file/d/${lessonItem.id}/view?usp=drivesdk` : ''
                const fileSizeBytes = getDriveFileSizeBytes(lessonItem)
                let completedLabel = entry.formattedTitle

                if (!driveLink) {
                  console.warn(`        Arquivo sem ID detectado, ignorando: ${itemName}`)
                  continue
                }

                if (entry.type === 'test') {
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
                  const testNameBase = entry.readableName.length > 0 ? entry.readableName : entry.formattedTitle
                  const testName = testNameBase.length > 0 ? testNameBase : `Teste ${testOrder}`

                  let extractedAnswerKey: ParsedAnswerKeyEntry[] | undefined
                  let requiresManualAnswerKey = true

                  const canAttemptAutoAnswerKey =
                    lessonItem.mimeType === 'application/vnd.google-apps.document' &&
                    fileSizeBytes <= MAX_DOC_EXPORT_BYTES

                  if (canAttemptAutoAnswerKey) {
                    try {
                      console.log(`        Tentando extrair gabarito do Google Docs: ${itemName}`)
                      if (job) {
                        await logJob(job, 'info', 'Exportando gabarito do teste', {
                          moduleName,
                          moduleCode,
                          subjectName,
                          subjectCode,
                          fileId: lessonItem.id,
                          itemName,
                          sizeBytes: fileSizeBytes || null
                        })
                      }
                      const exported = await executeWithRetries(
                        `drive.files.export (${lessonItem.id})`,
                        () =>
                          drive.files.export({
                            fileId: lessonItem.id!,
                            mimeType: 'text/plain'
                          }),
                        { timeoutMs: EXPORT_FILE_TIMEOUT_MS, retries: 3, rateLimitCost: EXPORT_REQUEST_COST }
                      )
                      const rawContent = typeof exported.data === 'string' ? exported.data : ''
                      if (rawContent.trim().length > 0) {
                        const parsed = parseAnswerKeyFromText(rawContent)
                        if (parsed.length > 0) {
                          extractedAnswerKey = parsed
                          requiresManualAnswerKey = false
                          if (job) {
                            await logJob(job, 'info', 'Gabarito extraído automaticamente', {
                              moduleName,
                              moduleCode,
                              subjectName,
                              subjectCode,
                              fileId: lessonItem.id,
                              itemName,
                              questions: parsed.length
                            })
                          }
                        }
                      }
                    } catch (answerKeyError) {
                      console.warn(`        Não foi possível extrair gabarito automático para ${itemName}:`, answerKeyError)
                      if (job) {
                        await logJob(job, 'warn', 'Falha ao extrair gabarito automaticamente', {
                          moduleName,
                          moduleCode,
                          subjectName,
                          subjectCode,
                          fileId: lessonItem.id,
                          itemName,
                          sizeBytes: fileSizeBytes || null,
                          error: answerKeyError instanceof Error ? answerKeyError.message : 'Erro desconhecido'
                        })
                      }
                    }
                  } else if (lessonItem.mimeType === 'application/vnd.google-apps.document' && job) {
                    await logJob(job, 'info', 'Gabarito não extraído automaticamente (arquivo acima do limite)', {
                      moduleName,
                      moduleCode,
                      subjectName,
                      subjectCode,
                      fileId: lessonItem.id,
                      itemName,
                      sizeBytes: fileSizeBytes || null,
                      limitBytes: MAX_DOC_EXPORT_BYTES
                    })
                  }

                  subject.tests.push({
                    name: testName,
                    code: entry.code,
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

                  const lessonCode = entry.code ?? `${subjectCode}${String(lessonOrder + 1).padStart(2, '0')}`
                  const lessonNameBase = entry.readableName.length > 0 ? entry.readableName : entry.formattedTitle
                  const lessonName = lessonNameBase.length > 0 ? lessonNameBase : `Aula ${lessonOrder + 1}`

                  const lesson: any = {
                    name: lessonName,
                    code: lessonCode,
                    order: lessonOrder + 1,
                    content: undefined as string | undefined,
                    contentType,
                    contentUrl: driveLink,
                    description: lessonCode ? `Aula ${lessonCode}: ${lessonName}` : `Aula: ${lessonName}`
                  }
                  lessonOrder += 1
                  completedLabel = lesson.code ? `${lesson.code} - ${lesson.name}` : lesson.name

                  if (mimeType === 'application/vnd.google-apps.document' || mimeType === 'application/vnd.google-apps.presentation') {
                    lesson.content = ''
                    lesson.contentUrl = driveLink
                    completedLabel = `${lesson.name} (conteúdo no Google Drive)`
                    if (job) {
                      await logJob(job, 'info', 'Conteúdo mantido no Google Drive', {
                        moduleName,
                        moduleCode,
                        subjectName,
                        subjectCode,
                        fileId: lessonItem.id,
                        itemName,
                        mimeType,
                        sizeBytes: fileSizeBytes || null
                      })
                    }
                  } else {
                    lesson.content = `[Arquivo referenciado: ${itemName}]`
                  }

                  subject.lessons.push(lesson)
                  existingState?.existingLessonUrls?.add(driveLink)
                  console.log(`      Aula adicionada: '${lesson.code ? `${lesson.code} - ` : ''}${lesson.name}' (tipo: ${lessonItem.mimeType})`)
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

              if (batchEnd < validItems.length) {
                console.log(`      Aguardando ${DELAY_BETWEEN_BATCHES}ms antes do próximo lote...`)
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
              }
            }
            
            console.log(`    Total processado para '${subject.name}': ${subject.lessons.length} aulas e ${subject.tests.length} testes`)

            const subjectHasNewContent = subject.lessons.length > 0 || subject.tests.length > 0
            const subjectIsNew = !existingSubjectId

            if (subjectHasNewContent || subjectIsNew) {
              courseModule.subjects.push(subject)
            } else {
              const shouldForceSkipSubject =
                resumeState !== null &&
                moduleIndex === resumeModuleIndex &&
                resumeSubjectIndex !== null &&
                subjectIndex === resumeSubjectIndex

              if (shouldForceSkipSubject) {
                console.log(`    Disciplina '${subject.name}' já concluída anteriormente. Avançando estado de resume.`)
                courseModule.subjects.push({
                  ...subject,
                  lessons: [],
                  tests: [],
                  skip: true,
                })
              } else {
                console.log(`    Nenhum item novo encontrado para '${subject.name}', pulando disciplina.`)
              }
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
          const shouldForceSkipModule =
            resumeState !== null &&
            moduleIndex === resumeModuleIndex

          if (shouldForceSkipModule) {
            console.log(`  Módulo '${courseModule.name}' já concluído anteriormente. Avançando estado de resume.`)
            structure.modules.push({
              ...courseModule,
              subjects: [],
              skip: true,
            })
          } else {
            console.log(`  Nenhum conteúdo novo encontrado para o módulo '${courseModule.name}', pulando.`)
          }
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

    return { structure, totalModules }
  } catch (error) {
    console.error('Erro ao processar pasta do Google Drive:', error)
    throw error
  }
}

function createEmptyResults() {
  return {
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
    errors: [] as string[],
  }
}

async function importToDatabase(
  structure: CourseStructure,
  courseId: string,
  supabase: any,
  importId?: string,
  userId?: string,
  user?: any,
  job?: ImportJobContext,
  options?: ImportRuntimeOptions
): Promise<ImportChunkResult> {
  const results = createEmptyResults()
  const startTime = options?.startTime ?? Date.now()
  const maxRuntimeMs = options?.maxRuntimeMs ?? 45_000
  const resumeState = options?.resumeState ?? null
  const jobMetadata = options?.jobMetadata ?? {}
  const progressSnapshot = options?.progressSnapshot ?? createProgressSnapshot(null)

  let processedModules = progressSnapshot.processedModules
  let processedSubjects = progressSnapshot.processedSubjects
  let processedLessons = progressSnapshot.processedLessons
  let processedTests = progressSnapshot.processedTests

  const shouldYield = () => Date.now() - startTime >= maxRuntimeMs

  const resumeModuleIndex = resumeState?.moduleIndex ?? 0
  const resumeSubjectIndex = resumeState?.subjectIndex ?? 0
  const resumeItemIndex = resumeState?.itemIndex ?? 0

  let currentResumeState: ImportResumeState = resumeState ?? {
    moduleIndex: resumeModuleIndex,
    subjectIndex: resumeSubjectIndex,
    itemIndex: resumeItemIndex,
  }

  const persistResume = async (state: ImportResumeState) => {
    currentResumeState = state
    await updateResumeState(job, jobMetadata, state)
  }

  // Função para atualizar progresso durante importação
  const updateDatabaseProgress = async (
    step: string,
    item: string,
    extra?: Record<string, string | number | boolean | null>
  ) => {
    if (importId && supabase && userId) {
      // Sempre inclui contadores atuais para persistir no banco
      await updateImportProgress(supabase, importId, userId, courseId, {
        current_step: step,
        current_item: item,
        processed_modules: processedModules,
        processed_subjects: processedSubjects,
        processed_lessons: processedLessons,
        processed_tests: processedTests,
        ...extra,
      }, job)
    }
    await logJob(job, 'info', step, { item, ...extra })
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
      const moduleOriginalIndex = moduleData.originalIndex ?? (resumeModuleIndex + moduleIdx)

      // VERIFICAÇÃO DE CANCELAMENTO: Checa antes de importar cada módulo
      const shouldCancel = await checkCancellationRequested(job)
      if (shouldCancel) {
        console.log('[IMPORT] Cancelamento solicitado pelo usuário, parando importação para banco')
        await updateDatabaseProgress(
          'Importação cancelada pelo usuário',
          'Operação interrompida'
        )
        return {
          status: 'cancelled',
          resumeState: { moduleIndex: moduleOriginalIndex, subjectIndex: 0, itemIndex: 0 },
          results
        }
      }

      await persistResume({ moduleIndex: moduleOriginalIndex, subjectIndex: 0, itemIndex: 0 })

      if (moduleData.skip) {
        console.log(`Módulo ${moduleData.name} marcado como concluído anteriormente. Avançando resume.`)
        processedModules++
        results.skipped.modules++
        // Persistir contador atualizado no banco
        await updateDatabaseProgress(
          `Módulo ${moduleIdx + 1}/${structure.modules.length} já processado`,
          `Módulo: ${moduleData.name} (pulado)`
        )
        await persistResume({
          moduleIndex: moduleOriginalIndex + 1,
          subjectIndex: 0,
          itemIndex: 0,
        })
        if (shouldYield()) {
          return { status: 'partial', resumeState: currentResumeState, results }
        }
        continue
      }

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
            order_index: startModuleIndex + results.modules,
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
        const subjectOriginalIndex = subjectData.originalIndex ?? subjectIdx
        const isResumingSubject =
          moduleOriginalIndex === resumeModuleIndex && subjectOriginalIndex === resumeSubjectIndex
        let subjectItemIndex = isResumingSubject ? resumeItemIndex : 0

        if (subjectData.skip) {
          console.log(`Disciplina ${subjectData.name} marcada como concluída anteriormente. Avançando resume.`)
          processedSubjects++
          results.skipped.subjects++
          // Persistir contador atualizado no banco
          await updateDatabaseProgress(
            `Disciplina ${subjectIdx + 1}/${moduleData.subjects.length} já processada`,
            `Disciplina: ${subjectData.name} (pulada)`
          )
          await persistResume({
            moduleIndex: moduleOriginalIndex,
            subjectIndex: subjectOriginalIndex + 1,
            itemIndex: 0,
          })
          if (shouldYield()) {
            return { status: 'partial', resumeState: currentResumeState, results }
          }
          continue
        }

        await persistResume({
          moduleIndex: moduleOriginalIndex,
          subjectIndex: subjectOriginalIndex,
          itemIndex: subjectItemIndex,
        })

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
            processedLessons++
            // Persistir contador atualizado no banco
            await updateDatabaseProgress(
              `Aula ${processedLessons} já existe`,
              `Aula: ${fullTitle} (pulada)`
            )
            subjectItemIndex += 1
            await persistResume({
              moduleIndex: moduleOriginalIndex,
              subjectIndex: subjectOriginalIndex,
              itemIndex: subjectItemIndex,
            })
            if (shouldYield()) {
              return { status: 'partial', resumeState: currentResumeState, results }
            }
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
          processedLessons++
          // Persistir contador atualizado no banco
          await updateDatabaseProgress(
            `Aula ${processedLessons} importada`,
            `Aula: ${lessonData.name}`
          )
          subjectItemIndex += 1
          await persistResume({
            moduleIndex: moduleOriginalIndex,
            subjectIndex: subjectOriginalIndex,
            itemIndex: subjectItemIndex,
          })
          if (shouldYield()) {
            return { status: 'partial', resumeState: currentResumeState, results }
          }
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
          processedTests++
          // Persistir contador atualizado no banco
          await updateDatabaseProgress(
            `Teste ${processedTests} sem link`,
            `Teste: ${testTitle} (ignorado - sem link)`
          )
          subjectItemIndex += 1
          await persistResume({
            moduleIndex: moduleOriginalIndex,
            subjectIndex: subjectOriginalIndex,
            itemIndex: subjectItemIndex,
          })
          if (shouldYield()) {
            return { status: 'partial', resumeState: currentResumeState, results }
          }
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
          processedTests++
          // Persistir contador atualizado no banco
          await updateDatabaseProgress(
            `Teste ${processedTests} já existe`,
            `Teste: ${testTitle} (pulado)`
          )
          subjectItemIndex += 1
          await persistResume({
            moduleIndex: moduleOriginalIndex,
            subjectIndex: subjectOriginalIndex,
            itemIndex: subjectItemIndex,
          })
          if (shouldYield()) {
            return { status: 'partial', resumeState: currentResumeState, results }
          }
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
        processedTests++
        // Persistir contador atualizado no banco
        await updateDatabaseProgress(
          `Teste ${processedTests} importado`,
          `Teste: ${testTitle}`
        )
        subjectItemIndex += 1
        await persistResume({
          moduleIndex: moduleOriginalIndex,
          subjectIndex: subjectOriginalIndex,
          itemIndex: subjectItemIndex,
        })
        if (shouldYield()) {
          return { status: 'partial', resumeState: currentResumeState, results }
        }
      }

      processedSubjects++
      // Persistir contador atualizado no banco
      await updateDatabaseProgress(
        `Disciplina ${processedSubjects} concluída`,
        `Disciplina: ${subjectData.name}`
      )
      await persistResume({
        moduleIndex: moduleOriginalIndex,
        subjectIndex: subjectOriginalIndex + 1,
        itemIndex: 0,
      })
      if (shouldYield()) {
        return { status: 'partial', resumeState: currentResumeState, results }
      }
      } // Fim do loop de subjects

      processedModules++
      // Persistir contador atualizado no banco
      await updateDatabaseProgress(
        `Módulo ${processedModules} concluído`,
        `Módulo: ${moduleData.name}`
      )
      await persistResume({
        moduleIndex: moduleOriginalIndex + 1,
        subjectIndex: 0,
        itemIndex: 0,
      })
      if (shouldYield()) {
        return { status: 'partial', resumeState: currentResumeState, results }
      }
    } // Fim do loop de modules
    
    return { status: 'completed', resumeState: null, results }
  } catch (error) {
    console.error('Erro ao importar para o banco de dados:', error)
    throw error
  }
}

// Função para processamento assíncrono em background
export async function processImportInBackground(
  driveUrl: string,
  courseId: string,
  importId: string,
  userId: string,
  folderId: string,
  jobId?: string,
  supabaseClient?: SupabaseClient<Database>
) {
  const supabase = supabaseClient ?? createAdminClient()
  const jobContext = jobId ? { jobId, supabase } : undefined
  const startTime = Date.now()
  const maxRuntimeMs = Number(process.env.GOOGLE_DRIVE_IMPORT_CHUNK_MAX_MS ?? 45_000)

  try {
    let jobMetadata = await loadJobMetadata(jobContext)
    const resumeState = (jobMetadata?.resume_state as ImportResumeState | null) ?? null

    const { data: progressRow } = await supabase
      .from('import_progress')
      .select('processed_modules, processed_subjects, processed_lessons, processed_tests, total_modules, total_subjects, total_lessons, total_tests')
      .eq('id', importId)
      .maybeSingle()

    const progressSnapshot = createProgressSnapshot(progressRow as any ?? null)
    const isFirstRun = !resumeState && progressSnapshot.processedModules === 0 && progressSnapshot.processedSubjects === 0 && progressSnapshot.processedLessons === 0

    console.log(`[IMPORT-BACKGROUND] Iniciando chunk de importação ${importId}`)

    if (isFirstRun) {
      await updateJob(jobContext, {
        status: 'indexing',
        started_at: new Date().toISOString(),
        error: null,
      })
      await logJob(jobContext, 'info', 'Job iniciado', { importId, courseId })
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
    } else {
      await updateJob(jobContext, {
        status: 'processing',
        current_step: resumeState
          ? 'Retomando importação em andamento'
          : 'Processando conteúdo adicional'
      })
      await logJob(jobContext, 'info', 'Retomando importação', { importId, resumeState })
    }

    console.log(`[IMPORT-BACKGROUND] Autenticando Google Drive...`)
    const drive = await authenticateGoogleDrive()
    await logJob(jobContext, 'info', 'Autenticação concluída')

    console.log(`[IMPORT-BACKGROUND] === FASE 2: Processando conteúdo ===`)
    const parseResult = await parseGoogleDriveFolder(
      drive,
      folderId,
      courseId,
      importId,
      supabase,
      userId,
      jobContext,
      {
        resumeState,
        progressSnapshot,
      }
    )

    if (parseResult.structure.modules.length === 0) {
      if (!resumeState && parseResult.totalModules === 0) {
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
        return { status: 'completed', resumeState: null, results: createEmptyResults() }
      }

      // Nada mais para processar - finalizar
      await clearResumeState(jobContext, jobMetadata)
      await updateJob(jobContext, {
        status: 'completed',
        current_step: 'Importação concluída',
        finished_at: new Date().toISOString(),
      })
      await logJob(jobContext, 'info', 'Importação concluída', { importId, resumeState, note: 'Nada restante para processar' })
      return { status: 'completed', resumeState: null, results: createEmptyResults() }
    }

    console.log(`[IMPORT-BACKGROUND] === FASE 3: Salvando no banco ===`)
    await updateJob(jobContext, { status: 'saving', current_step: 'Salvando no banco de dados' })

    const importChunk = await importToDatabase(
      parseResult.structure,
      courseId,
      supabase,
      importId,
      userId,
      undefined,
      jobContext,
      {
        startTime,
        maxRuntimeMs,
        resumeState,
        jobMetadata,
        progressSnapshot,
      }
    )

    if (importChunk.status === 'partial') {
      await updateJob(jobContext, {
        status: 'processing',
        current_step: 'Execução parcial agendada para continuar',
        metadata: jobMetadata as Json,
      })
      await logJob(jobContext, 'info', 'Chunk parcial processado', {
        resumeState: importChunk.resumeState,
        elapsed_ms: Date.now() - startTime,
      })
      return importChunk
    }

    await clearResumeState(jobContext, jobMetadata)

    const results = importChunk.results
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
      metadata: jobMetadata as Json,
    })
    await logJob(jobContext, 'info', 'Importação concluída', {
      summaryMessage,
      totalImported,
      totalSkipped,
    })

    console.log(`[IMPORT-BACKGROUND] Importação concluída com sucesso: ${importId}`)
    return { status: 'completed', resumeState: null, results }

  } catch (error: any) {
    console.error(`[IMPORT-BACKGROUND] Erro na importação ${importId}:`, error)
    await logJob(jobContext, 'error', 'Importação falhou', { message: error?.message })
    await updateJob(jobContext, {
      status: 'failed',
      error: error?.message ?? 'Erro ao processar importação',
      finished_at: new Date().toISOString(),
      current_step: 'Erro na importação',
    })

    await updateImportProgress(supabase, importId, userId, courseId, {
      current_step: 'Erro na importação',
      current_item: error.message || 'Erro desconhecido',
      errors: [error.message || 'Erro ao processar importação'],
      completed: true,
      percentage: 0
    }, jobContext)

    return { status: 'completed', resumeState: null, results: createEmptyResults() }
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

/**
 * DELETE endpoint - Cancela uma importação em andamento
 * Define a flag cancellation_requested no banco para que os loops parem gracefully
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Extrair jobId e importId dos query params
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    const importId = searchParams.get('importId')

    if (!jobId || !importId) {
      return NextResponse.json(
        { error: 'jobId e importId são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o job pertence ao usuário
    const { data: job, error: jobError } = await supabase
      .from('drive_import_jobs')
      .select('id, user_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job não encontrado' },
        { status: 404 }
      )
    }

    if (job.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Você não tem permissão para cancelar este job' },
        { status: 403 }
      )
    }

    // Atualizar flag de cancelamento no job
    const { error: updateJobError } = await supabase
      .from('drive_import_jobs')
      .update({
        cancellation_requested: true,
        cancelled_at: new Date().toISOString(),
        status: 'cancelled'
      } as any)
      .eq('id', jobId)

    if (updateJobError) {
      console.error('[CANCEL] Erro ao atualizar job:', updateJobError)
      return NextResponse.json(
        { error: 'Erro ao cancelar importação' },
        { status: 500 }
      )
    }

    // Atualizar status da importação
    const { error: updateImportError } = await supabase
      .from('import_progress')
      .update({
        current_step: 'Cancelado pelo usuário',
        current_item: 'Importação interrompida',
        completed: true
      })
      .eq('id', importId)

    if (updateImportError) {
      console.error('[CANCEL] Erro ao atualizar import_progress:', updateImportError)
    }

    console.log(`[CANCEL] Cancelamento solicitado para job ${jobId} pelo usuário ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Cancelamento solicitado com sucesso'
    })
  } catch (error) {
    console.error('[CANCEL] Erro ao processar cancelamento:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar cancelamento' },
      { status: 500 }
    )
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
    const progressToken = randomUUID().replace(/-/g, '')

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
    const { data: jobRecord, error: jobError } = await supabase
      .from('drive_import_jobs')
      .insert({
        user_id: user.id,
        course_id: courseId,
        folder_id: folderId,
        status: 'queued',
        metadata: {
          importId,
          progressToken,
          resume_state: {
            moduleIndex: 0,
            subjectIndex: 0,
            itemIndex: 0,
          } satisfies ImportResumeState,
        }
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

    const jobContext = jobRecord ? { jobId: jobRecord.id, supabase } : undefined
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
    
    // Disparar evento Inngest para processamento em background
    // O Inngest garante execução confiável com timeout de até 4 horas
    await inngest.send({
      name: 'drive/import.requested',
      data: {
        driveUrl,
        courseId,
        importId,
        userId: user.id,
        folderId,
        jobId: jobRecord?.id,
        progressToken,
      }
    })
    
    // Retornar imediatamente com o ID da importação
    return NextResponse.json({
      success: true,
      message: 'Importação iniciada. Acompanhe o progresso em tempo real.',
      importId,
      jobId: jobRecord?.id ?? null,
      progressToken,
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
    await job.supabase.from('drive_import_logs').insert({
      job_id: job.jobId,
      level,
      message,
      context: contextJson,
    })
    await job.supabase.from('drive_import_events').insert({
      job_id: job.jobId,
      level,
      message,
      context: contextJson,
    })
  } catch (error) {
    console.error('[IMPORT][LOG] Falha ao registrar log', level, message, context, error)
  }
}

async function updateJob(
  job: ImportJobContext | undefined,
  updates: Partial<Database['public']['Tables']['drive_import_jobs']['Update']>
) {
  if (!job) return
  try {
    await job.supabase
      .from('drive_import_jobs')
      .update(updates)
      .eq('id', job.jobId)
  } catch (error) {
    console.error('[IMPORT][JOB] Falha ao atualizar job', job.jobId, updates, error)
  }
}

async function loadJobMetadata(job: ImportJobContext | undefined) {
  if (!job) return {}
  try {
    const { data, error } = await job.supabase
      .from('drive_import_jobs')
      .select('metadata')
      .eq('id', job.jobId)
      .single()

    if (error) {
      console.error('[IMPORT][JOB] Falha ao carregar metadata do job', job.jobId, error)
      return {}
    }

    const metadata = (data?.metadata as Record<string, unknown>) ?? {}
    return { ...metadata }
  } catch (error) {
    console.error('[IMPORT][JOB] Erro inesperado ao carregar metadata do job', job?.jobId, error)
    return {}
  }
}

async function persistJobMetadata(
  job: ImportJobContext | undefined,
  metadata: Record<string, unknown>
) {
  if (!job) return
  try {
    await job.supabase
      .from('drive_import_jobs')
      .update({ metadata: metadata as Json })
      .eq('id', job.jobId)
  } catch (error) {
    console.error('[IMPORT][JOB] Falha ao persistir metadata', job.jobId, metadata, error)
  }
}

async function updateResumeState(
  job: ImportJobContext | undefined,
  metadata: Record<string, unknown>,
  state: ImportResumeState
) {
  metadata.resume_state = state
  await persistJobMetadata(job, metadata)
}

async function clearResumeState(
  job: ImportJobContext | undefined,
  metadata: Record<string, unknown>
) {
  if (metadata.resume_state) {
    delete metadata.resume_state
    await persistJobMetadata(job, metadata)
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
