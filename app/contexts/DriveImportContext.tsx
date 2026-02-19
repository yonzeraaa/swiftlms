'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

export interface ImportProgress {
  completed: number
  total: number
  isImporting: boolean
  isPaused: boolean
}

interface DriveImportContextValue {
  // Session visibility
  isOpen: boolean
  isMinimized: boolean
  // Which course is being imported
  courseId: string
  courseName: string
  // Aggregate progress for the floating widget
  progress: ImportProgress
  // Increment counter so the modal re-mounts fresh on each new import session
  sessionKey: number
  // Actions
  openImport: (courseId: string, courseName: string) => void
  minimizeImport: () => void
  restoreImport: () => void
  closeImport: () => void
  updateProgress: (progress: ImportProgress) => void
}

const DriveImportContext = createContext<DriveImportContextValue | null>(null)

export function DriveImportProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [courseId, setCourseId] = useState('')
  const [courseName, setCourseName] = useState('')
  const [sessionKey, setSessionKey] = useState(0)
  const [progress, setProgress] = useState<ImportProgress>({
    completed: 0,
    total: 0,
    isImporting: false,
    isPaused: false,
  })

  const openImport = useCallback((id: string, name: string) => {
    setCourseId(id)
    setCourseName(name)
    setSessionKey(k => k + 1)
    setProgress({ completed: 0, total: 0, isImporting: false, isPaused: false })
    setIsMinimized(false)
    setIsOpen(true)
  }, [])

  const minimizeImport = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(true)
  }, [])

  const restoreImport = useCallback(() => {
    setIsMinimized(false)
    setIsOpen(true)
  }, [])

  const closeImport = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(false)
  }, [])

  const updateProgress = useCallback((p: ImportProgress) => {
    setProgress(p)
  }, [])

  return (
    <DriveImportContext.Provider value={{
      isOpen,
      isMinimized,
      courseId,
      courseName,
      progress,
      sessionKey,
      openImport,
      minimizeImport,
      restoreImport,
      closeImport,
      updateProgress,
    }}>
      {children}
    </DriveImportContext.Provider>
  )
}

export function useDriveImport() {
  const context = useContext(DriveImportContext)
  if (!context) throw new Error('useDriveImport must be used within DriveImportProvider')
  return context
}
