'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Check, Globe, ChevronRight, User, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Cinzel, Montserrat, Cormorant_Garamond } from 'next/font/google'
import Logo from './components/Logo'
import Button from './components/Button'
import ContactModal from './components/ContactModal'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import { useTranslation } from './contexts/LanguageContext'
import { checkAuthStatus } from '@/lib/actions/browse-enroll'

// --- Art Deco / Architectural Typography ---
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cinzel',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
})

// --- Custom Art Deco Geometric Elements ---

function DecoSunburst({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="deco-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B07D62" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#B07D62" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[...Array(24)].map((_, i) => (
        <line 
          key={i}
          x1="500" y1="500" 
          x2={500 + Math.cos((i * 15) * Math.PI / 180) * 800} 
          y2={500 + Math.sin((i * 15) * Math.PI / 180) * 800} 
          stroke="url(#deco-grad)" 
          strokeWidth="1" 
        />
      ))}
      <circle cx="500" cy="500" r="150" stroke="#B07D62" strokeWidth="0.5" strokeOpacity="0.3" />
      <circle cx="500" cy="500" r="200" stroke="#B07D62" strokeWidth="0.5" strokeOpacity="0.1" />
    </svg>
  )
}

function SteppedFrame({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 600" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 0 H360 V560 H40 V0Z" stroke="#B07D62" strokeWidth="1" strokeOpacity="0.4" />
      <path d="M20 20 H380 V580 H20 V20Z" stroke="#B07D62" strokeWidth="0.5" strokeOpacity="0.2" />
      {/* Corner Accents */}
      <path d="M0 60 V0 H60" stroke="#B07D62" strokeWidth="2" />
      <path d="M340 0 H400 V60" stroke="#B07D62" strokeWidth="2" />
      <path d="M400 540 V600 H340" stroke="#B07D62" strokeWidth="2" />
      <path d="M60 600 H0 V540" stroke="#B07D62" strokeWidth="2" />
    </svg>
  )
}

