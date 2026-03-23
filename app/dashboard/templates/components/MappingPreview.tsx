'use client'

import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { getFieldLabel, getFieldsForCategory } from '@/lib/utils/template-fields'
import type { SuggestedMapping, TemplateAnalysis } from '@/lib/template-analyzer'

interface MappingPreviewProps {
  mapping: SuggestedMapping
  category: string
  staticMappings?: Record<string, string>
  analysis?: TemplateAnalysis
}

export default function MappingPreview({
  mapping,
  category,
  staticMappings,
  analysis,
}: MappingPreviewProps) {
  const fieldDefinitions = getFieldsForCategory(category)
  const requiredTableFields = fieldDefinitions
    .filter(field => field.required && field.type !== 'static')
    .map(field => field.key)
  const requiredStaticFields = fieldDefinitions
    .filter(field => field.required && field.type === 'static')
    .map(field => field.key)

  const mappedFields = Object.keys(mapping.fields)
  const missingRequiredTables = requiredTableFields.filter(field => !mappedFields.includes(field))

  const staticEntries = Object.entries(staticMappings || {})
  const mappedStaticFields = staticEntries.map(([, fieldKey]) => fieldKey)
  const missingStaticFields = requiredStaticFields.filter(field => !mappedStaticFields.includes(field))

  const headerMap = new Map<number, string>()
  analysis?.headers?.forEach(header => {
    headerMap.set(header.column, header.value)
  })

  const isValid = missingRequiredTables.length === 0 && missingStaticFields.length === 0

  return (
    <div className="mt-6 p-4 bg-[#faf6ee] border border-[#1e130c]/15 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#1e130c]">Preview do Mapeamento</h4>
        {isValid ? (
          <div className="flex items-center gap-2 text-[#1e130c] font-bold text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Válido</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[#7a6350] italic text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Incompleto</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-[#7a6350] mb-2">Campos mapeados ({mappedFields.length}):</p>
        <div className="space-y-1">
          {Object.entries(mapping.fields).map(([field, column]) => (
            <div
              key={field}
              className="flex items-center justify-between px-3 py-2 bg-[#faf6ee] rounded text-xs"
            >
              <span className="text-[#1e130c]">
                {getFieldLabel(category, field)}
                {requiredTableFields.includes(field) && (
                  <span className="ml-1 text-[#8b6d22]">*</span>
                )}
              </span>
              <span className="text-[#7a6350]/70">
                Coluna {column}
                {headerMap.has(column) && (
                  <span className="ml-1 text-[#7a6350]/70">
                    ({headerMap.get(column)})
                  </span>
                )}
              </span>
            </div>
          ))}
          {mappedFields.length === 0 && (
            <p className="text-xs text-[#7a6350]/70 italic px-3 py-2">
              Nenhum campo mapeado ainda
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[#7a6350]">
          Campos estáticos configurados ({staticEntries.length}):
        </p>
        <div className="space-y-1">
          {staticEntries.length === 0 && (
            <p className="text-xs text-[#7a6350]/70 italic px-3 py-2 bg-[#faf6ee] rounded">
              Nenhum campo de cabeçalho foi associado.
            </p>
          )}
          {staticEntries.map(([address, fieldKey]) => {
            const label = analysis?.staticCells?.find(cell => cell.address === address)?.label || address
            return (
              <div
                key={address}
                className="flex items-center justify-between px-3 py-2 bg-[#faf6ee] rounded text-xs"
              >
                <span className="text-[#1e130c]">{label}</span>
                <span className="text-[#7a6350]/70">
                  → {getFieldLabel(category, fieldKey)}
                  {requiredStaticFields.includes(fieldKey) && (
                    <span className="ml-1 text-[#8b6d22]">*</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {(missingRequiredTables.length > 0 || missingStaticFields.length > 0) && (
        <div className="space-y-2 p-3 bg-[#7a6350]/10/10 border border-red-500/30 rounded">
          {missingRequiredTables.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7a6350] italic mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-[#7a6350] italic mb-1">
                  Campos de tabela obrigatórios faltando:
                </p>
                <ul className="text-xs text-[#7a6350] italic/80 space-y-0.5">
                  {missingRequiredTables.map(field => (
                    <li key={field}>• {getFieldLabel(category, field)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {missingStaticFields.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7a6350] italic mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-[#7a6350] italic mb-1">
                  Campos de cabeçalho obrigatórios faltando:
                </p>
                <ul className="text-xs text-[#7a6350] italic/80 space-y-0.5">
                  {missingStaticFields.map(field => (
                    <li key={field}>• {getFieldLabel(category, field)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-3 border-t border-[#1e130c]/15 text-xs text-[#7a6350]/70 space-y-1">
        <p>
          Linha inicial dos dados:{' '}
          <span className="text-[#1e130c] font-medium">{mapping.startRow}</span>
        </p>
        <p>
          Fonte:{' '}
          <span className="text-[#1e130c] font-medium">{mapping.source}</span>
        </p>
        {analysis?.sheetName && (
          <p>
            Planilha selecionada:{' '}
            <span className="text-[#1e130c] font-medium">{analysis.sheetName}</span>
          </p>
        )}
        {analysis?.totalColumns && analysis.totalColumns > 0 && (
          <p>
            Colunas detectadas:{' '}
            <span className="text-[#1e130c] font-medium">{analysis.totalColumns}</span>
          </p>
        )}
      </div>
    </div>
  )
}
