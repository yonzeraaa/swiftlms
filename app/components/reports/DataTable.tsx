'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Download,
  Settings2,
  Loader2
} from 'lucide-react'

export interface Column<T = any> {
  key: string
  header: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  format?: (value: any, row: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  itemsPerPageOptions?: number[]
  defaultItemsPerPage?: number
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  showPagination?: boolean
  showHeader?: boolean
  density?: 'compact' | 'normal' | 'comfortable'
  stickyHeader?: boolean
  maxHeight?: string
  showRowNumbers?: boolean
  zebra?: boolean
  hoverable?: boolean
  borderless?: boolean
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  itemsPerPageOptions = [10, 25, 50, 100],
  defaultItemsPerPage = 25,
  onRowClick,
  rowClassName,
  emptyMessage = 'Nenhum dado encontrado',
  emptyIcon,
  showPagination = true,
  showHeader = true,
  density = 'normal',
  stickyHeader = false,
  maxHeight,
  showRowNumbers = false,
  zebra = true,
  hoverable = true,
  borderless = false
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: string | null
    direction: 'asc' | 'desc' | null
  }>({ key: null, direction: null })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage)

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1)
  }, [data])

  // Densidade de padding baseada na prop density
  const densityClasses = {
    compact: 'py-2 px-4',
    normal: 'py-4 px-6',
    comfortable: 'py-6 px-8'
  }

  // Filtrar dados baseado na busca
  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    return data.filter(row => {
      return columns.some(column => {
        const value = row[column.key]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(searchTerm.toLowerCase())
      })
    })
  }, [data, searchTerm, columns])

  // Ordenar dados
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key!]
      const bValue = b[sortConfig.key!]

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

  // Paginar dados
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData
    
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, itemsPerPage, showPagination])

  // Calcular informações de paginação
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, sortedData.length)

  // Função para ordenar
  const handleSort = (key: string) => {
    if (!columns.find(col => col.key === key)?.sortable) return

    let direction: 'asc' | 'desc' | null = 'asc'
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = null
      }
    }

    setSortConfig({ key: direction ? key : null, direction })
  }

  // Renderizar ícone de ordenação
  const renderSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-gold-500/30" />
    }
    
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-4 h-4 text-gold-400" />
    }
    
    return <ChevronDown className="w-4 h-4 text-gold-400" />
  }

  // Gerar páginas para navegação
  const generatePageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5
    const halfPages = Math.floor(maxPagesToShow / 2)
    
    let startPage = Math.max(1, currentPage - halfPages)
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)
    
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
        <p className="text-gold-300 text-sm">Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com busca e ações */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {searchable && (
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gold-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-10 pr-10 py-2.5 w-full sm:w-80 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gold-400 hover:text-gold-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-gold-300 text-sm">
              {sortedData.length} {sortedData.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className={`overflow-x-auto ${maxHeight ? 'overflow-y-auto' : ''} ${borderless ? '' : 'border border-gold-500/20'} rounded-lg bg-navy-900/30`} style={{ maxHeight }}>
        <table className="w-full">
          <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} bg-navy-800/80 backdrop-blur-sm`}>
            <tr className="border-b border-gold-500/20">
              {showRowNumbers && (
                <th className={`${densityClasses[density]} text-left text-gold-200 font-medium uppercase text-xs tracking-wider w-16`}>
                  #
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${densityClasses[density]} 
                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                    ${column.sortable ? 'cursor-pointer select-none hover:bg-navy-700/30 transition-colors' : ''}
                    ${column.headerClassName || ''}
                    text-gold-200 font-medium uppercase text-xs tracking-wider
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                  scope="col"
                  aria-sort={
                    sortConfig.key === column.key
                      ? (sortConfig.direction === 'asc' ? 'ascending' : sortConfig.direction === 'desc' ? 'descending' : 'none')
                      : 'none'
                  }
                >
                  <div className={`flex items-center gap-2 ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''}`}>
                    <span>{column.header}</span>
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-500/10">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showRowNumbers ? 1 : 0)} className="py-12">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    {emptyIcon || <Filter className="w-12 h-12 text-gold-500/30" />}
                    <p className="text-gold-300 text-sm">{emptyMessage}</p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-gold-400 hover:text-gold-200 text-sm underline transition-colors"
                      >
                        Limpar busca
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const actualIndex = (currentPage - 1) * itemsPerPage + rowIndex
                return (
                  <tr
                    key={rowIndex}
                    onClick={() => onRowClick?.(row)}
                    className={`
                      ${zebra && actualIndex % 2 === 1 ? 'bg-navy-800/20' : ''}
                      ${hoverable ? 'hover:bg-navy-700/30' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${rowClassName?.(row) || ''}
                      transition-colors
                    `}
                  >
                    {showRowNumbers && (
                      <td className={`${densityClasses[density]} text-gold-400 text-sm font-mono`}>
                        {startItem + rowIndex}
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`
                          ${densityClasses[density]}
                          ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                          ${column.className || ''}
                          text-gold-100 text-sm
                        `}
                      >
                        {column.format ? column.format(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {showPagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gold-300 text-sm">Itens por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1.5 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <span className="text-gold-300 text-sm">
              Mostrando {startItem} a {endItem} de {sortedData.length} itens
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Primeira página */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`
                p-2 rounded-lg transition-all
                ${currentPage === 1 
                  ? 'text-gold-500/30 cursor-not-allowed' 
                  : 'text-gold-400 hover:text-gold-200 hover:bg-navy-700/30'
                }
              `}
              title="Primeira página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Página anterior */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`
                p-2 rounded-lg transition-all
                ${currentPage === 1 
                  ? 'text-gold-500/30 cursor-not-allowed' 
                  : 'text-gold-400 hover:text-gold-200 hover:bg-navy-700/30'
                }
              `}
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1 px-2">
              {currentPage > 3 && totalPages > 5 && (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className="px-3 py-1.5 text-sm text-gold-400 hover:text-gold-200 hover:bg-navy-700/30 rounded-lg transition-all"
                  >
                    1
                  </button>
                  <span className="text-gold-500/50 px-1">...</span>
                </>
              )}
              
              {generatePageNumbers().map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`
                    px-3 py-1.5 text-sm rounded-lg transition-all
                    ${currentPage === page 
                      ? 'bg-gold-500/20 text-gold-200 font-medium' 
                      : 'text-gold-400 hover:text-gold-200 hover:bg-navy-700/30'
                    }
                  `}
                >
                  {page}
                </button>
              ))}
              
              {currentPage < totalPages - 2 && totalPages > 5 && (
                <>
                  <span className="text-gold-500/50 px-1">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-3 py-1.5 text-sm text-gold-400 hover:text-gold-200 hover:bg-navy-700/30 rounded-lg transition-all"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            {/* Próxima página */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`
                p-2 rounded-lg transition-all
                ${currentPage === totalPages 
                  ? 'text-gold-500/30 cursor-not-allowed' 
                  : 'text-gold-400 hover:text-gold-200 hover:bg-navy-700/30'
                }
              `}
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Última página */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`
                p-2 rounded-lg transition-all
                ${currentPage === totalPages 
                  ? 'text-gold-500/30 cursor-not-allowed' 
                  : 'text-gold-400 hover:text-gold-200 hover:bg-navy-700/30'
                }
              `}
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
