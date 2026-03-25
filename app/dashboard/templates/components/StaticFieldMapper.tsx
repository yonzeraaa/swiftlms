'use client'

import { useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import type { StaticCell } from '@/lib/template-analyzer'
import { getFieldsForCategory, type FieldDefinition } from '@/lib/utils/template-fields'

interface StaticFieldMapperProps {
  cell: StaticCell
  category: string
  mappedField?: string
  onFieldChange: (cellAddress: string, fieldKey: string | null) => void
  onRemove: (cellAddress: string) => void
  onLabelChange?: (cellAddress: string, label: string) => void
  allowLabelEdit?: boolean
}

export default function StaticFieldMapper({
  cell,
  category,
  mappedField,
  onFieldChange,
  onRemove,
  onLabelChange,
  allowLabelEdit = false,
}: StaticFieldMapperProps) {
  const [isOpen, setIsOpen] = useState(false)
  const allFields = getFieldsForCategory(category)

  // Filtrar apenas campos estáticos (ou sem tipo para compatibilidade)
  const fields = allFields.filter((f: FieldDefinition) => !f.type || f.type === 'static')

  const selectedField = fields.find((f: FieldDefinition) => f.key === mappedField)

  return (
    <div className="flex items-center gap-4 p-3 bg-white/40 border border-[#1e130c]/10 hover:border-[#8b6d22]/30 transition-colors group">
      {/* Endereço da célula */}
      <div className="flex-shrink-0 w-12">
        <span className="text-[0.6rem] font-bold font-mono text-[#8b6d22] bg-[#8b6d22]/10 border border-[#8b6d22]/20 px-1.5 py-0.5 uppercase tracking-tighter">
          {cell.address}
        </span>
      </div>

      {/* Label */}
      <div className="flex-shrink-0 min-w-[160px]">
        {allowLabelEdit && onLabelChange ? (
          <div className="space-y-0.5">
            <input
              type="text"
              value={cell.label}
              onChange={(e) => onLabelChange(cell.address, e.target.value)}
              className="w-full px-0 py-0.5 bg-transparent border-0 border-b border-[#1e130c]/20 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none text-[0.75rem] font-bold uppercase tracking-widest"
            />
          </div>
        ) : (
          <p className="text-[0.75rem] text-[#1e130c] font-bold uppercase tracking-widest leading-none">{cell.label}</p>
        )}
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0 text-[#8b6d22] opacity-30 text-xs">→</div>

      {/* Field Selector */}
      <div className="flex-1 relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-0 py-1 bg-transparent border-0 border-b border-[#1e130c]/20 text-left flex items-center justify-between hover:border-[#8b6d22] transition-colors rounded-none"
        >
          <span className={`text-[0.75rem] font-[family-name:var(--font-lora)] italic ${selectedField ? 'text-[#1e130c]' : 'text-[#7a6350]/50'}`}>
            {selectedField ? selectedField.label : 'Vincular...'}
          </span>
          <ChevronDown className={`w-3 h-3 text-[#8b6d22] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-1 bg-[#faf6ee] border border-[#1e130c]/20 shadow-2xl rounded-none py-2 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => {
                onFieldChange(cell.address, null)
                setIsOpen(false)
              }}
              className="w-full px-4 py-2 text-left text-[#7a6350] hover:bg-[#1e130c]/5 transition-colors text-[0.7rem] font-bold uppercase tracking-widest opacity-60"
            >
              (Remover Vínculo)
            </button>

            {fields.map((field: FieldDefinition) => (
              <button
                key={field.key}
                onClick={() => {
                  onFieldChange(cell.address, field.key)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-3 text-left hover:bg-[#8b6d22]/5 transition-colors border-l-2 ${
                  mappedField === field.key ? 'border-[#8b6d22] bg-[#8b6d22]/5' : 'border-transparent'
                }`}
              >
                <div className="text-[0.75rem] text-[#1e130c] font-bold uppercase tracking-wider">{field.label}</div>
                {field.description && (
                  <div className="text-[0.65rem] text-[#7a6350] italic mt-0.5 leading-tight">{field.description}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Field Badge */}
      {cell.suggestedField && !mappedField && (
        <div className="flex-shrink-0">
          <button
            onClick={() => onFieldChange(cell.address, cell.suggestedField || null)}
            className="text-[0.6rem] px-3 py-1.5 bg-[#8b6d22] text-[#faf6ee] font-bold uppercase tracking-widest hover:bg-[#1e130c] transition-colors shadow-sm"
          >
            Sugerir Vínculo
          </button>
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={() => onRemove(cell.address)}
        className="flex-shrink-0 p-2 text-[#7a6350] hover:text-red-800 transition-colors"
        title="Remover célula"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
