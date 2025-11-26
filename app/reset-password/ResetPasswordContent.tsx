'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, Check, AlertCircle, ArrowLeft, Globe } from 'lucide-react'
import { setRecoverySession, checkRecoverySession, resetUserPassword } from '@/lib/actions/reset-password'
import { useTranslation } from '../contexts/LanguageContext'
import Logo from '../components/Logo'
import Button from '../components/Button'

export default function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'expired'>('idle')
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, language, setLanguage } = useTranslation()

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Verificar se há erro nos parâmetros da URL
        const urlError = searchParams.get('error')
        const errorCode = searchParams.get('error_code')
        const errorDescription = searchParams.get('error_description')

        if (urlError === 'access_denied' && errorCode === 'otp_expired') {
          setStatus('expired')
          setError(t('resetPassword.linkExpired'))
          return
        } else if (urlError) {
          setStatus('error')
          setError(errorDescription || t('resetPassword.linkInvalid'))
          return
        }

        // Verificar se há tokens de recuperação na URL
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const tokenType = searchParams.get('type')

        console.log('Reset password params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, tokenType })

        if (accessToken && refreshToken && tokenType === 'recovery') {
          console.log('Estabelecendo sessão com tokens de recuperação...')

          // Estabelecer sessão com os tokens via server action
          const result = await setRecoverySession(accessToken, refreshToken)

          if (!result.success) {
            console.error('Erro ao estabelecer sessão:', result.error)

            if (result.error?.includes('expired') || result.error?.includes('invalid')) {
              setStatus('expired')
              setError(t('resetPassword.sessionExpired'))
            } else {
              setError(result.error || t('resetPassword.sessionError'))
            }
          } else if (result.session) {
            console.log('Sessão estabelecida com sucesso para reset de senha')
            // Limpar a URL dos tokens por segurança
            window.history.replaceState({}, document.title, '/reset-password')
          } else {
            console.error('Sessão não pôde ser estabelecida')
            setStatus('expired')
            setError(t('resetPassword.sessionExpired'))
          }
        } else if (tokenType === 'recovery') {
          // Se type=recovery mas não há tokens, link provavelmente expirado
          setStatus('expired')
          setError(t('resetPassword.linkExpired'))
        } else {
          // Verificar se já existe uma sessão válida via server action
          const result = await checkRecoverySession()
          if (!result.success || !result.hasSession) {
            console.log('Nenhuma sessão ativa e nenhum token de recuperação')
            setStatus('expired')
            setError(t('resetPassword.linkExpired'))
          }
        }
      } catch (error) {
        console.error('Erro na inicialização da sessão:', error)
        setError(t('resetPassword.unexpectedError'))
      }
    }

    initializeSession()
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
      const result = await resetUserPassword(password)

      if (!result.success) {
        console.error('Erro ao redefinir senha:', result.error)

        // Tratar erros específicos
        if (result.error?.includes('expired') || result.error?.includes('invalid')) {
          setStatus('expired')
          setError(t('resetPassword.sessionExpired'))
        } else {
          setError(result.error || t('resetPassword.updateError'))
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
    <div className="min-h-screen bg-pattern relative overflow-hidden">
      {/* Gradiente de fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-600/50 via-navy-700/50 to-navy-900/50" />
      
      <div className="relative min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          {/* Language Selector - Above Card */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 bg-navy-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gold-500/20">
              <Globe className="w-4 h-4 text-gold-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-gold-200 text-base focus:outline-none cursor-pointer"
                aria-label={t('settings.language')}
              >
                <option value="pt-BR" className="bg-navy-800">Português (BR)</option>
                <option value="en-US" className="bg-navy-800">English (US)</option>
                <option value="es-ES" className="bg-navy-800">Español (ES)</option>
              </select>
            </div>
          </div>

          {/* Card principal com glassmorphism e borda gradiente */}
          <div className="glass-morphism border-gradient rounded-3xl shadow-2xl p-1">
            <div className="bg-navy-800/90 rounded-3xl p-8">
              {/* Header com logo */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-2">
                  <Logo width={180} height={80} className="transform hover:scale-110 transition-transform duration-300" />
                </div>
                <h1 className="text-2xl font-bold text-gold mb-2">
                  {status === 'expired' ? t('resetPassword.expiredTitle') : t('resetPassword.title')}
                </h1>
                <p className="text-gold-300 text-base">
                  {status === 'expired' ? t('resetPassword.expiredSubtitle') : t('resetPassword.subtitle')}
                </p>
              </div>

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
              <div className="space-y-2">
                <label htmlFor="password" className="block text-base font-medium text-gold-200">
                  {t('resetPassword.newPassword')}
                </label>
                <div className={`relative transition-all duration-300 ${passwordFocused ? 'scale-105' : ''}`}>
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className="w-full pl-10 pr-12 py-3 bg-navy-900/50 border border-navy-600 rounded-xl text-gold-100 text-base placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-base font-medium text-gold-200">
                  {t('resetPassword.confirmPassword')}
                </label>
                <div className={`relative transition-all duration-300 ${confirmPasswordFocused ? 'scale-105' : ''}`}>
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    className="w-full pl-10 pr-12 py-3 bg-navy-900/50 border border-navy-600 rounded-xl text-gold-100 text-base placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
      </div>
    </div>
  )
}