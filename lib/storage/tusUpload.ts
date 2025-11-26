import fs from 'fs'

const TUS_VERSION = '1.0.0'
const DEFAULT_CHUNK_SIZE = 6 * 1024 * 1024 // 6MB conforme documentação do Supabase
const DEFAULT_RETRY_ATTEMPTS = 4
const DEFAULT_RETRY_DELAY_MS = 1000

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getProjectRef(): string {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('Defina SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL para uploads TUS.')
  }

  const { hostname } = new URL(supabaseUrl)
  const projectRef = hostname.split('.')[0]
  if (!projectRef) {
    throw new Error('Não foi possível inferir o project ref a partir da URL do Supabase.')
  }
  return projectRef
}

function getTusEndpoint(): string {
  const projectRef = getProjectRef()
  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`
}

export interface TusUploadOptions {
  bucket: string
  objectPath: string
  filePath: string
  contentType: string
  metadata?: Record<string, unknown>
  chunkSize?: number
  serviceKey?: string
  signal?: AbortSignal
  onProgress?: (uploadedBytes: number, totalBytes: number) => void | Promise<void>
  retryAttempts?: number
}

function buildUploadMetadata(options: TusUploadOptions): string {
  const entries: Array<[string, string]> = [
    ['bucketName', options.bucket],
    ['objectName', options.objectPath],
    ['contentType', options.contentType],
    ['cacheControl', '3600'],
  ]

  if (options.metadata) {
    entries.push(['metadata', JSON.stringify(options.metadata)])
  }

  return entries
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key} ${Buffer.from(String(value)).toString('base64')}`)
    .join(',')
}

async function initiateTusUpload(options: TusUploadOptions, totalSize: number, endpoint: string, serviceKey: string): Promise<string> {
  const metadataHeader = buildUploadMetadata(options)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Tus-Resumable': TUS_VERSION,
      'Upload-Length': `${totalSize}`,
      'Upload-Metadata': metadataHeader,
      'x-upsert': 'true',
    },
  })

  if (response.status !== 201) {
    const errorText = await response.text()
    throw new Error(`Falha ao iniciar upload TUS: ${response.status} - ${errorText}`)
  }

  const location = response.headers.get('Location')
  if (!location) {
    throw new Error('Resposta do TUS sem cabeçalho Location.')
  }

  if (location.startsWith('http')) {
    return location
  }

  const origin = new URL(endpoint).origin
  return `${origin}${location}`
}

async function uploadChunk(
  uploadUrl: string,
  chunk: Buffer,
  offset: number,
  serviceKey: string,
  signal?: AbortSignal
): Promise<number> {
  const chunkUint8 = Uint8Array.from(chunk)

  const response = await fetch(uploadUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Tus-Resumable': TUS_VERSION,
      'Upload-Offset': `${offset}`,
      'Content-Type': 'application/offset+octet-stream',
    },
    body: chunkUint8,
    signal,
  })

  if (response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Falha ao enviar chunk (status ${response.status}): ${errorText}`)
  }

  const newOffsetHeader = response.headers.get('Upload-Offset')
  const newOffset = newOffsetHeader ? Number(newOffsetHeader) : offset + chunk.length
  return newOffset
}

export async function uploadFileWithTus(options: TusUploadOptions): Promise<{ uploadUrl: string; parts: number }> {
  const serviceKey = options.serviceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada para upload via TUS.')
  }

  const endpoint = getTusEndpoint()
  const stats = await fs.promises.stat(options.filePath)
  const totalSize = stats.size
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
  const retryAttempts = options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS

  const uploadUrl = await initiateTusUpload(options, totalSize, endpoint, serviceKey)

  const fileHandle = await fs.promises.open(options.filePath, 'r')
  let offset = 0
  let partNumber = 0

  try {
    while (offset < totalSize) {
      if (options.signal?.aborted) {
        throw new Error('Upload cancelado (signal aborted).')
      }

      const remaining = totalSize - offset
      const currentChunkSize = Math.min(chunkSize, remaining)
      const buffer = Buffer.allocUnsafe(currentChunkSize)
      const { bytesRead } = await fileHandle.read(buffer, 0, currentChunkSize, offset)

      if (bytesRead === 0) {
        break
      }

      const chunk = buffer.subarray(0, bytesRead)
      let attempt = 0
      let uploaded = false
      let lastError: unknown = null

      while (!uploaded && attempt <= retryAttempts) {
        try {
          const newOffset = await uploadChunk(uploadUrl, chunk, offset, serviceKey, options.signal)
          offset = newOffset
          uploaded = true
          partNumber += 1
          await options.onProgress?.(offset, totalSize)
        } catch (error) {
          lastError = error
          attempt += 1
          if (attempt > retryAttempts) {
            throw error
          }
          await wait(DEFAULT_RETRY_DELAY_MS * attempt)
        }
      }

      if (!uploaded && lastError) {
        throw lastError instanceof Error ? lastError : new Error('Falha ao enviar chunk via TUS')
      }
    }
  } finally {
    await fileHandle.close()
  }

  return { uploadUrl, parts: partNumber }
}
