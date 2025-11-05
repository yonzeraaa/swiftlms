import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/client'

export interface TemplateMetadata {
  mappings?: Record<string, string | ArrayMapping>
  formulas?: Record<string, string>
  imagePositions?: Record<string, { col: number; row: number }>
  analysis?: TemplateMetadataAnalysis
}

export interface ArrayMapping {
  type: 'array'
  source: string
  startRow: number
  fields: Record<string, number> // field name -> column number
}

export interface TemplateMetadataAnalysis {
  sheetName?: string
  dataStartRow?: number
  totalColumns?: number
  headers?: Array<{
    column: number
    value: string
    suggestedField?: string
  }>
  staticCells?: Array<{
    address: string
    row: number
    column: number
    label: string
    value: string
    suggestedField?: string
    type?: string
  }>
  availableSheets?: string[]
  version?: number
}

export interface ExcelTemplate {
  id: string
  name: string
  category: string
  storage_path: string
  storage_bucket: string
  metadata: TemplateMetadata | null
}

/**
 * Excel Template Engine usando ExcelJS
 * Preserva toda formatação, fórmulas, imagens e mesclagens
 */
export class ExcelTemplateEngine {
  private workbook: ExcelJS.Workbook
  private template: ExcelTemplate

  constructor(template: ExcelTemplate) {
    this.workbook = new ExcelJS.Workbook()
    this.template = template
  }

  /**
   * Carrega o template do Supabase Storage
   */
  async loadTemplate(): Promise<void> {
    const supabase = createClient()

    try {
      // Baixar arquivo do storage
      const { data, error } = await supabase.storage
        .from(this.template.storage_bucket)
        .download(this.template.storage_path)

      if (error) {
        throw new Error(`Erro ao carregar template: ${error.message}`)
      }

      if (!data) {
        throw new Error('Template não encontrado no storage')
      }

      // Converter Blob para ArrayBuffer
      const arrayBuffer = await data.arrayBuffer()

      // Carregar o workbook do Excel com ExcelJS
      await this.workbook.xlsx.load(arrayBuffer)

      console.log('Template carregado com sucesso')
    } catch (error) {
      console.error('Erro ao carregar template:', error)
      throw error
    }
  }

  /**
   * Preenche o template com dados
   * @param data Objeto com os dados a serem preenchidos
   */
  async fillTemplate(data: Record<string, any>): Promise<void> {
    const sheetName = this.template.metadata?.analysis?.sheetName
    const worksheet =
      (sheetName && this.workbook.getWorksheet(sheetName)) ||
      this.workbook.getWorksheet(1)

    if (!worksheet) {
      throw new Error('Nenhuma planilha encontrada no template')
    }

    const mappings = this.template.metadata?.mappings || {}

    // Processar mapeamentos simples (célula única)
    for (const [cellAddress, dataPath] of Object.entries(mappings)) {
      if (typeof dataPath === 'string') {
        const value = this.getValueFromPath(data, dataPath)
        const cell = worksheet.getCell(cellAddress)

        // Preserva formatação original da célula
        cell.value = value
      }
    }

    // Processar mapeamentos de array (tabelas)
    for (const [key, mapping] of Object.entries(mappings)) {
      if (typeof mapping === 'object' && mapping.type === 'array') {
        await this.fillArrayData(worksheet, mapping, data)
      }
    }

    // Preservar fórmulas (ExcelJS mantém automaticamente)
    console.log('Template preenchido com dados')
  }

  /**
   * Preenche dados de array (linhas de tabela)
   */
  private async fillArrayData(
    worksheet: ExcelJS.Worksheet,
    mapping: ArrayMapping,
    data: Record<string, any>
  ): Promise<void> {
    const arrayData = this.getValueFromPath(data, mapping.source)

    if (!Array.isArray(arrayData)) {
      console.warn(`Dados não são array: ${mapping.source}`)
      return
    }

    let currentRow = mapping.startRow

    // Obter linha de template para clonar formatação
    const templateRow = worksheet.getRow(currentRow)
    const templateStyle = this.captureRowStyle(templateRow)

    for (const item of arrayData) {
      const row = worksheet.getRow(currentRow)

      // Aplicar estilo do template
      this.applyRowStyle(row, templateStyle)

      // Preencher campos
      for (const [fieldName, columnNumber] of Object.entries(mapping.fields)) {
        const cell = row.getCell(columnNumber)
        const value = this.getValueFromPath(item, fieldName)
        cell.value = value
      }

      row.commit()
      currentRow++
    }
  }

  /**
   * Captura o estilo de uma linha inteira
   */
  private captureRowStyle(row: ExcelJS.Row): Map<number, Partial<ExcelJS.Style>> {
    const styles = new Map<number, Partial<ExcelJS.Style>>()

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      styles.set(colNumber, {
        font: cell.font ? { ...cell.font } : undefined,
        fill: cell.fill ? { ...cell.fill } : undefined,
        border: cell.border ? { ...cell.border } : undefined,
        alignment: cell.alignment ? { ...cell.alignment } : undefined,
        numFmt: cell.numFmt,
      })
    })

    return styles
  }

  /**
   * Aplica estilo a uma linha
   */
  private applyRowStyle(row: ExcelJS.Row, styles: Map<number, Partial<ExcelJS.Style>>): void {
    styles.forEach((style, colNumber) => {
      const cell = row.getCell(colNumber)

      if (style.font) cell.font = style.font
      if (style.fill) cell.fill = style.fill
      if (style.border) cell.border = style.border
      if (style.alignment) cell.alignment = style.alignment
      if (style.numFmt) cell.numFmt = style.numFmt
    })
  }

  /**
   * Obtém valor de objeto usando caminho (ex: "user.name")
   */
  private getValueFromPath(obj: any, path: string): any {
    const keys = path.split('.')
    let value = obj

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return undefined
      }
    }

    return value
  }

  /**
   * Gera o arquivo Excel preenchido
   * @returns Buffer do arquivo Excel
   */
  async generate(): Promise<Buffer> {
    try {
      const buffer = await this.workbook.xlsx.writeBuffer()
      return Buffer.from(buffer)
    } catch (error) {
      console.error('Erro ao gerar Excel:', error)
      throw error
    }
  }

  /**
   * Analisa estrutura do template para ajudar no mapeamento
   * @returns Informações sobre células não vazias
   */
  async analyzeTemplate(): Promise<{
    sheets: string[]
    cells: Record<string, { address: string; value: any; type: string }[]>
  }> {
    const result: any = { sheets: [], cells: {} }

    this.workbook.eachSheet((worksheet, sheetId) => {
      const sheetName = worksheet.name
      result.sheets.push(sheetName)
      result.cells[sheetName] = []

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          result.cells[sheetName].push({
            address: cell.address,
            value: cell.value,
            type: typeof cell.value,
          })
        })
      })
    })

    return result
  }
}

/**
 * Função auxiliar para carregar e preencher template em uma única operação
 */
export async function generateFromTemplate(
  template: ExcelTemplate,
  data: Record<string, any>
): Promise<Buffer> {
  const engine = new ExcelTemplateEngine(template)

  await engine.loadTemplate()
  await engine.fillTemplate(data)

  return await engine.generate()
}
