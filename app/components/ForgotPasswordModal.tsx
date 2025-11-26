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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-gray-200 dark:border-slate-700 shadow-2xl transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('forgotPassword.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('forgotPassword.subtitle')}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
            aria-label={t('forgotPassword.close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                  {t('forgotPassword.successTitle')}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  {t('forgotPassword.successMessage')}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Instructions */}
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                {t('forgotPassword.instructions')}
              </p>

              {/* Email Field */}
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('forgotPassword.email')}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="email"
                    id="reset-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t('forgotPassword.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isLoading}
                  icon={!isLoading && <Send className="w-4 h-4" />}
                  iconPosition="right"
                  className="flex-1 !bg-indigo-600 !hover:bg-indigo-700 !text-white !border-transparent"
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