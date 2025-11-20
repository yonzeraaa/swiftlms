'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, Globe, BookOpen, MessageCircle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from './components/Logo'
import Button from './components/Button'
import Card from './components/Card'
import { StaggerTransition, StaggerItem } from './components/ui/PageTransition'
import ContactModal from './components/ContactModal'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import { useTranslation } from './contexts/LanguageContext'
import type { Language } from './contexts/LanguageContext'
import { shake } from '@/lib/animation-presets'
import { checkAuthStatus } from '@/lib/actions/browse-enroll'

export default function LoginPage() {
  const { t, language, setLanguage } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false)
  const router = useRouter()

  // Check if user is already logged in and redirect, also handle forgot-password param
  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await checkAuthStatus()

      if (authStatus.isAuthenticated) {
        // User is already logged in, redirect to appropriate dashboard
        const redirectUrl = authStatus.role === 'student' ? '/student-dashboard' : '/dashboard'
        router.push(redirectUrl)
      } else {
        // Check for forgot-password parameter
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('forgot-password') === 'true') {
          setForgotPasswordModalOpen(true)
          // Clean URL without refreshing page
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Usar endpoint seguro com CSRF, rate limiting e validação
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Tratar erros específicos
        if (response.status === 429) {
          setError(data.error || t('login.tooManyAttempts'))
        } else if (response.status === 401) {
          setError(t('login.invalidCredentials'))
        } else if (response.status === 403) {
          setError(t('login.blockedRequest'))
        } else {
          setError(data.error || t('login.loginError'))
        }
        setShowError(true)
        setIsLoading(false)
        return
      }

      if (data.success) {
        // Mostrar feedback de sucesso
        setSuccess(true)

        // Iniciar gestão de sessão (renovação automática e detecção de inatividade)
        const { SessionManager } = await import('@/lib/auth/session-manager')
        const sessionManager = SessionManager.getInstance()
        sessionManager.startSession()

        // Pequeno delay para garantir que cookies sejam definidos
        await new Promise(resolve => setTimeout(resolve, 300))

        // Redirecionar para dashboard apropriado
        window.location.href = data.redirectUrl
      } else {
        setError(t('login.loginError'))
        setShowError(true)
        setIsLoading(false)
      }
    } catch (err) {
      setError(t('login.unexpectedError'))
      setShowError(true)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 relative overflow-hidden">
      {/* Fundo discreto com gradiente suave */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-800/30 to-navy-900" />

      <div className="relative min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <StaggerTransition staggerDelay={0.1}>
            {/* Language Selector - Above Login Card */}
            <StaggerItem>
              <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 bg-navy-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gold-500/20">
              <Globe className="w-4 h-4 text-gold-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-gold-200 text-base focus:outline-none cursor-pointer"
                aria-label={t('settings.language')}
              >
                <option value="pt-BR" className="bg-navy-800">Português (BR)</option>
                <option value="en-US" className="bg-navy-800">English (US)</option>
                <option value="es-ES" className="bg-navy-800">Español (ES)</option>
              </select>
            </div>
              </div>
            </StaggerItem>
            {/* Card principal com design sóbrio */}
            <StaggerItem>
              <Card padding="lg">
            {/* Header com logo */}
            <div className="text-center mb-4">
                <div className="flex justify-center mb-2">
                  <Logo width={180} height={80} className="transform hover:scale-110 transition-transform duration-300" />
                </div>
                <p className="text-gold-200 text-lg font-semibold mt-1">{t('login.systemSubtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campo de Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-base font-medium text-gold-200">
                    {t('login.email')}
                  </label>
                  <div className={`relative transition-all duration-300 ${emailFocused ? 'scale-105' : ''}`}>
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-navy-600 rounded-xl text-gold-100 text-base placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                      placeholder={t('login.emailPlaceholder')}
                      required
                      disabled={isLoading}
                      aria-label={t('login.emailAriaLabel')}
                    />
                  </div>
                </div>

                {/* Campo de Senha */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-base font-medium text-gold-200">
                    {t('login.password')}
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
                      placeholder={t('login.passwordPlaceholder')}
                      required
                      disabled={isLoading}
                      aria-label={t('login.passwordAriaLabel')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-400 hover:text-gold-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded"
                      aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Checkbox Lembrar-me e Esqueci a senha */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 mt-1 bg-navy-900/50 border-navy-600 rounded text-gold-500 focus:ring-gold-500 focus:ring-2 cursor-pointer"
                      disabled={isLoading}
                      aria-label={t('login.rememberAriaLabel')}
                    />
                    <label htmlFor="remember" className="ml-2 mt-0.5 text-sm text-gold-300 cursor-pointer select-none">
                      {t('login.rememberMe')}
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordModalOpen(true)}
                    disabled={isLoading}
                    className="text-sm text-gold-300 hover:text-gold-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded px-1 disabled:opacity-50"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>

                {/* Botão de Login */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                  icon={!isLoading && <ArrowRight className="w-5 h-5" />}
                  iconPosition="right"
                  aria-label={t('login.loginAriaLabel')}
                  enableMotion
                >
                  {t('login.enter')}
                </Button>
              </form>

              {/* Success message */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <p className="text-base text-green-400">Login bem-sucedido! Redirecionando...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message with shake animation */}
              <AnimatePresence>
                {error && showError && (
                  <motion.div
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    variants={shake}
                    whileInView="shake"
                    viewport={{ once: true }}
                    className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-base text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botões centralizados */}
              <div className="mt-6 space-y-4">
                {/* Botão Ver Cursos Disponíveis - Centralizado */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => router.push('/browse-courses')}
                    icon={<BookOpen className="w-4 h-4 flex-shrink-0" />}
                    iconPosition="left"
                    className="text-gold-300 border-gold-500/30 hover:border-gold-400 hover:bg-gold-500/10"
                  >
                    {t('login.viewCourses')}
                  </Button>
                </div>

                {/* Seção Fale Conosco com texto */}
                <div className="text-center space-y-2">
                  <p className="text-gold-300/80 text-sm">{t('login.contactPrompt')}</p>
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setContactModalOpen(true)}
                      icon={<MessageCircle className="w-4 h-4 flex-shrink-0" />}
                      iconPosition="left"
                      className="text-gold-300/80 hover:text-gold-200 hover:bg-gold-500/10"
                    >
                      {t('login.contactButton')}
                    </Button>
                  </div>
                </div>
                
                <div className="pt-2 text-center">
                  <p className="text-gold-200/70 text-xs sm:text-sm">
                    Powered by IQMasetti &amp; RTronics. Todos os direitos reservados.
                  </p>
                </div>
              </div>
              </Card>
            </StaggerItem>
          </StaggerTransition>
        </div>
      </div>
      
      {/* Contact Modal */}
      <ContactModal 
        isOpen={contactModalOpen} 
        onClose={() => setContactModalOpen(false)} 
      />
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={forgotPasswordModalOpen} 
        onClose={() => setForgotPasswordModalOpen(false)} 
      />
    </div>
  )
}
