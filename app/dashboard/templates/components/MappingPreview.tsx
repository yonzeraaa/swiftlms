'use client'

import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { getFieldLabel, getRequiredFields } from '@/lib/utils/template-fields'
import type { SuggestedMapping } from '@/lib/template-analyzer'

interface MappingPreviewProps {
  mapping: SuggestedMapping
  category: string
}

export default function MappingPreview({ mapping, category }: MappingPreviewProps) {
  const requiredFields = getRequiredFields(category)
  const mappedFields = Object.keys(mapping.fields)
  const missingRequired = requiredFields.filter(field => !mappedFields.includes(field))
  const isValid = missingRequired.length === 0

  return (
    <div className="mt-6 p-4 bg-navy-800/50 border border-navy-600 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gold-200">Preview do Mapeamento</h4>
        {isValid ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Válido</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Incompleto</span>
          </div>
        )}
      </div>

      {/* Campos Mapeados */}
      <div>
        <p className="text-xs text-gold-300 mb-2">Campos mapeados ({mappedFields.length}):</p>
        <div className="space-y-1">
          {Object.entries(mapping.fields).map(([field, column]) => (
            <div
              key={field}
              className="flex items-center justify-between px-3 py-2 bg-navy-900/50 rounded text-xs"
            >
              <span className="text-gold-100">
                {getFieldLabel(category, field)}
                {requiredFields.includes(field) && (
                  <span className="ml-1 text-gold-400">*</span>
                )}
              </span>
              <span className="text-gold-300/70">Coluna {column}</span>
            </div>
          ))}
          {mappedFields.length === 0 && (
            <p className="text-xs text-gold-300/50 italic px-3 py-2">
              Nenhum campo mapeado ainda
            </p>
          )}
        </div>
      </div>

      {/* Campos Obrigatórios Faltando */}
      {missingRequired.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-red-300 mb-1">
                Campos obrigatórios faltando:
              </p>
              <ul className="text-xs text-red-200/80 space-y-0.5">
                {missingRequired.map(field => (
                  <li key={field}>• {getFieldLabel(category, field)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Informações Adicionais */}
      <div className="pt-3 border-t border-navy-600 text-xs text-gold-300/70">
        <p>Linha inicial dos dados: <span className="text-gold-100 font-medium">{mapping.startRow}</span></p>
        <p className="mt-1">Fonte: <span className="text-gold-100 font-medium">{mapping.source}</span></p>
      </div>
    </div>
  )
}
