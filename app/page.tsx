'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Loader2, AlertCircle, Globe, BookOpen, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Logo from './components/Logo'
import Button from './components/Button'
import ContactModal from './components/ContactModal'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from './contexts/LanguageContext'

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
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  // Check if user is already logged in and redirect, also handle forgot-password param
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // User is already logged in, redirect to appropriate dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        const redirectUrl = profile?.role === 'student' ? '/student-dashboard' : '/dashboard'
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
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    console.log('Attempting login with email:', email)
    
    try {
      // Login direto via cliente (como funciona em /test-auth)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Login error:', error)
        // Handle specific error messages
        if (error.message?.includes('Invalid login credentials')) {
          setError(t('login.invalidCredentials'))
        } else if (error.message?.includes('Email not confirmed')) {
          setError(t('login.confirmEmail'))
        } else {
          setError(error.message || t('login.loginError'))
        }
        setIsLoading(false)
        return
      }
      
      if (data.user && data.session) {
        console.log('Login successful, user:', data.user.email)
        
        // Sincronizar sessão com o servidor imediatamente após o login
        console.log('Sincronizando sessão com o servidor...')
        try {
          const syncResponse = await fetch('/api/auth/sync-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token
            })
          })
          
          const syncResult = await syncResponse.json()
          
          if (!syncResponse.ok) {
            console.error('Erro ao sincronizar sessão:', syncResult.error)
          } else {
            console.log('Sessão sincronizada com sucesso!')
          }
        } catch (syncError) {
          console.error('Erro ao sincronizar sessão:', syncError)
        }
        
        // Get user profile to determine redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        
        const redirectUrl = profile?.role === 'student' 
          ? '/student-dashboard' 
          : '/dashboard'
        
        console.log('Redirecting to:', redirectUrl)
        
        // Pequeno delay para garantir que cookies sejam definidos
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Recarregar a página completamente (como em /test-auth)
        window.location.href = redirectUrl
      } else {
        setError(t('login.loginError'))
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login failed:', err)
      setError(t('login.unexpectedError'))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-pattern relative overflow-hidden">
      {/* Gradiente de fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-600/50 via-navy-700/50 to-navy-900/50" />
      

      <div className="relative min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          {/* Language Selector - Above Login Card */}
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
              <div className="text-center mb-4">
                <div className="flex justify-center mb-2">
                  <Logo width={180} height={80} className="transform hover:scale-110 transition-transform duration-300" />
                </div>
                <p className="text-gold-200 text-base">{t('login.systemTitle')}</p>
                <p className="text-gold-300 text-sm mt-1">{t('login.systemSubtitle')}</p>
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

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-base text-red-400">{error}</p>
                </div>
              )}

              {/* Botões centralizados */}
              <div className="mt-6 space-y-4">
                {/* Botão Ver Cursos Disponíveis - Centralizado */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => router.push('/browse-courses')}
                    icon={<BookOpen className="w-4 h-4" />}
                    iconPosition="left"
                    className="text-gold-300 border-gold-500/30 hover:border-gold-400 hover:bg-gold-500/10"
                  >
                    Ver Cursos Disponíveis
                  </Button>
                </div>

                {/* Seção Fale Conosco com texto */}
                <div className="text-center space-y-2">
                  <p className="text-gold-300/80 text-sm">Interessado em algum curso?</p>
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setContactModalOpen(true)}
                      icon={<MessageCircle className="w-4 h-4" />}
                      iconPosition="left"
                      className="text-gold-300/80 hover:text-gold-200 hover:bg-gold-500/10"
                    >
                      Fale Conosco
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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