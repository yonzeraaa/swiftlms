type PhpSerializedPrimitive = null | boolean | number | string

interface PhpSerializedList extends Array<PhpSerializedValue> {}

interface PhpSerializedObject {
  [key: string]: PhpSerializedValue
}

type PhpSerializedValue = PhpSerializedPrimitive | PhpSerializedList | PhpSerializedObject

export type SerializedEfrontRecord = Record<string, PhpSerializedValue>

export function parseSerializedEfrontDump(input: string | Buffer): SerializedEfrontRecord[] {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  const parser = new PhpSerializedParser(buffer)
  const parsed = parser.parse()

  if (!Array.isArray(parsed)) {
    throw new Error('O dump serializado do eFront não contém uma lista de usuários.')
  }

  return parsed.filter(isPlainRecord).map(record => record as SerializedEfrontRecord)
}

function isPlainRecord(value: PhpSerializedValue): value is Record<string, PhpSerializedValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

class PhpSerializedParser {
  private offset = 0

  constructor(private readonly buffer: Buffer) {}

  parse(): PhpSerializedValue {
    const value = this.parseValue()
    this.skipWhitespace()

    if (this.offset !== this.buffer.length) {
      throw new Error(`Conteúdo serializado inválido próximo ao byte ${this.offset}.`)
    }

    return value
  }

  private parseValue(): PhpSerializedValue {
    this.skipWhitespace()

    const token = this.readChar()
    switch (token) {
      case 'N':
        this.expect(';')
        return null
      case 'b':
        this.expect(':')
        return this.readUntil(';') === '1'
      case 'i':
        this.expect(':')
        return Number.parseInt(this.readUntil(';'), 10)
      case 'd':
        this.expect(':')
        return Number.parseFloat(this.readUntil(';'))
      case 's':
        return this.parseString()
      case 'a':
        return this.parseArray()
      default:
        throw new Error(`Tipo serializado não suportado: ${token}`)
    }
  }

  private parseString() {
    this.expect(':')
    const length = Number.parseInt(this.readUntil(':'), 10)
    if (!Number.isFinite(length) || length < 0) {
      throw new Error(`Tamanho de string inválido próximo ao byte ${this.offset}.`)
    }

    this.expect('"')
    const value = this.buffer.toString('utf8', this.offset, this.offset + length)
    this.offset += length
    this.expect('"')
    this.expect(';')
    return value
  }

  private parseArray(): PhpSerializedList | PhpSerializedObject {
    this.expect(':')
    const length = Number.parseInt(this.readUntil(':'), 10)
    if (!Number.isFinite(length) || length < 0) {
      throw new Error(`Tamanho de array inválido próximo ao byte ${this.offset}.`)
    }

    this.expect('{')

    const entries: Array<[string | number, PhpSerializedValue]> = []
    for (let index = 0; index < length; index++) {
      const key = this.parseValue()
      const value = this.parseValue()

      if (typeof key !== 'string' && typeof key !== 'number') {
        throw new Error(`Chave serializada inválida próxima ao byte ${this.offset}.`)
      }

      entries.push([key, value])
    }

    this.expect('}')

    const isSequentialNumericArray = entries.every(([key], index) => key === index)
    if (isSequentialNumericArray) {
      return entries.map(([, value]) => value)
    }

    return Object.fromEntries(entries.map(([key, value]) => [String(key), value]))
  }

  private readUntil(delimiter: string) {
    const start = this.offset
    while (this.offset < this.buffer.length && this.buffer[this.offset] !== delimiter.charCodeAt(0)) {
      this.offset += 1
    }

    if (this.offset >= this.buffer.length) {
      throw new Error(`Delimitador "${delimiter}" não encontrado no dump serializado.`)
    }

    const value = this.buffer.toString('utf8', start, this.offset)
    this.offset += 1
    return value
  }

  private readChar() {
    if (this.offset >= this.buffer.length) {
      throw new Error('Fim inesperado do dump serializado.')
    }

    const char = String.fromCharCode(this.buffer[this.offset])
    this.offset += 1
    return char
  }

  private expect(char: string) {
    const actual = this.readChar()
    if (actual !== char) {
      throw new Error(`Esperado "${char}" mas encontrado "${actual}" no dump serializado.`)
    }
  }

  private skipWhitespace() {
    while (this.offset < this.buffer.length) {
      const current = this.buffer[this.offset]
      if (current === 9 || current === 10 || current === 13 || current === 32) {
        this.offset += 1
        continue
      }
      break
    }
  }
}
