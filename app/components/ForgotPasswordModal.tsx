'use client'

import { useState } from 'react'
import { X, Mail, Send, Check, AlertCircle } from 'lucide-react'
import { useTranslation } from '../contexts/LanguageContext'
import Button from './Button'
import { sendPasswordResetEmail } from '@/lib/actions/forgot-password'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

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
        // Check if error is about user not found
        if (result.error?.includes('não encontrado') || result.error?.includes('not found')) {
          setError(t('forgotPassword.emailNotFound'))
        } else {
          setError(result.error || t('forgotPassword.sendError'))
        }
        setIsLoading(false)
        return
      }

      // Sucesso
      setStatus('success')
      setIsLoading(false)

      // Fechar modal após 3 segundos
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-navy-800 rounded-2xl max-w-md w-full border border-gold-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-navy-600">
          <div>
            <h2 className="text-xl font-bold text-gold">{t('forgotPassword.title')}</h2>
            <p className="text-gold-300 text-sm mt-1">{t('forgotPassword.subtitle')}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gold-300 hover:text-gold transition-colors disabled:opacity-50"
            aria-label={t('forgotPassword.close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">
                  {t('forgotPassword.successTitle')}
                </h3>
                <p className="text-gold-300 text-sm">
                  {t('forgotPassword.successMessage')}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Instructions */}
              <p className="text-gold-300 text-sm">
                {t('forgotPassword.instructions')}
              </p>

              {/* Email Field */}
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gold-200 mb-2">
                  {t('forgotPassword.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400" />
                  <input
                    type="email"
                    id="reset-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all"
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {t('forgotPassword.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isLoading}
                  icon={!isLoading && <Send className="w-4 h-4" />}
                  iconPosition="right"
                  className="flex-1"
                >
                  {t('forgotPassword.send')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}