'use client'

import { AlertCircle } from 'lucide-react'
import { getFieldsForCategory, type FieldDefinition } from '@/lib/utils/template-fields'

interface FieldSelectorProps {
  category: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  usedFields: Set<string>
  columnName: string
}

export default function FieldSelector({
  category,
  value,
  onChange,
  usedFields,
  columnName,
}: FieldSelectorProps) {
  const allFields = getFieldsForCategory(category)

  // Filtrar apenas campos de tabela (ou sem tipo para compatibilidade)
  const fields = allFields.filter((f: FieldDefinition) => !f.type || f.type === 'table')

  return (
    <div className="flex-1">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full px-3 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all cursor-pointer"
      >
        <option value="" className="bg-navy-800 text-gold-300">
          Não mapear
        </option>
        {fields.map((field: FieldDefinition) => {
          const isUsed = usedFields.has(field.key) && value !== field.key
          const isDisabled = isUsed

          return (
            <option
              key={field.key}
              value={field.key}
              disabled={isDisabled}
              className="bg-navy-800 text-gold-100"
            >
              {field.label}
              {field.required && ' ⚠️'}
              {isUsed && ' (já usado)'}
            </option>
          )
        })}
      </select>
      {value && fields.find(f => f.key === value)?.description && (
        <p className="text-xs text-gold-300/70 mt-1">
          {fields.find(f => f.key === value)?.description}
        </p>
      )}
      {value && fields.find(f => f.key === value)?.required && (
        <div className="flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3 text-gold-400" />
          <span className="text-xs text-gold-400">Campo obrigatório</span>
        </div>
      )}
    </div>
  )
}
