'use client'

import { AlertCircle } from 'lucide-react'
import { getFieldsForCategory, type FieldDefinition } from '@/lib/utils/template-fields'

interface FieldSelectorProps {
  category: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  usedFields: Set<string>
}

export default function FieldSelector({
  category,
  value,
  onChange,
  usedFields,
}: FieldSelectorProps) {
  const allFields = getFieldsForCategory(category)

  // Filtrar apenas campos de tabela (ou sem tipo para compatibilidade)
  const fields = allFields.filter((f: FieldDefinition) => !f.type || f.type === 'table')

  return (
    <div className="flex-1">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full px-3 py-2 bg-[#faf6ee] border border-[#1e130c]/15 rounded-lg text-[#1e130c] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-focus)] transition-all cursor-pointer"
      >
        <option value="" className="bg-[#faf6ee] text-[#7a6350]">
          Não mapear
        </option>
        {fields.map((field: FieldDefinition) => {
          const isUsedElsewhere = usedFields.has(field.key) && value !== field.key

          return (
            <option
              key={field.key}
              value={field.key}
              className="bg-[#faf6ee] text-[#1e130c]"
            >
              {field.label}
              {field.required && ' ⚠️'}
              {isUsedElsewhere && ' (mapeado em outra coluna)'}
            </option>
          )
        })}
      </select>
      {value && fields.find(f => f.key === value)?.description && (
        <p className="text-xs text-[#7a6350]/70 mt-1">
          {fields.find(f => f.key === value)?.description}
        </p>
      )}
      {value && fields.find(f => f.key === value)?.required && (
        <div className="flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3 text-[#8b6d22]" />
          <span className="text-xs text-[#8b6d22]">Campo obrigatório</span>
        </div>
      )}
    </div>
  )
}
