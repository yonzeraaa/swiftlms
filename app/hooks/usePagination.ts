import { useState, useMemo, useCallback } from 'react'

interface UsePaginationOptions {
  initialPage?: number
  itemsPerPage?: number
  totalItems: number
}

interface UsePaginationResult {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  startIndex: number
  endIndex: number
  hasPrevious: boolean
  hasNext: boolean
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  setItemsPerPage: (items: number) => void
  reset: () => void
}

export function usePagination({
  initialPage = 1,
  itemsPerPage = 10,
  totalItems
}: UsePaginationOptions): UsePaginationResult {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [perPage, setPerPage] = useState(itemsPerPage)

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / perPage)
  }, [totalItems, perPage])

  const startIndex = useMemo(() => {
    return (currentPage - 1) * perPage
  }, [currentPage, perPage])

  const endIndex = useMemo(() => {
    return Math.min(startIndex + perPage, totalItems)
  }, [startIndex, perPage, totalItems])

  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  const goToPage = useCallback((page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (hasNext) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasNext])

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      setCurrentPage(prev => prev - 1)
    }
  }, [hasPrevious])

  const setItemsPerPage = useCallback((items: number) => {
    setPerPage(items)
    setCurrentPage(1) // Reset to first page when changing items per page
  }, [])

  const reset = useCallback(() => {
    setCurrentPage(initialPage)
  }, [initialPage])

  return {
    currentPage,
    totalPages,
    itemsPerPage: perPage,
    startIndex,
    endIndex,
    hasPrevious,
    hasNext,
    goToPage,
    nextPage,
    previousPage,
    setItemsPerPage,
    reset
  }
}

// Hook for paginating arrays
export function usePaginatedData<T>(
  data: T[],
  options: Omit<UsePaginationOptions, 'totalItems'>
) {
  const pagination = usePagination({
    ...options,
    totalItems: data.length
  })

  const paginatedData = useMemo(() => {
    return data.slice(pagination.startIndex, pagination.endIndex)
  }, [data, pagination.startIndex, pagination.endIndex])

  return {
    ...pagination,
    paginatedData
  }
}