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

type NormalizedHeader = (typeof REQUIRED_HEADERS)[number] | 'language' | 'registration_date'

export function getDefaultEfrontImportPassword() {
  return process.env.EFRONT_IMPORT_DEFAULT_PASSWORD?.trim() || FALLBACK_EFRONT_IMPORT_PASSWORD
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

export function parseAndValidateEfrontCsv(csvText: string) {
  const normalizedText = csvText.replace(/^\uFEFF/, '').trim()

  if (!normalizedText) {
    return {
      users: [] as EFrontUser[],
      errors: ['O arquivo CSV está vazio.'],
      warnings: [] as string[],
    }
  }

  const delimiter = detectDelimiter(normalizedText)
  const rows = parseCsvRows(normalizedText, delimiter)

  if (rows.length === 0) {
    return {
      users: [] as EFrontUser[],
      errors: ['Não foi possível ler o conteúdo do CSV.'],
      warnings: [] as string[],
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

  return { users, errors, warnings }
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
