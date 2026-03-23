'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Settings, Trash2, AlertCircle, AlertTriangle } from 'lucide-react'
import type { TemplateAnalysis, SuggestedMapping, StaticCell } from '@/lib/template-analyzer'
import FieldSelector from './FieldSelector'
import StaticFieldMapper from './StaticFieldMapper'
import MappingPreview from './MappingPreview'
import Button from '../../../components/Button'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

interface MappingEditorProps {
  analysis: TemplateAnalysis
  category: string
  initialMapping: SuggestedMapping
  onChange: (mapping: SuggestedMapping) => void
  onStaticMappingsChange?: (staticMappings: Record<string, string>) => void
  initialStaticMappings?: Record<string, string>
  manualMode?: boolean
  onAnalysisChange?: (analysis: TemplateAnalysis) => void
}

export default function MappingEditor({
  analysis,
  category,
  initialMapping,
  onChange,
  onStaticMappingsChange,
  initialStaticMappings,
  manualMode = false,
  onAnalysisChange,
}: MappingEditorProps) {
  const [fieldsMapping, setFieldsMapping] = useState<Record<string, number>>(initialMapping.fields)
  const [startRow, setStartRow] = useState(initialMapping.startRow)
  const [columns, setColumns] = useState(analysis.headers)
  const [staticCells, setStaticCells] = useState<StaticCell[]>(analysis.staticCells || [])
  const [staticMappings, setStaticMappings] = useState<Record<string, string>>(initialStaticMappings || {})
  const [addingStaticCell, setAddingStaticCell] = useState(false)
  const [newStaticAddress, setNewStaticAddress] = useState('')
  const [newStaticLabel, setNewStaticLabel] = useState('')
  const [staticFormError, setStaticFormError] = useState<string | null>(null)

  // Validar conflitos de mapeamento
  const mappingValidation = useMemo(() => {
    const conflicts: string[] = []
    const warnings: string[] = []

    // Verificar se campos estão tanto em estático quanto em array
    Object.entries(staticMappings).forEach(([cellAddress, fieldName]) => {
      if (fieldName in fieldsMapping) {
        conflicts.push(
          `Campo "${fieldName}" mapeado em célula estática (${cellAddress}) e em coluna (${fieldsMapping[fieldName]})`
        )
      }
    })

    // Verificar se células estáticas sobrepõem área de array
    Object.keys(staticMappings).forEach(cellAddress => {
      const match = cellAddress.match(/^[A-Z]+(\d+)$/)
      if (match) {
        const row = parseInt(match[1])
        if (row >= startRow) {
          warnings.push(
            `Célula estática ${cellAddress} pode sobrepor dados da tabela (linha inicial: ${startRow})`
          )
        }
      }
    })

    // Verificar colunas duplicadas
    const columnCounts: Record<number, number> = {}
    Object.values(fieldsMapping).forEach(column => {
      columnCounts[column] = (columnCounts[column] || 0) + 1
    })
    Object.entries(columnCounts).forEach(([column, count]) => {
      if (count > 1) {
        warnings.push(`Coluna ${column} mapeada para múltiplos campos`)
      }
    })

    return { conflicts, warnings, hasIssues: conflicts.length > 0 || warnings.length > 0 }
  }, [staticMappings, fieldsMapping, startRow])

  useEffect(() => {
    setFieldsMapping(initialMapping.fields)
    setStartRow(initialMapping.startRow)
  }, [initialMapping])

  useEffect(() => {
    setColumns(analysis.headers)
    setStaticCells(analysis.staticCells || [])
    setStartRow(analysis.dataStartRow)
  }, [analysis])

  useEffect(() => {
    if (initialStaticMappings) {
      setStaticMappings(initialStaticMappings)
    }
  }, [initialStaticMappings])

  useEffect(() => {
    if (onStaticMappingsChange) {
      onStaticMappingsChange(staticMappings)
    }
  }, [staticMappings, onStaticMappingsChange])

  const emitMappingChange = useCallback(
    (nextFields: Record<string, number>, nextStartRow?: number) => {
      const updatedMapping: SuggestedMapping = {
        type: 'array',
        source: initialMapping.source,
        fields: nextFields,
        startRow: nextStartRow ?? startRow,
      }
      onChange(updatedMapping)
    },
    [onChange, initialMapping.source, startRow]
  )

  const emitAnalysisChange = useCallback(
    (partial: Partial<TemplateAnalysis>) => {
      if (!onAnalysisChange) return
      onAnalysisChange({
        ...analysis,
        ...partial,
        headers: partial.headers || columns,
        staticCells: partial.staticCells || staticCells,
        dataStartRow: partial.dataStartRow ?? startRow,
        totalColumns: partial.totalColumns ?? Math.max(...columns.map(h => h.column), 0),
      })
    },
    [onAnalysisChange, analysis, columns, staticCells, startRow]
  )

  const handleStaticFieldChange = (cellAddress: string, fieldKey: string | null) => {
    const newMappings = { ...staticMappings }

    if (fieldKey) {
      newMappings[cellAddress] = fieldKey
    } else {
      delete newMappings[cellAddress]
    }

    setStaticMappings(newMappings)
  }

  const handleRemoveStaticCell = (cellAddress: string) => {
    const updatedCells = staticCells.filter(cell => cell.address !== cellAddress)
    setStaticCells(updatedCells)

    const newMappings = { ...staticMappings }
    delete newMappings[cellAddress]
    setStaticMappings(newMappings)
    emitAnalysisChange({ staticCells: updatedCells })
  }

  const handleStaticLabelChange = (cellAddress: string, label: string) => {
    const updatedCells = staticCells.map(cell =>
      cell.address === cellAddress ? { ...cell, label } : cell
    )
    setStaticCells(updatedCells)
    emitAnalysisChange({ staticCells: updatedCells })
  }

  const addColumn = () => {
    const nextColumnNumber = Math.max(...columns.map(h => h.column), 0) + 1
    const newColumn = {
      column: nextColumnNumber,
      value: `Coluna ${nextColumnNumber}`,
      suggestedField: undefined,
    }
    const newColumns = [...columns, newColumn]
    setColumns(newColumns)
    emitAnalysisChange({ headers: newColumns, totalColumns: Math.max(...newColumns.map(h => h.column)) })
  }

  const removeColumn = (columnNumber: number) => {
    const newColumns = columns.filter(h => h.column !== columnNumber)
    setColumns(newColumns)

    const newFields = { ...fieldsMapping }
    Object.keys(newFields).forEach(key => {
      if (newFields[key] === columnNumber) {
        delete newFields[key]
      }
    })

    setFieldsMapping(newFields)
    emitMappingChange(newFields)
    emitAnalysisChange({ headers: newColumns, totalColumns: Math.max(...newColumns.map(h => h.column), 0) })
  }

  const handleFieldChange = useCallback(
    (columnNumber: number, fieldKey: string | undefined) => {
      setFieldsMapping(prevFields => {
        const newFields = { ...prevFields }

        // Remover mapeamento anterior desta coluna
        Object.keys(newFields).forEach(key => {
          if (newFields[key] === columnNumber) {
            delete newFields[key]
          }
        })

        // Se há novo campo, adicionar mapeamento
        if (fieldKey) {
          // Remover campo de outras colunas (um campo só pode estar em uma coluna)
          delete newFields[fieldKey]
          newFields[fieldKey] = columnNumber
        }

        // Emitir mudança após atualização
        requestAnimationFrame(() => {
          emitMappingChange(newFields)
        })

        return newFields
      })
    },
    [emitMappingChange]
  )

  const normalizeExcelAddress = (address: string) => address.trim().toUpperCase()

  const parseExcelAddress = (address: string): { row: number; column: number } => {
    const match = address.match(/^([A-Z]+)(\d+)$/)
    if (!match) {
      return { row: 0, column: 0 }
    }
    const [, colLetters, rowDigits] = match
    const row = parseInt(rowDigits, 10)

    let column = 0
    for (let i = 0; i < colLetters.length; i++) {
      column = column * 26 + (colLetters.charCodeAt(i) - 64)
    }

    return { row, column }
  }

  const handleAddStaticCell = () => {
    const normalizedAddress = normalizeExcelAddress(newStaticAddress)
    if (!normalizedAddress || !/^[A-Z]+[0-9]+$/.test(normalizedAddress)) {
      setStaticFormError('Informe um endereço válido (ex: B4)')
      return
    }

    if (staticCells.some(cell => cell.address === normalizedAddress)) {
      setStaticFormError('Essa célula já está mapeada')
      return
    }

    const { row, column } = parseExcelAddress(normalizedAddress)
    const label = newStaticLabel.trim() || normalizedAddress

    const newCell: StaticCell = {
      address: normalizedAddress,
      row,
      column,
      label,
      value: '',
      suggestedField: undefined,
      type: 'static',
    }

    const updatedCells = [...staticCells, newCell]
    setStaticCells(updatedCells)
    setNewStaticAddress('')
    setNewStaticLabel('')
    setStaticFormError(null)
    setAddingStaticCell(false)
    emitAnalysisChange({ staticCells: updatedCells })
  }

  const cancelAddStaticCell = () => {
    setAddingStaticCell(false)
    setNewStaticAddress('')
    setNewStaticLabel('')
    setStaticFormError(null)
  }

  const getFieldForColumn = (columnNumber: number): string | undefined => {
    return Object.keys(fieldsMapping).find(key => fieldsMapping[key] === columnNumber)
  }

  const previewAnalysis = useMemo(
    () => ({
      ...analysis,
      headers: columns,
      staticCells,
      dataStartRow: startRow,
    }),
    [analysis, columns, startRow, staticCells]
  )

  const usedFields = useMemo(() => new Set(Object.keys(fieldsMapping)), [fieldsMapping])

  const handleStartRowChange = (value: number) => {
    const normalized = Number.isNaN(value) ? 1 : Math.max(1, value)
    setStartRow(normalized)
    emitMappingChange(fieldsMapping, normalized)
    emitAnalysisChange({ dataStartRow: normalized })
  }

  const previewMapping = useMemo<SuggestedMapping>(
    () => ({
      ...initialMapping,
      fields: fieldsMapping,
      startRow,
    }),
    [fieldsMapping, initialMapping, startRow]
  )

  return (
    <div className="space-y-8 p-6 bg-white/30 border border-[#1e130c]/10">
      <div className="flex items-center gap-3 text-[#1e130c]">
        <Settings className="h-5 w-5 text-[#8b6d22]" />
        <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold uppercase tracking-wide">Configurar Mapeamento</h3>
      </div>

      {/* Alertas de Validação */}
      {mappingValidation.hasIssues && (
        <div className="space-y-4">
          {mappingValidation.conflicts.length > 0 && (
            <div className="bg-[#7a6350]/5 border border-[#7a6350]/20 p-5">
              <div className="flex items-center gap-3 text-[#7a6350] mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-bold uppercase text-[0.7rem] tracking-widest">Conflitos de Mapeamento</span>
              </div>
              <ul className="space-y-1 text-sm text-[#7a6350] italic ml-8">
                {mappingValidation.conflicts.map((conflict, i) => (
                  <li key={i}>• {conflict}</li>
                ))}
              </ul>
            </div>
          )}

          {mappingValidation.warnings.length > 0 && (
            <div className="bg-[#8b6d22]/5 border border-[#8b6d22]/20 p-5">
              <div className="flex items-center gap-3 text-[#8b6d22] mb-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold uppercase text-[0.7rem] tracking-widest">Avisos de Estrutura</span>
              </div>
              <ul className="space-y-1 text-sm text-[#1e130c] italic ml-8">
                {mappingValidation.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-[#7a6350] italic font-[family-name:var(--font-lora)]">
        Mapeie os campos estáticos do cabeçalho e as colunas da tabela de dados conforme o modelo acadêmico:
      </p>

      {/* Seção: Campos Estáticos */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#7a6350] whitespace-nowrap">Campos Estáticos</span>
          <div className="h-px w-full bg-[#1e130c]/10" />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {staticCells.length === 0 && !addingStaticCell && (
            <p className="text-xs text-[#7a6350] italic opacity-60 px-4">
              Nenhuma célula estática detectada automaticamente na matriz.
            </p>
          )}
          {staticCells.map((cell) => (
            <StaticFieldMapper
              key={cell.address}
              cell={cell}
              category={category}
              mappedField={staticMappings[cell.address]}
              onFieldChange={handleStaticFieldChange}
              onRemove={handleRemoveStaticCell}
              onLabelChange={handleStaticLabelChange}
              allowLabelEdit
            />
          ))}
        </div>

        <div className="pt-4 border-t border-[#1e130c]/5">
          {addingStaticCell ? (
            <div className="p-6 bg-[#faf6ee] border border-[#1e130c]/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-widest mb-2">
                    Endereço (Ex: B4)
                  </label>
                  <input
                    type="text"
                    value={newStaticAddress}
                    onChange={e => setNewStaticAddress(e.target.value)}
                    placeholder="B4"
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-widest mb-2">
                    Rótulo Descritivo
                  </label>
                  <input
                    type="text"
                    value={newStaticLabel}
                    onChange={e => setNewStaticLabel(e.target.value)}
                    placeholder="Nome do campo"
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none italic"
                  />
                </div>
              </div>
              {staticFormError && (
                <p className="text-xs text-[#7a6350] italic uppercase tracking-wider">{staticFormError}</p>
              )}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleAddStaticCell}
                  className="px-6 py-2 bg-[#1e130c] text-[#faf6ee] text-[0.65rem] font-bold uppercase tracking-widest hover:bg-[#8b6d22] transition-colors"
                >
                  Vincular Célula
                </button>
                <button
                  type="button"
                  onClick={cancelAddStaticCell}
                  className="px-6 py-2 border border-[#1e130c]/20 text-[#1e130c] text-[0.65rem] font-bold uppercase tracking-widest hover:bg-[#1e130c]/5 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingStaticCell(true)}
              className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#8b6d22] hover:text-[#1e130c] transition-colors group"
            >
              <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform duration-300" />
              Adicionar Mapeamento Estático
            </button>
          )}
        </div>
      </div>

      {/* Seção: Tabela de Dados */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#7a6350] whitespace-nowrap">Matriz de Dados (Tabela)</span>
          <div className="h-px w-full bg-[#1e130c]/10" />
        </div>

        <div className="p-6 bg-[#faf6ee] border border-[#1e130c]/10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-widest mb-2">
              Linha Inicial do Processamento
            </label>
            <input
              type="number"
              min="1"
              value={startRow}
              onChange={(e) => handleStartRowChange(Number(e.target.value))}
              className="w-32 px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none font-bold text-lg"
            />
          </div>
          <p className="text-[0.7rem] text-[#7a6350] italic max-w-xs leading-relaxed">
            Informe o número da linha na planilha onde os dados efetivamente começam (ignorando os títulos).
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {columns.map((header) => (
            <div
              key={header.column}
              className="p-4 bg-white/50 border border-[#1e130c]/10 hover:border-[#8b6d22]/30 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-10 flex items-center justify-center border border-[#1e130c]/10 bg-[#faf6ee] group-hover:bg-[#8b6d22]/5 transition-colors">
                    <span className="text-[0.6rem] font-bold font-mono text-[#8b6d22] uppercase tracking-tighter">
                      COL {header.column}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[0.65rem] font-bold text-[#1e130c] uppercase tracking-wider mb-1 truncate opacity-80">
                    Título: {header.value}
                  </p>
                  <FieldSelector
                    category={category}
                    value={getFieldForColumn(header.column)}
                    onChange={(field) => handleFieldChange(header.column, field)}
                    usedFields={usedFields}
                  />
                </div>

                <button
                  onClick={() => removeColumn(header.column)}
                  className="p-1.5 text-[#7a6350] hover:text-red-800 transition-colors"
                  title="Expurgar coluna"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={addColumn}
            className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#8b6d22] hover:text-[#1e130c] transition-colors group py-2 px-2"
          >
            <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform duration-300" />
            Vincular Nova Coluna
          </button>
        </div>
      </div>

      <div className="pt-10 border-t border-[#1e130c]/10">
        <MappingPreview
          mapping={previewMapping}
          category={category}
          staticMappings={staticMappings}
          analysis={previewAnalysis}
        />
      </div>
    </div>
  )
}
