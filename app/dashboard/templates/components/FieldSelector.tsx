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
        className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none cursor-pointer font-[family-name:var(--font-lora)] text-sm italic"
      >
        <option value="" className="bg-[#faf6ee] text-[#7a6350] not-italic">
          Ignorar Coluna (Não mapear)
        </option>
        {fields.map((field: FieldDefinition) => {
          const isUsedElsewhere = usedFields.has(field.key) && value !== field.key

          return (
            <option
              key={field.key}
              value={field.key}
              className="bg-[#faf6ee] text-[#1e130c] not-italic"
            >
              {field.label}
              {field.required && ' [!]'}
              {isUsedElsewhere && ' (VINCULADO EM OUTRA COLUNA)'}
            </option>
          )
        })}
      </select>
      {value && fields.find(f => f.key === value)?.description && (
        <p className="text-[0.65rem] text-[#7a6350] uppercase tracking-widest mt-1.5 leading-relaxed opacity-60">
          INFO: {fields.find(f => f.key === value)?.description}
        </p>
      )}
      {value && fields.find(f => f.key === value)?.required && (
        <div className="flex items-center gap-1.5 mt-2">
          <AlertCircle className="h-3 w-3 text-[#8b6d22]" />
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-[#8b6d22]">Atributo Obrigatório</span>
        </div>
      )}
    </div>
  )
}
