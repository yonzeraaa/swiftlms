import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type Options = {
  inputPath: string
  outputPath: string
  userType: string | null
}

type EFrontUser = {
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

type SerializedEfrontRecord = Record<string, unknown>

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const inputText = await readFile(options.inputPath, 'utf8')
  const parsed = await parseSerializedDumpToUsers(inputText)

  if (parsed.errors.length > 0) {
    throw new Error(`Falha ao converter o arquivo do eFront:\n${parsed.errors.join('\n')}`)
  }

  const users = options.userType
    ? parsed.users.filter(user => user.user_type.trim().toLowerCase() === options.userType)
    : parsed.users

  const csv = buildCsv(users)
  await mkdir(path.dirname(options.outputPath), { recursive: true })
  await writeFile(options.outputPath, csv, 'utf8')

  process.stdout.write([
    `Formato detectado: ${parsed.format}`,
    `Registros válidos: ${parsed.users.length}`,
    options.userType
      ? `Registros exportados (${options.userType}): ${users.length}`
      : `Registros exportados: ${users.length}`,
    `Avisos: ${parsed.warnings.length}`,
    `CSV gerado em: ${options.outputPath}`,
  ].join('\n') + '\n')

  if (parsed.warnings.length > 0) {
    process.stdout.write(`Primeiros avisos:\n${parsed.warnings.slice(0, 10).join('\n')}\n`)
  }
}

function parseArgs(args: string[]): Options {
  const inputPath = args[0]
  const outputPath = args[1] || '/tmp/efront-users-converted.csv'

  if (!inputPath) {
    throw new Error('Uso: node --experimental-transform-types scripts/convert-efront-users-dump.ts <input> [output] [--user-type student]')
  }

  let userType: string | null = null
  const userTypeIndex = args.indexOf('--user-type')
  if (userTypeIndex >= 0) {
    userType = (args[userTypeIndex + 1] || '').trim().toLowerCase() || null
  }

  return {
    inputPath,
    outputPath,
    userType,
  }
}

function buildCsv(users: EFrontUser[]) {
  const rows = [
    ['users_login', 'users_email', 'language', 'users_name', 'users_surname', 'active', 'user_type', 'registration_date'],
    ...users.map(user => [
      user.users_login,
      user.users_email,
      user.language,
      user.users_name,
      user.users_surname,
      user.active,
      user.user_type,
      user.registration_date,
    ]),
  ]

  return rows.map(row => row.map(escapeCsvValue).join(',')).join('\n') + '\n'
}

function escapeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

async function parseSerializedDumpToUsers(inputText: string) {
  const parserModuleUrl = new URL('../app/api/admin/efront-import/serialized-dump.ts', import.meta.url)
  const { parseSerializedEfrontDump } = await import(parserModuleUrl.href)
  const records = parseSerializedEfrontDump(inputText) as SerializedEfrontRecord[]
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

  return {
    users,
    errors,
    warnings,
    format: 'serialized' as const,
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
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

main().catch((error: any) => {
  process.stderr.write(`${error.message || String(error)}\n`)
  process.exitCode = 1
})
