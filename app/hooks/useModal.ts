import { useState, useCallback } from 'react'

interface UseModalResult {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export function useModal(initialState = false): UseModalResult {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle
  }
}

// Extended modal hook with data management
interface UseModalWithDataResult<T> extends UseModalResult {
  data: T | null
  openWithData: (data: T) => void
  clearData: () => void
}

export function useModalWithData<T>(
  initialData: T | null = null
): UseModalWithDataResult<T> {
  const modal = useModal()
  const [data, setData] = useState<T | null>(initialData)

  const openWithData = useCallback((newData: T) => {
    setData(newData)
    modal.open()
  }, [modal])

  const close = useCallback(() => {
    modal.close()
    // Clear data after animation completes
    setTimeout(() => setData(null), 300)
  }, [modal])

  const clearData = useCallback(() => {
    setData(null)
  }, [])

  return {
    ...modal,
    close,
    data,
    openWithData,
    clearData
  }
}