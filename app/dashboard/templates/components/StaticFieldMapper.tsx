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
    <div className="flex items-center gap-3 p-3 bg-navy-800/30 border border-gold-500/10 rounded-lg hover:border-gold-500/30 transition-colors">
      {/* Endereço da célula */}
      <div className="flex-shrink-0 w-16">
        <span className="text-xs font-mono text-gold-400 bg-gold-500/10 px-2 py-1 rounded">
          {cell.address}
        </span>
      </div>

      {/* Label */}
      <div className="flex-shrink-0 min-w-[200px]">
        {allowLabelEdit && onLabelChange ? (
          <div className="space-y-1">
            <input
              type="text"
              value={cell.label}
              onChange={(e) => onLabelChange(cell.address, e.target.value)}
              className="w-full px-3 py-1.5 bg-navy-900/60 border border-gold-500/20 rounded-lg text-sm text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            {cell.value && (
              <p className="text-xs text-gold-300/50 truncate">
                Valor atual: {cell.value}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gold-300/90 font-medium">{cell.label}</p>
            {cell.value && (
              <p className="text-xs text-gold-300/50 mt-0.5 truncate">
                Valor atual: {cell.value}
              </p>
            )}
          </>
        )}
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0 text-gold-500/30">→</div>

      {/* Field Selector */}
      <div className="flex-1 relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-left flex items-center justify-between hover:border-gold-500/40 transition-colors"
        >
          <span className={selectedField ? 'text-gold-300' : 'text-gold-300/50'}>
            {selectedField ? selectedField.label : 'Selecione um campo...'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gold-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-navy-900 border border-gold-500/20 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            <button
              onClick={() => {
                onFieldChange(cell.address, null)
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-gold-300/50 hover:bg-gold-500/10 transition-colors text-sm"
            >
              (Não mapear)
            </button>

            {fields.map((field: FieldDefinition) => (
              <button
                key={field.key}
                onClick={() => {
                  onFieldChange(cell.address, field.key)
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gold-500/10 transition-colors ${
                  mappedField === field.key ? 'bg-gold-500/20' : ''
                }`}
              >
                <div className="text-sm text-gold-300">{field.label}</div>
                {field.description && (
                  <div className="text-xs text-gold-300/50 mt-0.5">{field.description}</div>
                )}
                {field.required && (
                  <span className="text-xs text-red-400 ml-2">*</span>
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
            className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
          >
            Usar sugestão
          </button>
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={() => onRemove(cell.address)}
        className="flex-shrink-0 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        title="Remover célula"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
