'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const INK = '#1e130c'
const PARCH = '#faf6ee'

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(30,19,12,0.55)',
              zIndex: 40,
            }}
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              inset: '0 auto 0 0',
              width: 260,
              backgroundColor: INK,
              borderRight: '1px solid rgba(139,109,34,0.2)',
              zIndex: 50,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {title && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderBottom: '1px solid rgba(139,109,34,0.2)',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-lora, serif)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: PARCH,
                  }}
                >
                  {title}
                </span>
                <button
                  onClick={onClose}
                  aria-label="Fechar menu"
                  style={{
                    color: 'rgba(250,246,238,0.55)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div style={{ padding: '1rem', flex: 1 }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
