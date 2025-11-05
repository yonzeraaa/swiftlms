'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Settings, Trash2 } from 'lucide-react'
import type { TemplateAnalysis, SuggestedMapping, StaticCell } from '@/lib/template-analyzer'
import FieldSelector from './FieldSelector'
import StaticFieldMapper from './StaticFieldMapper'
import MappingPreview from './MappingPreview'
import Button from '../../../components/Button'

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

  const emitMappingChange = (nextFields: Record<string, number>, nextStartRow: number = startRow) => {
    const updatedMapping: SuggestedMapping = {
      ...initialMapping,
      fields: nextFields,
      startRow: nextStartRow,
    }
    onChange(updatedMapping)
  }

  const emitAnalysisChange = (partial: Partial<TemplateAnalysis>) => {
    if (!onAnalysisChange) return
    onAnalysisChange({
      ...analysis,
      ...partial,
      headers: partial.headers || columns,
      staticCells: partial.staticCells || staticCells,
      dataStartRow: partial.dataStartRow ?? startRow,
      totalColumns: partial.totalColumns ?? Math.max(...columns.map(h => h.column), 0),
    })
  }

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

  const handleFieldChange = (columnNumber: number, fieldKey: string | undefined) => {
    const newFields = { ...fieldsMapping }

    Object.keys(newFields).forEach(key => {
      if (newFields[key] === columnNumber) {
        delete newFields[key]
      }
    })

    if (fieldKey) {
      delete newFields[fieldKey]
      newFields[fieldKey] = columnNumber
    }

    setFieldsMapping(newFields)
  }

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
    <div className="mt-6 space-y-6">
      <div className="flex items-center gap-2 text-gold-200">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Configurar Mapeamento</h3>
      </div>

      <p className="text-sm text-gold-300/70">
        Mapeie os campos estáticos do cabeçalho e as colunas da tabela de dados:
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gold-200">
          <div className="h-px flex-1 bg-gold-500/20" />
          <h4 className="text-sm font-semibold">Campos Estáticos (Cabeçalho)</h4>
          <div className="h-px flex-1 bg-gold-500/20" />
        </div>

        <p className="text-xs text-gold-300/60">
          Células individuais detectadas antes da tabela de dados. Adicione outras manualmente se necessário.
        </p>

        <div className="space-y-2">
          {staticCells.length === 0 && !addingStaticCell && (
            <p className="text-xs text-gold-300/50 italic">
              Nenhuma célula estática detectada automaticamente.
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

        <div className="pt-2 border-t border-gold-500/10 space-y-3">
          {addingStaticCell ? (
            <div className="space-y-3 p-4 bg-navy-900/40 border border-gold-500/20 rounded-lg">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-gold-300/70 mb-1 uppercase tracking-wide">
                    Endereço (Excel)
                  </label>
                  <input
                    type="text"
                    value={newStaticAddress}
                    onChange={e => setNewStaticAddress(e.target.value)}
                    placeholder="Ex: B4"
                    className="w-full px-3 py-2 bg-navy-900/60 border border-gold-500/20 rounded-lg text-sm text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-gold-300/70 mb-1 uppercase tracking-wide">
                    Rótulo
                  </label>
                  <input
                    type="text"
                    value={newStaticLabel}
                    onChange={e => setNewStaticLabel(e.target.value)}
                    placeholder="Nome do campo"
                    className="w-full px-3 py-2 bg-navy-900/60 border border-gold-500/20 rounded-lg text-sm text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
              </div>
              {staticFormError && (
                <p className="text-xs text-red-400">{staticFormError}</p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="success"
                  type="button"
                  onClick={handleAddStaticCell}
                >
                  Adicionar célula
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={cancelAddStaticCell}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => setAddingStaticCell(true)}
            >
              <Plus className="w-4 h-4" />
              Adicionar célula estática
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {staticCells.length > 0 && (
          <div className="flex items-center gap-2 text-gold-200">
            <div className="h-px flex-1 bg-gold-500/20" />
            <h4 className="text-sm font-semibold">Tabela de Dados</h4>
            <div className="h-px flex-1 bg-gold-500/20" />
          </div>
        )}

        <div className="p-4 bg-navy-800/50 border border-navy-600 rounded-lg">
          <label className="block text-sm font-medium text-gold-200 mb-2">
            Linha inicial dos dados
          </label>
          <input
            type="number"
            min="1"
            value={startRow}
            onChange={(e) => handleStartRowChange(Number(e.target.value))}
            className="w-32 px-3 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all"
          />
          <p className="text-xs text-gold-300/70 mt-2">
            Linha onde os dados começam (após o cabeçalho)
          </p>
        </div>

        <div className="space-y-3">
          {columns.map((header) => (
            <div
              key={header.column}
              className="p-4 bg-navy-800/50 border border-navy-600 rounded-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-10 flex items-center justify-center bg-gold-500/10 border border-gold-500/30 rounded">
                    <span className="text-sm font-mono text-gold-400">
                      Col {header.column}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gold-100 mb-1 truncate">
                    {header.value}
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
                  className="flex-shrink-0 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remover coluna"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">Remover coluna</span>
                </button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={addColumn}
          >
            <Plus className="h-4 w-4" />
            Adicionar coluna
          </Button>
        </div>
      </div>

      <MappingPreview
        mapping={previewMapping}
        category={category}
        staticMappings={staticMappings}
        analysis={previewAnalysis}
      />
    </div>
  )
}
