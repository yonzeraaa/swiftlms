import { parseSerializedEfrontDump } from './serialized-dump'

export interface EFrontUser {
  users_login: string
  users_email: string
  language: string
  users_name: string
  users_surname: string
  active: string
  user_type: string
  registration_date: string
  rowNumber: number
}

export const EFRONT_IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const FALLBACK_EFRONT_IMPORT_PASSWORD = 'Mudar123!'

const REQUIRED_HEADERS = [
  'users_login',
  'users_email',
  'users_name',
  'users_surname',
  'active',
  'user_type',
] as const

const SUPPORTED_DELIMITERS = [',', ';', '\t'] as const
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SERIALIZED_DUMP_PREFIX_REGEX = /^\s*a:\d+:\{/

type NormalizedHeader = (typeof REQUIRED_HEADERS)[number] | 'language' | 'registration_date'

export type ParsedEfrontImport = {
  users: EFrontUser[]
  errors: string[]
  warnings: string[]
  format: 'csv' | 'serialized'
}

export function getDefaultEfrontImportPassword() {
  return process.env.EFRONT_IMPORT_DEFAULT_PASSWORD?.trim() || FALLBACK_EFRONT_IMPORT_PASSWORD
}

export function buildImportedProfileCreatedAt(registrationDate: string | null | undefined) {
  const dateKey = getImportedDateKey(registrationDate)
  if (!dateKey) return null

  // Use noon UTC to preserve the calendar day when rendered in common time zones.
  return `${dateKey}T12:00:00.000Z`
}

export function getImportedDateKey(value: string | null | undefined) {
  const normalized = toSafeString(value)
  if (!normalized) return null

  const dayMonthYearMatch = normalized.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/)
  if (dayMonthYearMatch) {
    const [, day, month, year] = dayMonthYearMatch
    return isValidDateParts(Number(year), Number(month), Number(day))
      ? `${year}-${month}-${day}`
      : null
  }

  const isoDateMatch = normalized.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:$|[T\s])/)
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch
    return isValidDateParts(Number(year), Number(month), Number(day))
      ? `${year}-${month}-${day}`
      : null
  }

  if (/^\d{10,13}$/.test(normalized)) {
    const timestamp = Number.parseInt(normalized, 10)
    const milliseconds = normalized.length === 13 ? timestamp : timestamp * 1000
    const date = new Date(milliseconds)

    if (!Number.isNaN(date.getTime())) {
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  return null
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function buildImportedFullName(user: Pick<EFrontUser, 'users_name' | 'users_surname' | 'users_login' | 'users_email'>) {
  const fullName = `${user.users_name} ${user.users_surname}`.trim()
  if (fullName) return fullName
  if (user.users_login.trim()) return user.users_login.trim()
  return normalizeEmail(user.users_email)
}

export function mapRole(userType: string): 'student' | 'instructor' | 'admin' {
  switch (userType.trim().toLowerCase()) {
    case 'administrator':
      return 'admin'
    case 'professor':
    case 'teacher':
      return 'instructor'
    case 'student':
    default:
      return 'student'
  }
}

export function mapStatus(active: string): 'active' | 'frozen' {
  const normalized = active.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'active'
    ? 'active'
    : 'frozen'
}

export function parseAndValidateEfrontImport(inputText: string): ParsedEfrontImport {
  if (looksLikeSerializedDump(inputText)) {
    return parseAndValidateSerializedEfrontDump(inputText)
  }

  return parseAndValidateEfrontCsv(inputText)
}

export function parseAndValidateEfrontCsv(csvText: string): ParsedEfrontImport {
  const normalizedText = csvText.replace(/^\uFEFF/, '').trim()

  if (!normalizedText) {
    return {
      users: [] as EFrontUser[],
      errors: ['O arquivo CSV está vazio.'],
      warnings: [] as string[],
      format: 'csv',
    }
  }

  const delimiter = detectDelimiter(normalizedText)
  const rows = parseCsvRows(normalizedText, delimiter)

  if (rows.length === 0) {
    return {
      users: [] as EFrontUser[],
      errors: ['Não foi possível ler o conteúdo do CSV.'],
      warnings: [] as string[],
      format: 'csv',
    }
  }

  const headerRow = rows[0].map(cell => cell.trim())
  const headerIndexByName = new Map<NormalizedHeader, number>()

  headerRow.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header)
    if (normalizedHeader) {
      headerIndexByName.set(normalizedHeader, index)
    }
  })

  const missingHeaders = REQUIRED_HEADERS.filter(header => !headerIndexByName.has(header))
  if (missingHeaders.length > 0) {
    return {
      users: [] as EFrontUser[],
      errors: [
        `Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}.`,
      ],
      warnings: [] as string[],
      format: 'csv',
    }
  }

  const users: EFrontUser[] = []
  const errors: string[] = []
  const warnings: string[] = []
  const seenEmails = new Set<string>()

  rows.slice(1).forEach((row, rowIndex) => {
    if (row.every(cell => cell.trim() === '')) {
      return
    }

    const rowNumber = rowIndex + 2
    const read = (header: NormalizedHeader) => {
      const index = headerIndexByName.get(header)
      return typeof index === 'number' ? (row[index] || '').trim() : ''
    }

    const email = normalizeEmail(read('users_email'))
    if (!email) {
      errors.push(`Linha ${rowNumber}: users_email é obrigatório.`)
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      errors.push(`Linha ${rowNumber}: email inválido (${email}).`)
      return
    }

    if (seenEmails.has(email)) {
      warnings.push(`Linha ${rowNumber}: email duplicado ignorado (${email}).`)
      return
    }
    seenEmails.add(email)

    const login = read('users_login')
    if (!login) {
      errors.push(`Linha ${rowNumber}: users_login é obrigatório.`)
      return
    }

    users.push({
      users_login: login,
      users_email: email,
      language: read('language'),
      users_name: read('users_name'),
      users_surname: read('users_surname'),
      active: read('active'),
      user_type: read('user_type'),
      registration_date: read('registration_date'),
      rowNumber,
    })
  })

  if (users.length === 0 && errors.length === 0) {
    errors.push('Nenhum usuário válido foi encontrado no arquivo.')
  }

  return { users, errors, warnings, format: 'csv' }
}

