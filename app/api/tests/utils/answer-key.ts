export interface ParsedAnswerKeyEntry {
  questionNumber: number
  correctAnswer: string
  points?: number
  justification?: string
}

export function parseAnswerKeyFromText(content: string): ParsedAnswerKeyEntry[] {
  const gabaritoRegex = /(?:^|\n)\s*(?:GABARITO|Gabarito)[\s:]*\n+([\s\S]+?)(?:\n{2,}|$)/i
  const gabaritoMatch = content.match(gabaritoRegex)

  if (gabaritoMatch) {
    const entries = parseAnswerLines(gabaritoMatch[1].split('\n'))
    if (entries.length > 0) {
      return applyJustifications(entries, content)
    }
  }

  // Fallback: procurar linhas com palavras-chave no documento inteiro
  const fallbackEntries = parseAnswerLines(content.split('\n'), { requireKeyword: true })
  if (fallbackEntries.length > 0) {
    return applyJustifications(fallbackEntries, content)
  }

  return []
}

export function extractQuestionsWithAnswers(content: string): ParsedAnswerKeyEntry[] {
  const gabaritoSectionMatch = content.match(/(?:^|\n)\s*Gabarito[\s:]*\n+([\s\S]+?)(?:\n{2,}|\n(?=[A-Z])|$)/i)

  if (gabaritoSectionMatch) {
    const entries = parseAnswerLines(gabaritoSectionMatch[1].split('\n'))
    if (entries.length > 0) {
      return applyJustifications(entries, content)
    }
  }

  const fallbackEntries = parseAnswerLines(content.split('\n'), { requireKeyword: true })
  if (fallbackEntries.length > 0) {
    return applyJustifications(fallbackEntries, content)
  }

  return []
}

export function generateSampleAnswerKey(): ParsedAnswerKeyEntry[] {
  return Array.from({ length: 10 }).map((_, index) => ({
    questionNumber: index + 1,
    correctAnswer: ['A', 'B', 'C', 'D', 'E'][index % 5],
    points: 10,
  }))
}

function extractJustifications(content: string): Array<{ questionNumber: number; text: string }> {
  const justificationRegex = /Justificativa\s*(\d+)?[\.:]\s*([\s\S]+?)(?=\n\n|\n\d+[\.\)]|\n[A-Z][A-Z]+|$)/g
  const matches = content.matchAll(justificationRegex)
  const justifications: Array<{ questionNumber: number; text: string }> = []

  for (const match of matches) {
    const questionNumber = match[1] ? parseInt(match[1], 10) : justifications.length + 1
    const text = match[2]?.trim()

    if (!Number.isNaN(questionNumber) && text) {
      justifications.push({ questionNumber, text })
    }
  }

  return justifications
}

interface ParseLinesOptions {
  requireKeyword?: boolean
}

function parseAnswerLines(lines: string[], options: ParseLinesOptions = {}): ParsedAnswerKeyEntry[] {
  const entries = new Map<number, ParsedAnswerKeyEntry>()
  const keywordRegex = /(gabarito|resposta|alternativa|letra|item|resp)/i

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim()
    if (!trimmedLine) continue

    const parsed = parseAnswerLine(trimmedLine)
    if (parsed && parsed.questionNumber > 0 && parsed.questionNumber <= 200) {
      if (!entries.has(parsed.questionNumber)) {
        entries.set(parsed.questionNumber, parsed)
      }
      continue
    }

    if (options.requireKeyword && !keywordRegex.test(trimmedLine)) {
      continue
    }
  }

  return Array.from(entries.values()).sort((a, b) => a.questionNumber - b.questionNumber)
}

function parseAnswerLine(line: string): ParsedAnswerKeyEntry | null {
  // Separar justificativa inline, se houver
  let justification: string | undefined
  const justificationMatch = line.match(/Justificativa\s*[:\-]\s*(.+)$/i)
  let workingLine = line
  if (justificationMatch && justificationMatch.index !== undefined) {
    justification = justificationMatch[1]?.trim()
    workingLine = line.slice(0, justificationMatch.index).trim()
  }

  // Extrair número da questão e restante da linha
  const patterns = [
    /^(?:Quest[aã]o|Pergunta)\s*(\d+)[\)\.:\-–]?\s*(.*)$/i,
    /^(\d+)[\)\.:\-–]?\s*(.*)$/
  ] as const

  let questionNumber: number | null = null
  let remainder = ''

  for (const pattern of patterns) {
    const match = workingLine.match(pattern)
    if (match) {
      questionNumber = parseInt(match[1], 10)
      remainder = match[2]?.trim() ?? ''
      break
    }
  }

  if (!questionNumber || !remainder) {
    return null
  }

  const correctAnswer = extractAnswerToken(remainder)
  if (!correctAnswer) {
    return null
  }

  return {
    questionNumber,
    correctAnswer,
    points: 10,
    justification,
  }
}

function extractAnswerToken(text: string): string | null {
  let workingText = text.trim().replace(/^[-–—\s]+/, '')

  const labelMatch = workingText.match(/^(?:Gabarito|Resposta|Alternativa\s+correta|Alternativa|Letra|Item)\s*[:\-–]?\s*(.*)$/i)
  if (labelMatch) {
    workingText = labelMatch[1]?.trim() ?? ''
  }

  if (!workingText) {
    return null
  }

  // Dividir por separadores comuns para capturar o primeiro valor significativo
  const candidates = workingText
    .split(/\s*[\\/;|,]|\s+ou\s+/i)
    .map(candidate => candidate.trim())
    .filter(Boolean)

  for (const candidate of candidates) {
    const normalized = normalizeAnswer(candidate)
    if (normalized) {
      return normalized
    }
  }

  // Procura por tokens simples dentro do texto restante
  const tokenMatch = workingText.match(/\b(?:[A-E]|V|F|Verdadeiro|Falso|True|False)\b/i)
  if (tokenMatch) {
    const normalized = normalizeAnswer(tokenMatch[0])
    if (normalized) {
      return normalized
    }
  }

  return null
}

function normalizeAnswer(value: string): string | null {
  const cleaned = value
    .replace(/^alternativa\s+/i, '')
    .replace(/^letra\s+/i, '')
    .replace(/^item\s+/i, '')
    .replace(/^op[cç][aã]o\s+/i, '')
    .replace(/^resp\.?\s*/i, '')
    .replace(/\.$/, '')
    .trim()

  if (!cleaned) return null

  if (/^[A-E]$/i.test(cleaned)) {
    return cleaned.toUpperCase()
  }

  if (/^(verdadeiro|true|v)$/i.test(cleaned)) {
    return 'V'
  }

  if (/^(falso|false|f)$/i.test(cleaned)) {
    return 'F'
  }

  return null
}

function applyJustifications(entries: ParsedAnswerKeyEntry[], content: string): ParsedAnswerKeyEntry[] {
  if (entries.length === 0) return []

  const justifications = extractJustifications(content)
  const justificationsMap = new Map(justifications.map(j => [j.questionNumber, j.text]))

  return entries.map(entry => {
    if (entry.justification) {
      return entry
    }

    const justification = justificationsMap.get(entry.questionNumber)
    if (justification) {
      return { ...entry, justification }
    }

    return entry
  })
}
