'use client'

import { motion } from 'framer-motion'
import { Maximize2, X } from 'lucide-react'
import { useDriveImport } from '../contexts/DriveImportContext'

export default function FloatingImportWidget() {
  const { isMinimized, courseName, progress, restoreImport, closeImport } = useDriveImport()
  const { completed, total, isImporting, isPaused } = progress

  if (!isMinimized) return null

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const isFinished = !isImporting && completed > 0 && completed === total
  const canClose = !isImporting || isFinished

  const statusLabel = isFinished
    ? 'Importação concluída'
    : isPaused
    ? 'Importação pausada'
    : 'Importando...'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-80 bg-navy-800 border border-gold-500/30 rounded-xl shadow-2xl shadow-black/40 p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs text-gold-400 font-medium uppercase tracking-wider mb-0.5">
            {statusLabel}
          </p>
          <p className="text-sm text-gold-200 font-semibold truncate">{courseName}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={restoreImport}
            className="p-1.5 rounded-lg text-gold-400 hover:text-gold-200 hover:bg-gold-500/10 transition-colors"
            title="Abrir importação"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {canClose && (
            <button
              onClick={closeImport}
              className="p-1.5 rounded-lg text-gold-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden mb-2">
        <motion.div
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3 }}
          className={`h-full rounded-full ${isFinished ? 'bg-green-500' : 'bg-blue-500'}`}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gold-400">
          {total > 0 ? `${completed} de ${total} itens` : 'Preparando...'}
        </span>
        <span className="text-xs text-gold-300 font-mono">{percent}%</span>
      </div>
    </motion.div>
  )
}
