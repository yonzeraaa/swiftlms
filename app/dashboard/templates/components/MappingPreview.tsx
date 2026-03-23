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
    <div className="mt-6 p-5 bg-[#faf6ee] border border-[#1e130c]/10 space-y-5">
      <div className="flex items-center justify-between border-b border-[#1e130c]/10 pb-3">
        <h4 className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#1e130c]">Sumário do Vínculo</h4>
        {isValid ? (
          <div className="flex items-center gap-2 text-[#1e130c] font-bold text-[0.6rem] uppercase tracking-widest">
            <CheckCircle className="h-3 w-3 text-[#8b6d22]" />
            <span>Válido</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[#7a6350] italic text-[0.6rem] uppercase tracking-widest opacity-60">
            <AlertCircle className="h-3 w-3" />
            <span>Incompleto</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[0.55rem] font-bold uppercase tracking-widest text-[#7a6350] mb-2">Tabela ({mappedFields.length})</p>
          <div className="space-y-1">
            {Object.entries(mapping.fields).map(([field, column]) => (
              <div
                key={field}
                className="flex items-center justify-between px-2 py-1.5 bg-white/40 border border-[#1e130c]/5 text-[0.65rem]"
              >
                <span className="text-[#1e130c] font-bold uppercase truncate max-w-[140px]">
                  {getFieldLabel(category, field)}
                </span>
                <span className="text-[#7a6350] italic flex-shrink-0">
                  Col {column}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[0.55rem] font-bold uppercase tracking-widest text-[#7a6350] mb-2">Estáticos ({staticEntries.length})</p>
          <div className="space-y-1">
            {staticEntries.map(([address, fieldKey]) => {
              const label = analysis?.staticCells?.find(cell => cell.address === address)?.label || address
              return (
                <div
                  key={address}
                  className="flex items-center justify-between px-2 py-1.5 bg-white/40 border border-[#1e130c]/5 text-[0.65rem]"
                >
                  <span className="text-[#1e130c] font-bold uppercase truncate max-w-[100px]">{label}</span>
                  <span className="text-[#7a6350] italic flex-shrink-0">
                    → {getFieldLabel(category, fieldKey)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {(missingRequiredTables.length > 0 || missingStaticFields.length > 0) && (
        <div className="p-5 border border-red-900/10 bg-[#7a6350]/5 space-y-3">
          {missingRequiredTables.length > 0 && (
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-[#7a6350] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[0.65rem] font-bold text-[#7a6350] uppercase tracking-widest mb-1.5">
                  Campos de Tabela Obrigatórios Pendentes:
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingRequiredTables.map(field => (
                    <span key={field} className="text-[0.6rem] px-2 py-1 bg-white/50 text-[#7a6350] italic uppercase tracking-wider border border-[#1e130c]/5">
                      {getFieldLabel(category, field)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {missingStaticFields.length > 0 && (
            <div className="flex items-start gap-3 pt-3 border-t border-[#1e130c]/5">
              <AlertTriangle className="h-4 w-4 text-[#7a6350] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[0.65rem] font-bold text-[#7a6350] uppercase tracking-widest mb-1.5">
                  Vínculos de Cabeçalho Obrigatórios Pendentes:
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingStaticFields.map(field => (
                    <span key={field} className="text-[0.6rem] px-2 py-1 bg-white/50 text-[#7a6350] italic uppercase tracking-wider border border-[#1e130c]/5">
                      {getFieldLabel(category, field)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-6 border-t border-[#1e130c]/10 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-[#7a6350] opacity-50">Linha Inicial</span>
          <span className="text-[0.7rem] text-[#1e130c] font-bold">Matriz {mapping.startRow}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-[#7a6350] opacity-50">Fonte Primária</span>
          <span className="text-[0.7rem] text-[#1e130c] font-bold uppercase">{mapping.source}</span>
        </div>
        {analysis?.sheetName && (
          <div className="flex flex-col">
            <span className="text-[0.55rem] font-bold uppercase tracking-widest text-[#7a6350] opacity-50">Aba Ativa</span>
            <span className="text-[0.7rem] text-[#1e130c] font-bold italic">"{analysis.sheetName}"</span>
          </div>
        )}
        {analysis?.totalColumns && analysis.totalColumns > 0 && (
          <div className="flex flex-col">
            <span className="text-[0.55rem] font-bold uppercase tracking-widest text-[#7a6350] opacity-50">Extensão</span>
            <span className="text-[0.7rem] text-[#1e130c] font-bold">{analysis.totalColumns} Colunas</span>
          </div>
        )}
      </div>
    </div>
  )
}
