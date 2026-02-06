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

// Ornamento SVG de filigrana para o topo do lado esquerdo
function FloralOrnament({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M200 40 C200 40 220 10 250 10 C280 10 290 30 280 40 C270 50 250 45 250 40 C250 35 260 25 270 30"
        stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none"
      />
      <path
        d="M200 40 C200 40 180 10 150 10 C120 10 110 30 120 40 C130 50 150 45 150 40 C150 35 140 25 130 30"
        stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none"
      />
      <path
        d="M200 40 C200 40 230 60 260 55 C290 50 295 35 285 30 C275 25 260 35 260 40"
        stroke="currentColor" strokeWidth="0.8" opacity="0.4" fill="none"
      />
      <path
        d="M200 40 C200 40 170 60 140 55 C110 50 105 35 115 30 C125 25 140 35 140 40"
        stroke="currentColor" strokeWidth="0.8" opacity="0.4" fill="none"
      />
      <circle cx="200" cy="40" r="3" fill="currentColor" opacity="0.8" />
      <circle cx="200" cy="40" r="6" stroke="currentColor" strokeWidth="0.5" opacity="0.4" fill="none" />
      {/* Folhas laterais */}
      <path d="M160 40 C160 30 170 20 180 25 C175 30 165 35 160 40Z" fill="currentColor" opacity="0.15" />
      <path d="M240 40 C240 30 230 20 220 25 C225 30 235 35 240 40Z" fill="currentColor" opacity="0.15" />
      {/* Extensões horizontais */}
      <line x1="80" y1="40" x2="140" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="260" y1="40" x2="320" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <circle cx="80" cy="40" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="320" cy="40" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

// Ornamento de canto (flourish)
function CornerFlourish({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 5 C5 5 15 5 25 15 C35 25 30 40 20 35 C10 30 15 20 25 15"
        stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none"
      />
      <path
        d="M5 5 C5 5 5 15 15 25 C25 35 40 30 35 20 C30 10 20 15 15 25"
        stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none"
      />
      <path
        d="M25 15 C30 18 35 25 30 30 C25 35 18 30 20 25"
        stroke="currentColor" strokeWidth="0.8" opacity="0.3" fill="none"
      />
      <circle cx="5" cy="5" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

// Divider ornamental
function OrnamentalDivider({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 20" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="10" x2="120" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="180" y1="10" x2="300" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <path
        d="M130 10 C135 5 140 3 150 3 C160 3 165 5 170 10 C165 15 160 17 150 17 C140 17 135 15 130 10Z"
        stroke="currentColor" strokeWidth="0.8" opacity="0.5" fill="currentColor" fillOpacity="0.1"
      />
      <circle cx="150" cy="10" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

// Fleur-de-lis watermark
function FleurDeLis({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M50 10 C50 10 55 20 55 35 C55 45 52 50 50 55 C48 50 45 45 45 35 C45 20 50 10 50 10Z"
        opacity="0.6"
      />
      <path
        d="M50 55 C50 55 30 35 20 35 C15 35 12 40 15 45 C18 50 30 50 40 48 C45 47 48 50 50 55Z"
        opacity="0.5"
      />
      <path
        d="M50 55 C50 55 70 35 80 35 C85 35 88 40 85 45 C82 50 70 50 60 48 C55 47 52 50 50 55Z"
        opacity="0.5"
      />
      <path
        d="M50 55 C48 60 45 70 45 80 L50 85 L55 80 C55 70 52 60 50 55Z"
        opacity="0.4"
      />
      <ellipse cx="50" cy="90" rx="12" ry="4" opacity="0.3" />
    </svg>
  )
}

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
    { text: "A aprendizagem é o único tesouro que acompanha seu dono em toda parte.", author: "Leonardo da Vinci" },
    { text: "Meça o que é mensurável e torne mensurável o que não o é.", author: "Galileu Galilei" },
    { text: "Toda a nossa dignidade consiste no pensamento. É dele que devemos nos elevar.", author: "Nicolau Maquiavel" },
    { text: "O maior perigo para a maioria de nós não é que nossa meta seja alta demais e não a alcancemos, mas que seja baixa demais e a alcancemos.", author: "Michelangelo" }
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
    <div className={`h-screen max-h-screen w-full flex items-center justify-center relative overflow-hidden ${inter.className}`}
      style={{ background: 'linear-gradient(145deg, #0a0806 0%, #1a1410 40%, #0f0b08 100%)' }}
    >
      {/* CSS para animações de partículas de poeira dourada e glow dos inputs */}
      <style jsx global>{`
        @keyframes dust-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0; }
          10% { opacity: 0.8; }
          50% { transform: translate(80px, -120px) scale(0.6); opacity: 0.4; }
          90% { opacity: 0; }
        }
        @keyframes dust-float-2 {
          0%, 100% { transform: translate(0, 0) scale(0.8); opacity: 0; }
          15% { opacity: 0.6; }
          60% { transform: translate(-60px, -100px) scale(0.4); opacity: 0.3; }
          95% { opacity: 0; }
        }
        @keyframes dust-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1.2); opacity: 0; }
          20% { opacity: 0.7; }
          70% { transform: translate(100px, -80px) scale(0.5); opacity: 0.2; }
          90% { opacity: 0; }
        }
        @keyframes dust-float-4 {
          0%, 100% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          5% { opacity: 0.9; }
          55% { transform: translate(-40px, -140px) scale(0.3); opacity: 0.3; }
          85% { opacity: 0; }
        }
        @keyframes dust-float-5 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0; }
          12% { opacity: 0.5; }
          65% { transform: translate(50px, -110px) scale(0.4); opacity: 0.2; }
          92% { opacity: 0; }
        }
        .renaissance-input:focus {
          border-bottom-color: #c9a84c !important;
          box-shadow: 0 2px 8px rgba(201, 168, 76, 0.15);
        }
        .renaissance-input::placeholder {
          color: #5a4f3c;
          font-style: italic;
        }
      `}</style>

      {/* Textura de fundo sutil — gradiente que simula pergaminho escuro */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(139,115,85,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(107,29,29,0.04) 0%, transparent 50%)'
        }}
      />

      {/* Moldura decorativa na borda da viewport */}
      <div className="absolute inset-3 border pointer-events-none" style={{ borderColor: 'rgba(201,168,76,0.08)' }} />
      <div className="absolute inset-5 border pointer-events-none" style={{ borderColor: 'rgba(201,168,76,0.04)' }} />

      {/* Ornamentos de canto */}
      <CornerFlourish className="absolute top-4 left-4 w-16 h-16 text-[#c9a84c] opacity-40 pointer-events-none" />
      <CornerFlourish className="absolute top-4 right-4 w-16 h-16 text-[#c9a84c] opacity-40 pointer-events-none -scale-x-100" />
      <CornerFlourish className="absolute bottom-4 left-4 w-16 h-16 text-[#c9a84c] opacity-40 pointer-events-none -scale-y-100" />
      <CornerFlourish className="absolute bottom-4 right-4 w-16 h-16 text-[#c9a84c] opacity-40 pointer-events-none -scale-x-100 -scale-y-100" />

      {/* Partículas de poeira dourada */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-1 h-1 rounded-full bg-[#c9a84c]" style={{ top: '20%', left: '15%', animation: 'dust-float-1 8s ease-in-out infinite' }} />
        <div className="absolute w-0.5 h-0.5 rounded-full bg-[#c9a84c]" style={{ top: '60%', left: '25%', animation: 'dust-float-2 10s ease-in-out infinite 1s' }} />
        <div className="absolute w-1 h-1 rounded-full bg-[#c9a84c]" style={{ top: '40%', left: '70%', animation: 'dust-float-3 12s ease-in-out infinite 2s' }} />
        <div className="absolute w-0.5 h-0.5 rounded-full bg-[#c9a84c]" style={{ top: '75%', left: '80%', animation: 'dust-float-4 9s ease-in-out infinite 0.5s' }} />
        <div className="absolute w-1 h-1 rounded-full bg-[#c9a84c]" style={{ top: '30%', left: '50%', animation: 'dust-float-5 11s ease-in-out infinite 3s' }} />
        <div className="absolute w-0.5 h-0.5 rounded-full bg-[#c9a84c]" style={{ top: '85%', left: '40%', animation: 'dust-float-1 13s ease-in-out infinite 4s' }} />
        <div className="absolute w-1 h-1 rounded-full bg-[#c9a84c]" style={{ top: '10%', left: '60%', animation: 'dust-float-2 7s ease-in-out infinite 2.5s' }} />
        <div className="absolute w-0.5 h-0.5 rounded-full bg-[#c9a84c]" style={{ top: '50%', left: '90%', animation: 'dust-float-4 14s ease-in-out infinite 1.5s' }} />
      </div>

      {/* Fleur-de-lis watermark central */}
      <FleurDeLis className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-72 text-[#c9a84c] opacity-[0.03] pointer-events-none" />

      <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 lg:px-12 lg:py-4 relative z-10 items-center">

        {/* Lado Esquerdo — "O Manuscrito Iluminado" */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-6 pr-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Ornamento floral no topo */}
            <FloralOrnament className="w-56 text-[#c9a84c] mb-4" />

            {/* Badge estilo selo de cera */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="inline-flex items-center gap-3 mb-4 px-5 py-1.5 border border-[#c9a84c]/20 backdrop-blur-sm"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(107,29,29,0.3) 0%, rgba(107,29,29,0.1) 70%, transparent 100%)',
                borderRadius: '50px',
              }}
            >
              <div className="w-2 h-2 rounded-full bg-[#c9a84c]" style={{ boxShadow: '0 0 6px rgba(201,168,76,0.5)' }} />
              <span className="text-[#c9a84c] text-xs tracking-[0.3em] font-bold" style={{ fontVariant: 'small-caps' }}>SwiftEDU</span>
              <div className="w-2 h-2 rounded-full bg-[#c9a84c]" style={{ boxShadow: '0 0 6px rgba(201,168,76,0.5)' }} />
            </motion.div>

            {/* Titulo com capitular ornamentada */}
            <h1 className={`${playfair.className} text-5xl xl:text-6xl leading-[1.15] font-medium mb-4`} style={{ color: '#e8dcc8' }}>
              Onde o{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] to-[#d4b85a]">
                Conhecimento
              </span> <br />
              Encontra seu{' '}
              <span className={`${playfair.className} italic font-light`} style={{ color: '#8b7355' }}>
                Propósito.
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="text-base leading-relaxed max-w-lg font-light pl-6"
              style={{
                color: '#8b7355',
                borderLeft: '2px solid rgba(201,168,76,0.25)',
              }}
            >
              Cultive a sabedoria em um ambiente desenhado para a excelência.
              Gerencie cursos, desenvolva talentos e alcance seu propósito.
            </motion.p>
          </motion.div>

          {/* Divider ornamental */}
          <OrnamentalDivider className="w-64 text-[#c9a84c]" />

          {/* Citações renascentistas */}
          <div className="relative h-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuote}
                initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute top-0 left-0 max-w-md"
              >
                <div className={`${playfair.className} text-5xl absolute -top-5 -left-3`} style={{ color: 'rgba(201,168,76,0.15)' }}>&ldquo;</div>
                <p className={`${playfair.className} text-lg italic mb-3 leading-snug relative z-10`} style={{ color: 'rgba(232,220,200,0.85)' }}>
                  {quotes[currentQuote].text}
                </p>
                <div className="flex items-center gap-3 pl-1">
                  <div className="h-[1px] w-12" style={{ background: 'rgba(201,168,76,0.3)' }} />
                  <span className="text-sm font-bold opacity-90 tracking-[0.15em]" style={{ color: '#c9a84c', fontVariant: 'small-caps' }}>
                    {quotes[currentQuote].author}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Lado Direito — "O Decreto Real" (formulário de login) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
        >
          <div className="relative group">
            {/* Moldura externa — quadro renascentista */}
            <div className="absolute -inset-1 pointer-events-none" style={{
              border: '1px solid rgba(201,168,76,0.12)',
            }} />

            {/* Card principal com textura de pergaminho */}
            <div className="relative p-6 sm:p-8 shadow-2xl z-10"
              style={{
                background: 'linear-gradient(170deg, #1a1410 0%, #15110c 50%, #1a1410 100%)',
                border: '1px solid rgba(201,168,76,0.15)',
              }}
            >
              {/* Moldura interna decorativa */}
              <div className="absolute inset-3 pointer-events-none" style={{ border: '1px solid rgba(201,168,76,0.07)' }} />

              {/* Textura de pergaminho (CSS gradient) */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(201,168,76,0.15) 28px, rgba(201,168,76,0.15) 29px)'
                }}
              />

              {/* Flourishes nos cantos do card */}
              <CornerFlourish className="absolute top-1 left-1 w-10 h-10 text-[#c9a84c] opacity-30" />
              <CornerFlourish className="absolute top-1 right-1 w-10 h-10 text-[#c9a84c] opacity-30 -scale-x-100" />
              <CornerFlourish className="absolute bottom-1 left-1 w-10 h-10 text-[#c9a84c] opacity-30 -scale-y-100" />
              <CornerFlourish className="absolute bottom-1 right-1 w-10 h-10 text-[#c9a84c] opacity-30 -scale-x-100 -scale-y-100" />

              <div className="text-center mb-6 relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="-mb-32 relative z-10 flex flex-col items-center justify-center"
                >
                  <Logo width={260} height={260} className="text-white opacity-90 drop-shadow-[0_0_15px_rgba(201,168,76,0.15)]" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <OrnamentalDivider className="w-48 mx-auto text-[#c9a84c] mb-3" />
                  <p className="text-sm tracking-[0.4em] font-medium mb-2 inline-block"
                    style={{ color: '#c9a84c', fontVariant: 'small-caps', letterSpacing: '0.4em' }}
                  >
                    Portal do Aluno
                  </p>
                </motion.div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                    className="group/input"
                  >
                    <label className="block text-sm mb-2 transition-colors group-focus-within/input:text-[#c9a84c]"
                      style={{ fontVariant: 'small-caps', letterSpacing: '0.2em', color: '#8b7355' }}
                    >
                      Endereço de Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="renaissance-input w-full bg-transparent border-0 border-b py-2.5 px-1 text-lg outline-none transition-all duration-300 font-light"
                        style={{
                          borderBottomWidth: '1px',
                          borderBottomColor: 'rgba(139,115,85,0.3)',
                          color: '#e8dcc8',
                        }}
                        placeholder="exemplo@dominio.com"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 }}
                    className="group/input"
                  >
                    <label className="block text-sm mb-2 transition-colors group-focus-within/input:text-[#c9a84c]"
                      style={{ fontVariant: 'small-caps', letterSpacing: '0.2em', color: '#8b7355' }}
                    >
                      Senha Pessoal
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="renaissance-input w-full bg-transparent border-0 border-b py-2.5 px-1 text-lg outline-none transition-all duration-300 font-light"
                        style={{
                          borderBottomWidth: '1px',
                          borderBottomColor: 'rgba(139,115,85,0.3)',
                          color: '#e8dcc8',
                        }}
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
                  className="flex items-center justify-between text-base"
                >
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <div className="w-4 h-4 flex items-center justify-center transition-all duration-300"
                      style={{
                        border: `1px solid ${rememberMe ? '#c9a84c' : 'rgba(139,115,85,0.4)'}`,
                        backgroundColor: rememberMe ? '#c9a84c' : 'transparent',
                      }}
                    >
                      {rememberMe && <Check size={12} style={{ color: '#0a0806' }} />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="font-light transition-colors group-hover:text-[#8b7355]" style={{ color: '#6b5d4a' }}>
                      Memorizar acesso
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordModalOpen(true)}
                    className={`${playfair.className} italic font-light transition-colors hover:text-[#c9a84c]`}
                    style={{ color: '#6b5d4a' }}
                  >
                    Esqueci minha senha
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="relative"
                >
                  {/* Ornamento floral ao redor do botão */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 text-[#c9a84c] opacity-30">
                    <svg viewBox="0 0 12 40" fill="none">
                      <path d="M6 0 C6 10 0 15 0 20 C0 25 6 30 6 40" stroke="currentColor" strokeWidth="0.5" />
                    </svg>
                  </div>
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 text-[#c9a84c] opacity-30">
                    <svg viewBox="0 0 12 40" fill="none">
                      <path d="M6 0 C6 10 12 15 12 20 C12 25 6 30 6 40" stroke="currentColor" strokeWidth="0.5" />
                    </svg>
                  </div>
                  <Button
                    type="submit"
                    loading={isLoading}
                    disabled={isLoading}
                    className={`w-full !rounded-none !h-14 !text-lg !tracking-[0.2em] relative overflow-hidden group/btn !bg-transparent hover:!bg-[#c9a84c] transition-all duration-500 ${playfair.className}`}
                    style={{
                      border: '1px solid rgba(201,168,76,0.5)',
                    } as React.CSSProperties}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3 text-[#c9a84c] group-hover/btn:text-[#0a0806] transition-colors duration-500 font-medium italic">
                      Iniciar Sessão
                    </span>
                  </Button>
                </motion.div>
              </form>

              {/* Feedback Messages */}
              <div className="mt-4 min-h-[20px]">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-center py-1"
                      style={{ color: '#c75050', borderLeft: '2px solid #6b1d1d', paddingLeft: '12px' }}
                    >
                      {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-center py-1"
                      style={{ color: '#c9a84c', borderLeft: '2px solid #c9a84c', paddingLeft: '12px' }}
                    >
                      Bem-vindo de volta.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer ornamental */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="mt-5 pt-4 flex flex-col items-center gap-3"
              >
                <OrnamentalDivider className="w-40 text-[#c9a84c] opacity-50" />
                <div className="flex items-center justify-center gap-6 text-base tracking-[0.2em]"
                  style={{ color: '#5a4f3c', fontVariant: 'small-caps' }}
                >
                  <button onClick={() => setContactModalOpen(true)} className="hover:text-[#c9a84c] transition-colors duration-300">
                    Ajuda
                  </button>
                  <span style={{ color: '#3a3226' }}>&bull;</span>
                  <button
                    onClick={() => router.push('/browse-courses')}
                    className="hover:text-[#c9a84c] transition-colors duration-300"
                  >
                    Catálogo
                  </button>
                  <span style={{ color: '#3a3226' }}>&bull;</span>
                  <div className="flex items-center gap-2 hover:text-[#c9a84c] transition-colors duration-300 cursor-pointer">
                    <Globe size={14} />
                    <span>PT</span>
                  </div>
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
