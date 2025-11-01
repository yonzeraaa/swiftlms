'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export default function MobileDrawer({ isOpen, onClose, children, title }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-64 bg-navy-800 border-r border-gold-500/20 z-50 md:hidden overflow-y-auto"
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-4 border-b border-gold-500/20">
                <h2 className="text-lg font-semibold text-gold-100">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-navy-700 rounded-lg transition-colors"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5 text-gold-400" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
