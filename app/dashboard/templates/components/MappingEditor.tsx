'use client'

import { useState, useEffect } from 'react'
import { Settings, Plus, Trash2 } from 'lucide-react'
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
  manualMode?: boolean
  onAnalysisChange?: (analysis: TemplateAnalysis) => void
}

export default function MappingEditor({
  analysis,
  category,
  initialMapping,
  onChange,
  onStaticMappingsChange,
  manualMode = false,
  onAnalysisChange,
}: MappingEditorProps) {
  const [mapping, setMapping] = useState<SuggestedMapping>(initialMapping)
  const [startRow, setStartRow] = useState(initialMapping.startRow)
  const [columns, setColumns] = useState(analysis.headers)
  const [staticCells, setStaticCells] = useState<StaticCell[]>(analysis.staticCells || [])
  const [staticMappings, setStaticMappings] = useState<Record<string, string>>({})

  useEffect(() => {
    const updatedMapping = {
      ...mapping,
      startRow,
    }
    setMapping(updatedMapping)
    onChange(updatedMapping)
  }, [startRow])

  useEffect(() => {
    if (onStaticMappingsChange) {
      onStaticMappingsChange(staticMappings)
    }
  }, [staticMappings, onStaticMappingsChange])

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
    setStaticCells(staticCells.filter(cell => cell.address !== cellAddress))

    const newMappings = { ...staticMappings }
    delete newMappings[cellAddress]
    setStaticMappings(newMappings)
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

    if (onAnalysisChange) {
      onAnalysisChange({
        ...analysis,
        headers: newColumns,
        totalColumns: Math.max(...newColumns.map(h => h.column)),
      })
    }
  }

  const removeColumn = (columnNumber: number) => {
    const newColumns = columns.filter(h => h.column !== columnNumber)
    setColumns(newColumns)

    // Remove mapeamento desta coluna
    const newFields = { ...mapping.fields }
    Object.keys(newFields).forEach(key => {
      if (newFields[key] === columnNumber) {
        delete newFields[key]
      }
    })

    const updatedMapping = {
      ...mapping,
      fields: newFields,
    }
    setMapping(updatedMapping)
    onChange(updatedMapping)

    if (onAnalysisChange) {
      onAnalysisChange({
        ...analysis,
        headers: newColumns,
        totalColumns: Math.max(...newColumns.map(h => h.column), 0),
      })
    }
  }

  const handleFieldChange = (columnNumber: number, fieldKey: string | undefined) => {
    const newFields = { ...mapping.fields }

    // Remove mapeamento anterior desta coluna
    Object.keys(newFields).forEach(key => {
      if (newFields[key] === columnNumber) {
        delete newFields[key]
      }
    })

    // Adiciona novo mapeamento se campo selecionado
    if (fieldKey) {
      newFields[fieldKey] = columnNumber
    }

    const updatedMapping = {
      ...mapping,
      fields: newFields,
    }

    setMapping(updatedMapping)
    onChange(updatedMapping)
  }

  const getFieldForColumn = (columnNumber: number): string | undefined => {
    return Object.keys(mapping.fields).find(
      key => mapping.fields[key] === columnNumber
    )
  }

  const usedFields = new Set(Object.keys(mapping.fields))

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center gap-2 text-gold-200">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Configurar Mapeamento</h3>
      </div>

      <p className="text-sm text-gold-300/70">
        Mapeie os campos estáticos do cabeçalho e as colunas da tabela de dados:
      </p>

      {/* Seção: Campos Estáticos */}
      {staticCells.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gold-200">
            <div className="h-px flex-1 bg-gold-500/20" />
            <h4 className="text-sm font-semibold">Campos Estáticos (Cabeçalho)</h4>
            <div className="h-px flex-1 bg-gold-500/20" />
          </div>

          <p className="text-xs text-gold-300/60">
            Células individuais detectadas antes da tabela de dados:
          </p>

          <div className="space-y-2">
            {staticCells.map((cell) => (
              <StaticFieldMapper
                key={cell.address}
                cell={cell}
                category={category}
                mappedField={staticMappings[cell.address]}
                onFieldChange={handleStaticFieldChange}
                onRemove={handleRemoveStaticCell}
              />
            ))}
          </div>
        </div>
      )}

      {/* Seção: Configuração da Tabela */}
      <div className="space-y-4">
        {staticCells.length > 0 && (
          <div className="flex items-center gap-2 text-gold-200">
            <div className="h-px flex-1 bg-gold-500/20" />
            <h4 className="text-sm font-semibold">Tabela de Dados</h4>
            <div className="h-px flex-1 bg-gold-500/20" />
          </div>
        )}

        {/* Linha inicial dos dados */}
        <div className="p-4 bg-navy-800/50 border border-navy-600 rounded-lg">
        <label className="block text-sm font-medium text-gold-200 mb-2">
          Linha inicial dos dados
        </label>
        <input
          type="number"
          min="1"
          value={startRow}
          onChange={(e) => setStartRow(Number(e.target.value))}
          className="w-32 px-3 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all"
        />
        <p className="text-xs text-gold-300/70 mt-2">
          Linha onde os dados começam (após o cabeçalho)
        </p>
      </div>

        {/* Lista de colunas */}
        <div className="space-y-3">
        {columns.map((header) => (
          <div
            key={header.column}
            className="p-4 bg-navy-800/50 border border-navy-600 rounded-lg"
          >
            <div className="flex items-start gap-4">
              {/* Coluna do Excel */}
              <div className="flex-shrink-0">
                <div className="w-16 h-10 flex items-center justify-center bg-gold-500/10 border border-gold-500/30 rounded">
                  <span className="text-sm font-mono text-gold-400">
                    Col {header.column}
                  </span>
                </div>
              </div>

              {/* Nome da coluna */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gold-100 mb-1 truncate">
                  {header.value}
                </p>
                {header.suggestedField && (
                  <p className="text-xs text-gold-300/70">
                    Sugestão automática: {header.suggestedField}
                  </p>
                )}
              </div>

              {/* Seletor de campo */}
              <FieldSelector
                category={category}
                value={getFieldForColumn(header.column)}
                onChange={(fieldKey) => handleFieldChange(header.column, fieldKey)}
                usedFields={usedFields}
                columnName={header.value}
              />

              {/* Botão Remover (apenas modo manual) */}
              {manualMode && columns.length > 1 && (
                <button
                  onClick={() => removeColumn(header.column)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400 hover:text-red-300"
                  title="Remover coluna"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Botão Adicionar Coluna (apenas modo manual) */}
        {manualMode && (
          <Button
            variant="outline"
            onClick={addColumn}
            className="w-full"
            type="button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Coluna
          </Button>
        )}
      </div>
      </div>

      {/* Preview */}
      <MappingPreview mapping={mapping} category={category} />
    </div>
  )
}