function parseAndValidateSerializedEfrontDump(serializedText: string): ParsedEfrontImport {
  try {
    const records = parseSerializedEfrontDump(serializedText)
    const users: EFrontUser[] = []
    const errors: string[] = []
    const warnings: string[] = []
    const seenEmails = new Set<string>()

    records.forEach((record, index) => {
      const rowNumber = index + 1
      const email = normalizeEmail(toSafeString(record.email))

      if (!email) {
        errors.push(`Registro ${rowNumber}: email é obrigatório.`)
        return
      }

      if (!EMAIL_REGEX.test(email)) {
        errors.push(`Registro ${rowNumber}: email inválido (${email}).`)
        return
      }

      if (seenEmails.has(email)) {
        warnings.push(`Registro ${rowNumber}: email duplicado ignorado (${email}).`)
        return
      }
      seenEmails.add(email)

      const login = toSafeString(record.login)
      if (!login) {
        errors.push(`Registro ${rowNumber}: login é obrigatório.`)
        return
      }

      users.push({
        users_login: login,
        users_email: email,
        language: toSafeString(record.languages_NAME),
        users_name: toSafeString(record.name),
        users_surname: toSafeString(record.surname),
        active: toSafeString(record.active),
        user_type: toSafeString(record.user_type),
        registration_date: normalizeRegistrationDate(record.timestamp),
        rowNumber,
      })
    })

    if (users.length === 0 && errors.length === 0) {
      errors.push('Nenhum usuário válido foi encontrado no dump serializado.')
    }

    return {
      users,
      errors,
      warnings,
      format: 'serialized',
    }
  } catch (error: any) {
    return {
      users: [],
      errors: [error.message || 'Não foi possível interpretar o dump serializado do eFront.'],
      warnings: [],
      format: 'serialized',
    }
  }
}

function normalizeHeader(header: string): NormalizedHeader | null {
  const normalized = header.replace(/^\uFEFF/, '').trim().toLowerCase()

  switch (normalized) {
    case 'users_login':
    case 'users_email':
    case 'language':
    case 'users_name':
    case 'users_surname':
    case 'active':
    case 'user_type':
    case 'registration_date':
      return normalized
    default:
      return null
  }
}

function detectDelimiter(csvText: string) {
  const firstLine = csvText.split(/\r?\n/, 1)[0] || ''

  let selectedDelimiter = ','
  let highestCount = -1

  for (const delimiter of SUPPORTED_DELIMITERS) {
    const count = countDelimiterOccurrences(firstLine, delimiter)
    if (count > highestCount) {
      selectedDelimiter = delimiter
      highestCount = count
    }
  }

  return selectedDelimiter
}

function countDelimiterOccurrences(line: string, delimiter: string) {
  let count = 0
  let inQuotes = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]

    if (char === '"') {
      const next = line[index + 1]
      if (inQuotes && next === '"') {
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && char === delimiter) {
      count += 1
    }
  }

  return count
}

function parseCsvRows(csvText: string, delimiter: string) {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ''
  let inQuotes = false

  for (let index = 0; index < csvText.length; index++) {
    const char = csvText[index]

    if (char === '"') {
      const next = csvText[index + 1]

      if (inQuotes && next === '"') {
        currentValue += '"'
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentValue)
      currentValue = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && csvText[index + 1] === '\n') {
        index += 1
      }

      currentRow.push(currentValue)
      if (currentRow.some(cell => cell.trim() !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      currentValue = ''
      continue
    }

    currentValue += char
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue)
    if (currentRow.some(cell => cell.trim() !== '')) {
      rows.push(currentRow)
    }
  }

  return rows
}

function looksLikeSerializedDump(inputText: string) {
  return SERIALIZED_DUMP_PREFIX_REGEX.test(inputText.replace(/^\uFEFF/, ''))
}

function toSafeString(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function normalizeRegistrationDate(timestampValue: unknown) {
  const raw = toSafeString(timestampValue)
  if (!raw) return ''

  const timestamp = Number.parseInt(raw, 10)
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return raw
  }

  const date = new Date(timestamp * 1000)
  if (Number.isNaN(date.getTime())) {
    return raw
  }

  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${day}/${month}/${year}`
}

function isValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false
  }

  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}
