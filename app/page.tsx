'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Mail, Lock, ChevronRight, Check, Globe, BookOpen, HelpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Playfair_Display, Inter } from 'next/font/google'
import Logo from './components/Logo'
import Button from './components/Button'
import ContactModal from './components/ContactModal'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import { useTranslation } from './contexts/LanguageContext'
import type { Language } from './contexts/LanguageContext'
import { checkAuthStatus } from '@/lib/actions/browse-enroll'

// Fontes para o tema Vintage/Elegante
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export default function LoginPage() {
  const { t, language, setLanguage } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false)
  const router = useRouter()

  const [currentQuote, setCurrentQuote] = useState(0)

  const quotes = [
    { text: "A educação é a arma mais poderosa que você pode usar para mudar o mundo.", author: "Nelson Mandela" },
    { text: "Liderança e aprendizado são indispensáveis um ao outro.", author: "John F. Kennedy" },
    { text: "Investir em conhecimento rende sempre os melhores juros.", author: "Benjamin Franklin" },
    { text: "A única coisa que interfere com meu aprendizado é a minha educação.", author: "Albert Einstein" }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await checkAuthStatus()

      if (authStatus.isAuthenticated) {
        const redirectUrl = authStatus.role === 'student' ? '/student-dashboard' : '/dashboard'
        router.push(redirectUrl)
      } else {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('forgot-password') === 'true') {
          setForgotPasswordModalOpen(true)
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) setError('Muitas tentativas. Tente novamente mais tarde.')
        else if (response.status === 401) setError('Credenciais inválidas.')
        else if (response.status === 403) setError('Acesso bloqueado.')
        else setError(data.error || 'Erro ao realizar login.')
        setIsLoading(false)
        return
      }

      if (data.success) {
        setSuccess(true)
        const { SessionManager } = await import('@/lib/auth/session-manager')
        const sessionManager = SessionManager.getInstance()
        sessionManager.startSession()
        await new Promise(resolve => setTimeout(resolve, 500))
        window.location.href = data.redirectUrl
      } else {
        setError('Erro desconhecido ao processar login.')
        setIsLoading(false)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado. Verifique sua conexão.')
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center bg-[#0F1115] relative overflow-hidden ${inter.className}`}>

      {/* Background: Abstract Library / Knowledge Network */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F1115] via-[#1A1D23] to-[#0F1115] opacity-95" />

      {/* Decorative Elements: The "Golden Ratio" Circles - Animated */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] border border-[#D4AF37]/5 rounded-full pointer-events-none"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-15%] right-[-5%] w-[800px] h-[800px] border border-[#D4AF37]/5 rounded-full pointer-events-none"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] border border-[#D4AF37]/5 rounded-full pointer-events-none"
      />

      <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-12 gap-12 p-6 lg:p-12 relative z-10 h-full items-center">

        {/* Left Side: The "Manifesto" */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-16 pr-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="inline-flex items-center gap-3 mb-8 px-4 py-1.5 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5 backdrop-blur-sm"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
              <span className="text-[#D4AF37] text-xs uppercase tracking-[0.2em] font-bold">SwiftEDU</span>
            </motion.div>

            <h1 className={`${playfair.className} text-6xl xl:text-7xl leading-[1.1] font-medium mb-8 text-white`}>
              Onde o <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F4D03F]">Conhecimento</span> <br />
              Encontra seu <br />
              <span className="italic font-light opacity-80">Propósito.</span>
            </h1>

            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="text-gray-400 text-lg leading-relaxed max-w-xl font-light border-l-2 border-[#D4AF37]/20 pl-8"
            >
              Uma experiência de aprendizado imersiva e atemporal.
              Gerencie cursos, desenvolva talentos e cultive a sabedoria em um ambiente desenhado para a excelência.
            </motion.p>
          </motion.div>

          <div className="relative h-48">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuote}
                initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute top-0 left-0 max-w-lg"
              >
                <div className="text-[#D4AF37]/20 text-6xl font-serif absolute -top-6 -left-4">"</div>
                <p className={`${playfair.className} text-2xl text-white/90 italic mb-4 leading-relaxed relative z-10`}>
                  {quotes[currentQuote].text}
                </p>
                <div className="flex items-center gap-3 pl-1">
                  <div className="h-[1px] w-12 bg-[#D4AF37]/30" />
                  <span className="text-[#D4AF37] text-sm uppercase tracking-widest font-bold opacity-90">
                    {quotes[currentQuote].author}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: The "Access Card" */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
        >
          <div className="relative group perspective-1000">
            {/* Vintage Book Binding Effect */}
            <motion.div
              initial={{ rotateY: -15, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="absolute -left-3 top-2 bottom-2 w-4 bg-[#1a150d] rounded-l-sm shadow-2xl z-0 hidden lg:block border-l border-white/5 origin-right"
            />

            <div className="relative bg-[#14161B] border border-[#D4AF37]/10 p-8 sm:p-12 shadow-2xl z-10 transform transition-transform duration-500 group-hover:translate-y-[-2px]">
              {/* Decorative Frame */}
              <div className="absolute inset-2 border border-[#D4AF37]/5 pointer-events-none" />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-[0.03] pointer-events-none" />

              <div className="text-center mb-10 relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="-mb-60 relative z-10 flex flex-col items-center justify-center"
                >
                  <Logo width={440} height={440} className="text-white opacity-90 drop-shadow-[0_0_15px_rgba(212,175,55,0.15)]" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <p className="text-[#D4AF37] text-[10px] uppercase tracking-[0.4em] font-medium mb-2 border-b border-[#D4AF37]/20 pb-2 inline-block">Portal do Aluno</p>
                </motion.div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                    className="group/input"
                  >
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 group-focus-within/input:text-[#D4AF37] transition-colors">
                      Endereço de Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#0F1115] border border-gray-800 text-white py-3.5 px-4 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all duration-300 placeholder-gray-700 font-light"
                        placeholder="exemplo@dominio.com"
                        required
                      />
                      <div className="absolute inset-0 border border-[#D4AF37]/0 pointer-events-none transition-all duration-500 group-hover/input:border-[#D4AF37]/10" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 }}
                    className="group/input"
                  >
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 group-focus-within/input:text-[#D4AF37] transition-colors">
                      Senha Pessoal
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#0F1115] border border-gray-800 text-white py-3.5 px-4 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all duration-300 placeholder-gray-700 font-light"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="flex items-center justify-between text-xs"
                >
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <div className={`w-4 h-4 border ${rememberMe ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-700'} flex items-center justify-center transition-all duration-300`}>
                      {rememberMe && <Check size={12} className="text-[#0F1115]" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="text-gray-500 group-hover:text-gray-400 transition-colors font-light">Memorizar acesso</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordModalOpen(true)}
                    className="text-gray-500 hover:text-[#D4AF37] transition-colors font-light italic"
                  >
                    Esqueci minha senha
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <Button
                    type="submit"
                    loading={isLoading}
                    disabled={isLoading}
                    className={`w-full !rounded-sm !h-14 !text-sm !tracking-[0.2em] relative overflow-hidden group/btn border border-[#D4AF37] !bg-transparent hover:!bg-[#D4AF37] transition-all duration-500 ${playfair.className}`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3 text-[#D4AF37] group-hover/btn:text-[#0F1115] transition-colors duration-500 font-medium italic">
                      Iniciar Sessão
                    </span>
                  </Button>
                </motion.div>
              </form>

              {/* Feedback Messages */}
              <div className="mt-8 min-h-[24px]">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-400 text-xs text-center border-l-2 border-red-500 pl-3 py-1"
                    >
                      {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[#D4AF37] text-xs text-center border-l-2 border-[#D4AF37] pl-3 py-1"
                    >
                      Bem-vindo de volta.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="mt-10 pt-6 border-t border-gray-800/50 flex items-center justify-center gap-6 text-[10px] text-gray-600 uppercase tracking-widest"
              >
                <button onClick={() => setContactModalOpen(true)} className="hover:text-[#D4AF37] transition-colors duration-300">
                  Ajuda
                </button>
                <span className="text-gray-800">/</span>
                <button
                  onClick={() => router.push('/browse-courses')}
                  className="hover:text-[#D4AF37] transition-colors duration-300"
                >
                  Catálogo
                </button>
                <span className="text-gray-800">/</span>
                <div className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors duration-300 cursor-pointer">
                  <Globe size={10} />
                  <span>PT</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
      <ForgotPasswordModal
        isOpen={forgotPasswordModalOpen}
        onClose={() => setForgotPasswordModalOpen(false)}
      />
    </div>
  )
}
