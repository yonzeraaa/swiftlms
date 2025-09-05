'use client'

import { useState, useMemo, ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter, X } from 'lucide-react'
import Dropdown from './Dropdown'
import Badge from './Badge'

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, row: T) => ReactNode
  filterType?: 'text' | 'select' | 'date' | 'number'
  filterOptions?: { label: string; value: string }[]
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  itemsPerPage?: number
  showPagination?: boolean
  onRowClick?: (row: T) => void
  rowKey: keyof T
  emptyMessage?: string
  loading?: boolean
  striped?: boolean
  compact?: boolean
  stickyHeader?: boolean
}

type SortDirection = 'asc' | 'desc' | null

interface SortConfig {
  key: string
  direction: SortDirection
}

interface FilterConfig {
  [key: string]: any
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  itemsPerPage = 10,
  showPagination = true,
  onRowClick,
  rowKey,
  emptyMessage = 'Nenhum item encontrado',
  loading = false,
  striped = false,
  compact = false,
  stickyHeader = false
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<FilterConfig>({})
  const [showFilters, setShowFilters] = useState(false)

  // Get nested property value
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj)
  }

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row => {
        return columns.some(column => {
          const value = getNestedValue(row, column.key as string)
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      })
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue !== undefined && filterValue !== '') {
        filtered = filtered.filter(row => {
          const value = getNestedValue(row, key)
          const column = columns.find(col => col.key === key)
          
          if (column?.filterType === 'select') {
            return value === filterValue
          }
          
          return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
        })
      }
    })

    return filtered
  }, [data, searchTerm, filters, columns])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return filteredData
    }

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key)
      const bValue = getNestedValue(b, sortConfig.key)

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [filteredData, sortConfig])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData
    
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedData.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedData, currentPage, itemsPerPage, showPagination])

  const totalPages = Math.ceil(sortedData.length / itemsPerPage)

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: 
        prev.key === key 
          ? prev.direction === 'asc' 
            ? 'desc' 
            : prev.direction === 'desc' 
              ? null 
              : 'asc'
          : 'asc'
    }))
  }

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-gold-400/30" />
    }
    
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-4 h-4 text-gold-400" />
    }
    
    if (sortConfig.direction === 'desc') {
      return <ChevronDown className="w-4 h-4 text-gold-400" />
    }
    
    return <ChevronsUpDown className="w-4 h-4 text-gold-400/30" />
  }

  const clearFilter = (key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  const hasActiveFilters = Object.keys(filters).length > 0

  if (loading) {
    return (
      <div className="bg-navy-800/50 rounded-xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gold-300">Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      {(searchable || columns.some(col => col.filterType)) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400/50" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 bg-navy-800/50 border border-gold-500/20 rounded-lg text-gold-300 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-transparent"
              />
            </div>
          )}
          
          {columns.some(col => col.filterType) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
                ${showFilters || hasActiveFilters
                  ? 'bg-gold-500 text-navy-900'
                  : 'bg-navy-800/50 text-gold-300 hover:bg-navy-700/50'
                }
                border border-gold-500/20
              `}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <Badge size="sm" variant="error">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </button>
          )}
        </div>
      )}

      {/* Active Filters */}
      {showFilters && (
        <div className="bg-navy-800/30 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {columns
              .filter(col => col.filterType)
              .map(column => (
                <div key={column.key as string}>
                  <label className="block text-sm font-medium text-gold-300 mb-1">
                    {column.label}
                  </label>
                  
                  {column.filterType === 'select' && column.filterOptions ? (
                    <Dropdown
                      options={column.filterOptions}
                      value={filters[column.key as string] || ''}
                      onChange={(value) => {
                        setFilters(prev => ({ ...prev, [column.key as string]: value }))
                        setCurrentPage(1)
                      }}
                      placeholder={`Filtrar ${column.label}`}
                      className="w-full"
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type={column.filterType === 'number' ? 'number' : 'text'}
                        value={filters[column.key as string] || ''}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, [column.key as string]: e.target.value }))
                          setCurrentPage(1)
                        }}
                        placeholder={`Filtrar ${column.label}`}
                        className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-300 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-transparent"
                      />
                      {filters[column.key as string] && (
                        <button
                          onClick={() => clearFilter(column.key as string)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gold-400/50 hover:text-gold-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
          
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilters({})
                setCurrentPage(1)
              }}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className={`overflow-x-auto rounded-xl border border-gold-500/20 ${stickyHeader ? 'table-sticky' : ''}`}>
        <table className="w-full">
          <thead className="bg-navy-800/50 border-b border-gold-500/20">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key as string}
                  className={`
                    text-left text-gold-300 font-medium
                    ${compact ? 'px-4 py-2 text-sm' : 'px-6 py-4'}
                    ${column.sortable ? 'cursor-pointer hover:bg-navy-700/30 transition-colors' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key as string)}
                  scope="col"
                  aria-sort={
                    sortConfig.key === (column.key as string)
                      ? (sortConfig.direction === 'asc' ? 'ascending' : sortConfig.direction === 'desc' ? 'descending' : 'none')
                      : 'none'
                  }
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && getSortIcon(column.key as string)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gold-500/10">
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="text-center py-12 text-gold-300/50"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={String(row[rowKey])}
                  className={`
                    transition-colors
                    ${onRowClick ? 'cursor-pointer hover:bg-gold-500/5' : ''}
                    ${striped && index % 2 === 0 ? 'bg-navy-800/20' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(column => (
                    <td
                      key={`${String(row[rowKey])}-${column.key as string}`}
                      className={`
                        text-gold-300/80
                        ${compact ? 'px-4 py-2 text-sm' : 'px-6 py-4'}
                      `}
                    >
                      {column.render
                        ? column.render(getNestedValue(row, column.key as string), row)
                        : getNestedValue(row, column.key as string)
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gold-300/60">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedData.length)} de {sortedData.length} itens
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg bg-navy-800/50 text-gold-300 hover:bg-navy-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Primeira
            </button>
            
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg bg-navy-800/50 text-gold-300 hover:bg-navy-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Anterior
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber
                if (totalPages <= 5) {
                  pageNumber = i + 1
                } else if (currentPage <= 3) {
                  pageNumber = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i
                } else {
                  pageNumber = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`
                      w-8 h-8 rounded-lg transition-all
                      ${currentPage === pageNumber
                        ? 'bg-gold-500 text-navy-900'
                        : 'bg-navy-800/50 text-gold-300 hover:bg-navy-700/50'
                      }
                    `}
                  >
                    {pageNumber}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg bg-navy-800/50 text-gold-300 hover:bg-navy-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Próxima
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg bg-navy-800/50 text-gold-300 hover:bg-navy-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Última
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
