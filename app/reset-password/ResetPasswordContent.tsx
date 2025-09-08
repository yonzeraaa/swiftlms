'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../contexts/LanguageContext'
import Logo from '../components/Logo'
import Button from '../components/Button'

export default function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'expired'>('idle')
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const supabase = createClient()

  useEffect(() => {
    // Verificar se há erro nos parâmetros da URL
    const urlError = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')

    if (urlError === 'access_denied' && errorCode === 'otp_expired') {
      setStatus('expired')
      setError(t('resetPassword.linkExpired'))
    } else if (urlError) {
      setStatus('error')
      setError(errorDescription || t('resetPassword.linkInvalid'))
    }
  }, [searchParams, t])

  const validatePasswords = () => {
    if (!password.trim()) {
      setError(t('resetPassword.passwordRequired'))
      return false
    }

    if (password.length < 6) {
      setError(t('resetPassword.passwordTooShort'))
      return false
    }

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'))
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!validatePasswords()) {
      setIsLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Erro ao redefinir senha:', updateError)
        
        // Tratar erros específicos
        if (updateError.message.includes('expired') || updateError.message.includes('invalid')) {
          setStatus('expired')
          setError(t('resetPassword.sessionExpired'))
        } else {
          setError(updateError.message || t('resetPassword.updateError'))
        }
        setIsLoading(false)
        return
      }

      // Sucesso
      setStatus('success')
      setIsLoading(false)
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (err) {
      console.error('Erro inesperado:', err)
      setError(t('resetPassword.unexpectedError'))
      setIsLoading(false)
    }
  }

  const handleRequestNewLink = () => {
    router.push('/?forgot-password=true')
  }

  const handleBackToLogin = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gold mb-2">
            {status === 'expired' ? t('resetPassword.expiredTitle') : t('resetPassword.title')}
          </h1>
          <p className="text-gold-300">
            {status === 'expired' ? t('resetPassword.expiredSubtitle') : t('resetPassword.subtitle')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-navy-800 rounded-2xl border border-gold-500/20 p-8">
          {status === 'success' ? (
            // Tela de sucesso
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">
                  {t('resetPassword.successTitle')}
                </h3>
                <p className="text-gold-300 text-sm">
                  {t('resetPassword.successMessage')}
                </p>
              </div>
            </div>
          ) : status === 'expired' ? (
            // Tela de link expirado
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orange-400 mb-2">
                  {t('resetPassword.linkExpiredTitle')}
                </h3>
                <p className="text-gold-300 text-sm mb-6">
                  {t('resetPassword.linkExpiredMessage')}
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={handleRequestNewLink}
                    variant="primary"
                    className="w-full"
                  >
                    {t('resetPassword.requestNewLink')}
                  </Button>
                  <Button
                    onClick={handleBackToLogin}
                    variant="secondary"
                    className="w-full"
                    icon={<ArrowLeft className="w-4 h-4" />}
                  >
                    {t('resetPassword.backToLogin')}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Formulário de nova senha
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo Nova Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gold-200 mb-2">
                  {t('resetPassword.newPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all"
                    placeholder={t('resetPassword.passwordPlaceholder')}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-400 hover:text-gold-300 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gold-300/70 mt-1">
                  {t('resetPassword.passwordRequirement')}
                </p>
              </div>

              {/* Campo Confirmar Senha */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gold-200 mb-2">
                  {t('resetPassword.confirmPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all"
                    placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-400 hover:text-gold-300 transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Botões */}
              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isLoading}
                  className="w-full"
                >
                  {t('resetPassword.updatePassword')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBackToLogin}
                  disabled={isLoading}
                  className="w-full"
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  {t('resetPassword.backToLogin')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}