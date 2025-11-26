'use client'

import { useState, useRef, useEffect, forwardRef } from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  group?: string
}

export interface SelectProps {
  options: SelectOption[]
  value?: string | string[]
  onChange?: (value: string | string[]) => void
  placeholder?: string
  label?: string
  error?: string
  success?: string
  hint?: string
  multiple?: boolean
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  loading?: boolean
  variant?: 'outlined' | 'filled' | 'underlined'
  size?: 'sm' | 'md' | 'lg'
  maxHeight?: number
  virtualScroll?: boolean
  grouped?: boolean
  creatable?: boolean
  onCreate?: (value: string) => void
}

const Select = forwardRef<HTMLDivElement, SelectProps>(({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  label,
  error,
  success,
  hint,
  multiple = false,
  searchable = false,
  clearable = false,
  disabled = false,
  loading = false,
  variant = 'outlined',
  size = 'md',
  maxHeight = 300,
  virtualScroll = false,
  grouped = false,
  creatable = false,
  onCreate,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const filteredOptions = getFilteredOptions()
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex].value)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, highlightedIndex, searchTerm])

  const getFilteredOptions = () => {
    let filtered = options

    if (searchTerm) {
      filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered.filter(option => !option.disabled)
  }

  const handleSelect = (selectedValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      const newValues = currentValues.includes(selectedValue)
        ? currentValues.filter(v => v !== selectedValue)
        : [...currentValues, selectedValue]
      onChange?.(newValues)
    } else {
      onChange?.(selectedValue)
      setIsOpen(false)
    }
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(multiple ? [] : '')
  }

  const handleCreate = () => {
    if (creatable && searchTerm && onCreate) {
      onCreate(searchTerm)
      handleSelect(searchTerm)
    }
  }

  const getSelectedLabel = () => {
    if (multiple && Array.isArray(value)) {
      if (value.length === 0) return placeholder
      if (value.length === 1) {
        const option = options.find(o => o.value === value[0])
        return option?.label || value[0]
      }
      return `${value.length} selecionados`
    } else if (value) {
      const option = options.find(o => o.value === value)
      return option?.label || value
    }
    return placeholder
  }

  const sizes = {
    sm: {
      container: 'min-h-[32px] text-sm',
      option: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
    },
    md: {
      container: 'min-h-[40px] text-base',
      option: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
    },
    lg: {
      container: 'min-h-[48px] text-lg',
      option: 'px-5 py-2.5 text-lg',
      icon: 'w-6 h-6',
    },
  }

  const variants = {
    outlined: 'border-2 rounded-lg bg-transparent',
    filled: 'border-b-2 rounded-t-lg bg-navy-100/50 dark:bg-navy-900/50',
    underlined: 'border-b-2 bg-transparent',
  }

  const filteredOptions = getFilteredOptions()
  const groupedOptions = grouped
    ? filteredOptions.reduce((acc, option) => {
        const group = option.group || 'Outros'
        if (!acc[group]) acc[group] = []
        acc[group].push(option)
        return acc
      }, {} as Record<string, SelectOption[]>)
    : { '': filteredOptions }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-navy-700 dark:text-gold-300 mb-1">
          {label}
        </label>
      )}

      <div
        ref={ref}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          relative cursor-pointer
          ${sizes[size].container}
          ${variants[variant]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-error-500' : success ? 'border-success-500' : 'border-navy-700/30 dark:border-gold-500/20'}
          ${isOpen ? 'border-gold-500 dark:border-gold-400' : ''}
          px-4 py-2
          text-navy-900 dark:text-gold-100
          hover:border-gold-500/50 dark:hover:border-gold-400/50
          focus:outline-none focus:ring-2 focus:ring-gold-500/20
          transition-all duration-200
        `}
      >
        <div className="flex items-center justify-between">
          <span className={!value || (Array.isArray(value) && value.length === 0) ? 'text-navy-400 dark:text-gold-600' : ''}>
            {getSelectedLabel()}
          </span>
          
          <div className="flex items-center gap-2">
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold-500 border-t-transparent" />
            )}
            
            {clearable && value && (Array.isArray(value) ? value.length > 0 : true) && (
              <X
                onClick={handleClear}
                className={`${sizes[size].icon} text-navy-600 dark:text-gold-400 hover:text-navy-800 dark:hover:text-gold-200`}
              />
            )}
            
            <ChevronDown
              className={`
                ${sizes[size].icon} 
                text-navy-600 dark:text-gold-400
                transition-transform duration-200
                ${isOpen ? 'rotate-180' : ''}
              `}
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-navy-900 border-2 border-gold-500/20 rounded-lg shadow-elevation-3 overflow-hidden"
            style={{ maxHeight }}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-gold-500/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 dark:text-gold-600" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-9 pr-3 py-2 bg-navy-50 dark:bg-navy-800 rounded text-sm text-navy-900 dark:text-gold-100 placeholder-navy-400 dark:placeholder-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto" style={{ maxHeight: maxHeight - (searchable ? 60 : 0) }}>
              {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <div key={group}>
                  {grouped && group && (
                    <div className="px-3 py-2 text-xs font-semibold text-navy-600 dark:text-gold-500 bg-navy-50 dark:bg-navy-950">
                      {group}
                    </div>
                  )}
                  
                  {groupOptions.map((option, index) => {
                    const isSelected = multiple
                      ? Array.isArray(value) && value.includes(option.value)
                      : value === option.value
                    const globalIndex = filteredOptions.indexOf(option)
                    const isHighlighted = globalIndex === highlightedIndex

                    return (
                      <div
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        onMouseEnter={() => setHighlightedIndex(globalIndex)}
                        className={`
                          ${sizes[size].option}
                          flex items-center justify-between
                          cursor-pointer
                          transition-colors duration-150
                          ${isHighlighted ? 'bg-gold-50 dark:bg-navy-800' : ''}
                          ${isSelected ? 'bg-gold-100 dark:bg-navy-700' : ''}
                          hover:bg-gold-50 dark:hover:bg-navy-800
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {option.icon && (
                            <span className={sizes[size].icon}>{option.icon}</span>
                          )}
                          <span>{option.label}</span>
                        </div>
                        
                        {isSelected && (
                          <Check className={`${sizes[size].icon} text-gold-500`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Create Option */}
              {creatable && searchTerm && !options.find(o => o.label === searchTerm) && (
                <div
                  onClick={handleCreate}
                  className={`
                    ${sizes[size].option}
                    flex items-center gap-2
                    cursor-pointer
                    bg-gold-50 dark:bg-navy-800
                    hover:bg-gold-100 dark:hover:bg-navy-700
                    transition-colors duration-150
                  `}
                >
                  <span className="text-gold-600 dark:text-gold-400">
                    Criar &quot;{searchTerm}&quot;
                  </span>
                </div>
              )}

              {/* Empty State */}
              {filteredOptions.length === 0 && !creatable && (
                <div className="px-4 py-8 text-center text-navy-600 dark:text-gold-600">
                  {searchTerm ? 'Nenhuma opção encontrada' : 'Sem opções disponíveis'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      {(error || success || hint) && (
        <div className="mt-1">
          {error && (
            <p className="text-sm text-error-500">{error}</p>
          )}
          {success && (
            <p className="text-sm text-success-500">{success}</p>
          )}
          {hint && !error && !success && (
            <p className="text-sm text-navy-600 dark:text-gold-600">{hint}</p>
          )}
        </div>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select