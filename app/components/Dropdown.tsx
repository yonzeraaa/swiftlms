'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface DropdownProps {
  options: DropdownOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
  disabled?: boolean
  className?: string
  label?: string
  error?: string
  multiple?: boolean
  searchPlaceholder?: string
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchable = true,
  disabled = false,
  className = '',
  label,
  error,
  multiple = false,
  searchPlaceholder = 'Search...'
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedValues, setSelectedValues] = useState<string[]>(
    multiple && value ? value.split(',') : []
  )
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get display label
  const getDisplayLabel = () => {
    if (multiple) {
      if (selectedValues.length === 0) return placeholder
      if (selectedValues.length === 1) {
        const option = options.find(opt => opt.value === selectedValues[0])
        return option?.label || placeholder
      }
      return `${selectedValues.length} selected`
    } else {
      const selectedOption = options.find(option => option.value === value)
      return selectedOption?.label || placeholder
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue]
      
      setSelectedValues(newValues)
      onChange(newValues.join(','))
    } else {
      onChange(optionValue)
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  const isSelected = (optionValue: string) => {
    if (multiple) {
      return selectedValues.includes(optionValue)
    }
    return value === optionValue
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gold-200 mb-2">
          {label}
        </label>
      )}
      
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2 text-left
          bg-navy-900/50 border rounded-lg
          flex items-center justify-between
          transition-all duration-200
          ${disabled 
            ? 'opacity-50 cursor-not-allowed border-gold-500/20' 
            : 'hover:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 border-gold-500/30'
          }
          ${error ? 'border-red-500' : ''}
          ${isOpen ? 'ring-2 ring-gold-500' : ''}
        `}
      >
        <span className={`
          ${(multiple ? selectedValues.length === 0 : !value) ? 'text-gold-400/50' : 'text-gold-100'}
        `}>
          {getDisplayLabel()}
        </span>
        <ChevronDown className={`
          w-5 h-5 text-gold-400 transition-transform duration-200
          ${isOpen ? 'rotate-180' : ''}
        `} />
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}

      {/* Dropdown menu */}
      {isOpen && (
        <div className="
          absolute z-20 w-full mt-2
          bg-navy-800 border border-gold-500/30 rounded-lg
          shadow-2xl overflow-hidden
          animate-in fade-in slide-in-from-top-2 duration-200
        ">
          {/* Search input */}
          {searchable && (
            <div className="p-2 border-b border-gold-500/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="
                    w-full pl-9 pr-3 py-2
                    bg-navy-900/50 border border-gold-500/20 rounded-lg
                    text-gold-100 placeholder-gold-400/50
                    focus:outline-none focus:ring-2 focus:ring-gold-500
                  "
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-gold-400/50 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                  className={`
                    w-full px-4 py-3 text-left
                    flex items-center gap-3
                    transition-colors duration-150
                    ${option.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-gold-500/10'
                    }
                    ${isSelected(option.value) ? 'bg-gold-500/20 text-gold-200' : 'text-gold-100'}
                  `}
                >
                  {option.icon && (
                    <span className="flex-shrink-0">{option.icon}</span>
                  )}
                  <span className="flex-1 text-left">{option.label}</span>
                  {isSelected(option.value) && (
                    <Check className="w-4 h-4 text-gold-400 flex-shrink-0 ml-auto" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Multiple selection footer */}
          {multiple && selectedValues.length > 0 && (
            <div className="p-2 border-t border-gold-500/20">
              <button
                type="button"
                onClick={() => {
                  setSelectedValues([])
                  onChange('')
                }}
                className="text-sm text-gold-400 hover:text-gold-200 transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}