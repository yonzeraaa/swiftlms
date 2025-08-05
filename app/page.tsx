'use client'

import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Loader2, AlertCircle, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Logo from './components/Logo'
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
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError(t('login.invalidCredentials'))
        } else if (error.message.includes('Email not confirmed')) {
          setError(t('login.confirmEmail'))
        } else {
          setError(t('login.loginError'))
        }
        console.error('Login error:', error)
        return
      }

      if (data.user) {
        // Check user role to redirect to appropriate dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        
        if (profile?.role === 'student') {
          router.push('/student-dashboard')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      setError(t('login.unexpectedError'))
      console.error('Unexpected error:', err)
    } finally {
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
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <Logo className="transform hover:scale-110 transition-transform duration-300" />
                </div>
                <h1 className="text-5xl font-bold text-gold mb-2 tracking-wide">SwiftEDU</h1>
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

                {/* Checkbox Lembrar-me */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 bg-navy-900/50 border-navy-600 rounded text-gold-500 focus:ring-gold-500 focus:ring-2 cursor-pointer"
                    disabled={isLoading}
                    aria-label={t('login.rememberAriaLabel')}
                  />
                  <label htmlFor="remember" className="ml-2 text-base text-gold-200 cursor-pointer select-none">
                    {t('login.rememberMe')}
                  </label>
                </div>

                {/* Botão de Login */}
                <button
                  type="submit"
                  className="relative w-full py-3 px-4 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-navy-900 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-navy-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group overflow-hidden"
                  disabled={isLoading}
                  aria-label={t('login.loginAriaLabel')}
                >
                  <span className={`flex items-center justify-center gap-2 transition-all duration-300 ${isLoading ? 'opacity-0' : ''}`}>
                    {t('login.enter')}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </button>
              </form>

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-base text-red-400">{error}</p>
                </div>
              )}

              {/* Mensagem de contato */}
              <p className="mt-6 text-center text-base text-gold-200">
                {t('login.contactAdmin')}
              </p>

              {/* Indicador de segurança */}
              <div className="mt-6 flex items-center justify-center gap-2 text-gold-300/60">
                <Shield className="w-4 h-4" />
                <span className="text-sm">{t('login.secureConnection')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}