'use client'

import { useState } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '../contexts/LanguageContext'
import { sendPasswordResetEmail } from '@/lib/actions/forgot-password'
import { Playfair_Display, Lora } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

const INK    = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED  = '#7a6350'
const BORDER = 'rgba(30,19,12,0.14)'

function ClassicRule({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 300 14" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0"   y1="7" x2="133" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <line x1="167" y1="7" x2="300" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <path d="M150,2 L155,7 L150,12 L145,7 Z" stroke="currentColor" strokeWidth="1.1" opacity="0.5" fill="none" />
      <circle cx="140" cy="7" r="1.3" fill="currentColor" opacity="0.32" />
      <circle cx="160" cy="7" r="1.3" fill="currentColor" opacity="0.32" />
    </svg>
  )
}

function CornerBracket({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2,18 L2,2 L18,2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    </svg>
  )
}

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { t } = useTranslation()
  const [email, setEmail]         = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus]       = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError]         = useState<string | null>(null)

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!email.trim()) {
      setError(t('forgotPassword.emailRequired'))
      setIsLoading(false)
      return
    }
    if (!validateEmail(email)) {
      setError(t('forgotPassword.emailInvalid'))
      setIsLoading(false)
      return
    }

    try {
      const result = await sendPasswordResetEmail(email)
      if (!result.success) {
        const isNotFound = result.error?.includes('não encontrado') || result.error?.includes('not found')
        setError(isNotFound ? t('forgotPassword.emailNotFound') : (result.error || t('forgotPassword.sendError')))
        setIsLoading(false)
        return
      }
      setStatus('success')
      setIsLoading(false)
      setTimeout(() => {
        onClose()
        setStatus('idle')
        setEmail('')
        setError(null)
      }, 3000)
    } catch (err) {
      console.error('Erro inesperado:', err)
      setError(t('forgotPassword.unexpectedError'))
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setStatus('idle')
      setEmail('')
      setError(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 flex items-center justify-center p-4 z-50 ${playfair.variable} ${lora.variable}`}
          style={{ backgroundColor: 'rgba(30,19,12,0.4)', backdropFilter: 'blur(3px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="relative max-w-md w-full"
            style={{
              backgroundColor: '#faf6ee',
              border: `1px solid ${BORDER}`,
              boxShadow: '0 8px 48px rgba(30,19,12,0.16)',
            }}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8" style={{ color: ACCENT }}><CornerBracket /></div>
            <div className="absolute top-0 right-0 w-8 h-8" style={{ color: ACCENT, transform: 'scaleX(-1)' }}><CornerBracket /></div>
            <div className="absolute bottom-0 left-0 w-8 h-8" style={{ color: ACCENT, transform: 'scaleY(-1)' }}><CornerBracket /></div>
            <div className="absolute bottom-0 right-0 w-8 h-8" style={{ color: ACCENT, transform: 'scale(-1)' }}><CornerBracket /></div>

            {/* Header */}
            <div className="flex items-start justify-between p-7 pb-4">
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-playfair)',
                    color: INK,
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {t('forgotPassword.title')}
                </h2>
                <p
                  className="mt-1"
                  style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '0.88rem', fontStyle: 'italic' }}
                >
                  {t('forgotPassword.subtitle')}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="ml-4 mt-0.5 transition-all duration-150 disabled:opacity-40"
                style={{ color: MUTED, opacity: 0.55 }}
                aria-label={t('forgotPassword.close')}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.55')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-7">
              <ClassicRule className="w-full" style={{ color: INK } as React.CSSProperties} />
            </div>

            <div className="p-7 pt-5">
              {status === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4 py-4"
                >
                  <div
                    className="w-12 h-12 flex items-center justify-center mx-auto"
                    style={{ border: `1px solid ${BORDER}`, backgroundColor: 'rgba(139,109,34,0.08)' }}
                  >
                    <Check className="w-5 h-5" style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <h3
                      style={{ fontFamily: 'var(--font-playfair)', color: ACCENT, fontSize: '1.1rem', fontWeight: 600, fontStyle: 'italic' }}
                    >
                      {t('forgotPassword.successTitle')}
                    </h3>
                    <p
                      className="mt-1"
                      style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '0.88rem' }}
                    >
                      {t('forgotPassword.successMessage')}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <p style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '0.9rem', lineHeight: 1.65 }}>
                    {t('forgotPassword.instructions')}
                  </p>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="reset-email"
                      style={{
                        fontFamily: 'var(--font-lora)',
                        color: MUTED,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase' as const,
                        display: 'block',
                        marginBottom: '0.4rem',
                      }}
                    >
                      {t('forgotPassword.email')}
                    </label>
                    <input
                      type="email"
                      id="reset-email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('forgotPassword.emailPlaceholder')}
                      required
                      disabled={isLoading}
                      className="w-full bg-transparent px-0 py-2.5 focus:outline-none transition-colors duration-200 placeholder:italic"
                      style={{
                        fontFamily: 'var(--font-lora)',
                        fontSize: '1rem',
                        color: INK,
                        borderBottom: `1px solid rgba(30,19,12,0.25)`,
                        caretColor: ACCENT,
                      }}
                      onFocus={e => (e.currentTarget.style.borderBottomColor = ACCENT)}
                      onBlur={e => (e.currentTarget.style.borderBottomColor = 'rgba(30,19,12,0.25)')}
                    />
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="flex items-center gap-2 py-2 px-3"
                          style={{ borderLeft: `2px solid #8b2525`, backgroundColor: 'rgba(139,37,37,0.06)' }}
                        >
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#8b2525' }} />
                          <p style={{ fontFamily: 'var(--font-lora)', color: '#8b2525', fontSize: '0.85rem' }}>{error}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="flex-1 py-2.5 transition-all duration-200 disabled:opacity-50"
                      style={{
                        fontFamily: 'var(--font-lora)',
                        color: MUTED,
                        fontSize: '0.88rem',
                        border: `1px solid ${BORDER}`,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(30,19,12,0.04)'
                        e.currentTarget.style.borderColor = 'rgba(30,19,12,0.28)'
                        e.currentTarget.style.color = INK
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = BORDER
                        e.currentTarget.style.color = MUTED
                      }}
                    >
                      {t('forgotPassword.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 transition-all duration-200 disabled:opacity-60"
                      style={{
                        fontFamily: 'var(--font-lora)',
                        color: '#faf6ee',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        backgroundColor: INK,
                        border: `1px solid ${INK}`,
                      }}
                      onMouseEnter={e => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#2c1c0e'
                          e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(250,246,238,0.1)'
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = INK
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {isLoading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <span
                            className="inline-block w-3 h-3 border-2 rounded-full animate-spin"
                            style={{ borderColor: 'rgba(250,246,238,0.35) transparent transparent transparent' }}
                          />
                          Aguarde
                        </span>
                      ) : t('forgotPassword.send')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
