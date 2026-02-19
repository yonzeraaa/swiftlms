'use client'

import { useRouter } from 'next/navigation'
import { useDriveImport, ImportProgress } from '../contexts/DriveImportContext'
import DriveImportModal from './DriveImportModal'
import FloatingImportWidget from './FloatingImportWidget'

// Renders the Drive import modal and floating widget at layout level so the
// import session persists when the user navigates away from the courses page.
export default function ImportOverlay() {
  const router = useRouter()
  const {
    isOpen,
    isMinimized,
    courseId,
    sessionKey,
    minimizeImport,
    closeImport,
    updateProgress,
  } = useDriveImport()

  const isActive = isOpen || isMinimized

  if (!isActive || !courseId) return null

  const handleImportComplete = () => {
    closeImport()
    // Refresh the current route so the courses page shows updated data
    router.refresh()
  }

  return (
    <>
      <DriveImportModal
        key={sessionKey}
        isOpen={isOpen}
        courseId={courseId}
        onClose={closeImport}
        onMinimize={minimizeImport}
        onProgressUpdate={updateProgress}
        onImportComplete={handleImportComplete}
      />
      <FloatingImportWidget />
    </>
  )
}