export default function LoginPage() {
  const { t } = useTranslation()
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
    }, 6000)
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
        await new Promise(resolve => setTimeout(resolve, 800))
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

  // --- Palette: Midnight Obsidian & Brushed Copper ---
  const obsidian = '#05080D'
  const twilight = '#1B263B'
  const copper = '#B07D62'
  const textWhite = '#E0E1DD'

  return (
    <div className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#05080D] text-[#E0E1DD] ${cinzel.variable} ${montserrat.variable} ${cormorant.variable}`}>
      
      {/* Dynamic Geometric Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <DecoSunburst className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#05080D]/80 to-[#05080D]" />
        
        {/* Animated Vertical Beams */}
        <motion.div 
          animate={{ x: ['100%', '-100%'] }} 
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#B07D62]/20 to-transparent" 
          style={{ left: '20%' }}
        />
        <motion.div 
          animate={{ x: ['-100%', '100%'] }} 
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#B07D62]/20 to-transparent" 
          style={{ right: '30%' }}
        />
      </div>

      <div className="w-full max-w-[1400px] h-screen lg:h-auto flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 px-8 z-10">
        
        {/* LEFT: The Monumental Brand Panel */}
        <div className="hidden lg:flex flex-col justify-center max-w-xl">
           <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1.2 }}
           >
             <div className="flex items-center gap-6 mb-12">
               <div className="h-[1px] w-24 bg-[#B07D62]" />
               <span className="font-montserrat text-xs tracking-[0.5em] text-[#B07D62] font-bold uppercase">ESTD. MCMXXV</span>
             </div>

             <h1 className="font-cinzel text-7xl xl:text-8xl leading-none font-black mb-8">
               SWIFT<br />
               <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#B07D62] to-[#415A77]">EDU</span>
             </h1>

             <p className="font-cormorant text-3xl leading-relaxed italic opacity-70 mb-16 border-l border-[#B07D62]/30 pl-8">
               "Onde o Conhecimento Encontra seu Propósito."
             </p>

             {/* Quote Scroller */}
             <div className="relative h-24 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuote}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.8 }}
                  >
                    <p className="font-cinzel text-lg tracking-wide text-[#E0E1DD]/80">
                      &ldquo;{quotes[currentQuote].text}&rdquo;
                    </p>
                    <p className="font-montserrat text-[10px] tracking-[0.4em] text-[#B07D62] uppercase mt-4 font-bold">
                      — {quotes[currentQuote].author}
                    </p>
                  </motion.div>
                </AnimatePresence>
             </div>
           </motion.div>
        </div>

        {/* RIGHT: The Modernist Interface */}
        <div className="w-full max-w-md relative group">
          {/* Framed Container */}
          <SteppedFrame className="absolute -inset-10 text-[#B07D62] pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity duration-700" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="relative bg-[#0D1B2A]/40 backdrop-blur-2xl p-10 lg:p-14 border border-white/5 shadow-2xl"
          >
            <div className="flex flex-col items-center mb-12">
               <div className="mb-6 relative">
                 <Logo width={80} height={80} className="grayscale brightness-200 contrast-150" />
                 <div className="absolute inset-0 bg-[#B07D62]/10 blur-xl rounded-full" />
               </div>
               <h2 className="font-cinzel text-2xl tracking-[0.3em] text-[#E0E1DD] uppercase text-center border-b-2 border-[#B07D62] pb-4 px-6">
                 Portal do Aluno
               </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              
              {/* Geometric Input 1 */}
              <div className="relative">
                <label className="block font-montserrat text-[10px] tracking-[0.3em] font-bold text-[#B07D62] uppercase mb-3">
                  Endereço de Email
                </label>
                <div className="relative">
                   <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="exemplo@dominio.com"
                    className="w-full bg-[#1B263B]/20 border border-white/10 px-4 py-4 font-montserrat text-sm text-[#E0E1DD] placeholder-[#E0E1DD]/20 focus:outline-none focus:border-[#B07D62] focus:bg-[#1B263B]/40 transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                    <User size={18} />
                  </div>
                </div>
              </div>

              {/* Geometric Input 2 */}
              <div className="relative">
                <label className="block font-montserrat text-[10px] tracking-[0.3em] font-bold text-[#B07D62] uppercase mb-3">
                  Senha Pessoal
                </label>
                <div className="relative">
                   <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#1B263B]/20 border border-white/10 px-4 py-4 font-montserrat text-sm text-[#E0E1DD] placeholder-[#E0E1DD]/20 focus:outline-none focus:border-[#B07D62] focus:bg-[#1B263B]/40 transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                    <ShieldCheck size={18} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-montserrat tracking-[0.2em] text-[#B07D62] pt-2 uppercase font-bold">
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-[#E0E1DD] transition-colors group">
                  <div className={`w-4 h-4 border border-[#B07D62] flex items-center justify-center transition-all group-hover:border-[#E0E1DD] flex-shrink-0 ${rememberMe ? 'bg-[#B07D62]' : ''}`}>
                    {rememberMe && <Check size={10} className="text-[#05080D]" />}
                  </div>
                  <span className="inline-block translate-y-[1px]">Lembrar acesso</span>
                  <input type="checkbox" className="hidden" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                </label>
                
                <button 
                  type="button" 
                  onClick={() => setForgotPasswordModalOpen(true)} 
                  className="hover:text-[#E0E1DD] transition-colors inline-block translate-y-[1px] p-0 border-none bg-transparent"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button 
                type="submit" 
                loading={isLoading}
                disabled={isLoading}
                className="w-full !bg-transparent !border-2 !border-[#B07D62] !text-[#B07D62] !h-16 hover:!bg-[#B07D62] hover:!text-[#05080D] font-cinzel text-sm tracking-[0.4em] font-bold uppercase transition-all duration-500 relative group overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Iniciar Sessão
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
                {/* Internal slide effect */}
                <div className="absolute inset-0 bg-[#B07D62] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-0" />
              </Button>

              <div className="min-h-[24px]">
                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center text-[11px] text-red-500 font-montserrat tracking-widest font-bold uppercase">
                      {error}
                    </motion.p>
                  )}
                  {success && (
                    <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-center text-[11px] text-[#B07D62] font-montserrat tracking-widest font-bold uppercase">
                      Bienvenue
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </form>

            <div className="mt-16 flex justify-center gap-10 text-[10px] font-montserrat tracking-[0.3em] text-[#B07D62] uppercase font-bold">
              <button onClick={() => setContactModalOpen(true)} className="hover:text-[#E0E1DD] transition-colors">Ajuda</button>
              <button onClick={() => router.push('/browse-courses')} className="hover:text-[#E0E1DD] transition-colors">Catálogo</button>
              <div className="flex items-center gap-2 cursor-pointer hover:text-[#E0E1DD]">
                <Globe size={10} /> <span>PT-BR</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
      <ForgotPasswordModal isOpen={forgotPasswordModalOpen} onClose={() => setForgotPasswordModalOpen(false)} />
    </div>
  )
}