'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Check, Globe, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Playfair_Display, Lora } from 'next/font/google'
import ContactModal from './components/ContactModal'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import { useTranslation } from './contexts/LanguageContext'
import { checkAuthStatus } from '@/lib/actions/browse-enroll'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK    = '#1e130c'   // deep warm brown — primary text
const ACCENT = '#8b6d22'   // antique gold — accent / links / borders
const MUTED  = '#7a6350'   // warm sepia — secondary text
const BORDER = 'rgba(30,19,12,0.14)'

// ─── Swift bird mark — the platform's emblem ──────────────────────────────────
// Stylised swift (Apus apus) in flight: long swept-back wings, forked tail.
function SwiftMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 100"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left wing — primary sickle */}
      <path d="M88,48 C78,37 57,25 14,27 C36,25 66,38 86,48 Z" />
      {/* Left wing — inner shadow for volume */}
      <path d="M88,48 C76,41 55,32 27,35 C46,32 68,41 86,48 Z" opacity="0.38" />

      {/* Right wing — mirror */}
      <path d="M92,48 C102,37 123,25 166,27 C144,25 114,38 94,48 Z" />
      {/* Right wing — inner shadow */}
      <path d="M92,48 C104,41 125,32 153,35 C134,32 112,41 94,48 Z" opacity="0.38" />

      {/* Body */}
      <ellipse cx="90" cy="47" rx="6" ry="3.5" />
      {/* Head */}
      <circle cx="90" cy="43" r="3" />

      {/* Forked tail */}
      <path d="M87,50 C84,59 79,69 73,75"
        stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M93,50 C96,59 101,69 107,75"
        stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// ─── Typographic ornaments ────────────────────────────────────────────────────

// Classic horizontal rule with central diamond
function ClassicRule({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 300 14"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="0"   y1="7" x2="133" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <line x1="167" y1="7" x2="300" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <path d="M150,2 L155,7 L150,12 L145,7 Z" stroke="currentColor" strokeWidth="1.1" opacity="0.5" fill="none" />
      <circle cx="140" cy="7" r="1.3" fill="currentColor" opacity="0.32" />
      <circle cx="160" cy="7" r="1.3" fill="currentColor" opacity="0.32" />
    </svg>
  )
}

// Simple L-shaped bracket — top-left orientation, mirror for other corners
function CornerBracket({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 34" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2,22 L2,2 L22,2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPassword, setShowPassword]           = useState(false)
  const [rememberMe, setRememberMe]               = useState(false)
  const [isLoading, setIsLoading]                 = useState(false)
  const [error, setError]                         = useState<string | null>(null)
  const [success, setSuccess]                     = useState(false)
  const [contactModalOpen, setContactModalOpen]   = useState(false)
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false)
  const router = useRouter()

  const [currentQuote, setCurrentQuote] = useState(0)
  const quotes = [
    { text: "A aprendizagem é o único tesouro que acompanha seu dono em toda parte.", author: "Leonardo da Vinci" },
    { text: "Meça o que é mensurável e torne mensurável o que não o é.", author: "Galileu Galilei" },
    { text: "Toda a nossa dignidade consiste no pensamento. É dele que devemos nos elevar.", author: "Blaise Pascal" },
    { text: "O maior perigo não é que nossa meta seja alta demais — é que seja baixa demais.", author: "Michelangelo" },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % quotes.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await checkAuthStatus()
      if (authStatus.isAuthenticated) {
        router.push(authStatus.role === 'student' ? '/student-dashboard' : '/dashboard')
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
        SessionManager.getInstance().startSession()
        await new Promise(resolve => setTimeout(resolve, 800))
        window.location.href = data.redirectUrl
      } else {
        setError('Erro desconhecido ao processar login.')
        setIsLoading(false)
      }
    } catch {
      setError('Ocorreu um erro inesperado. Verifique sua conexão.')
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen w-full flex items-stretch relative overflow-x-hidden ${playfair.variable} ${lora.variable}`}
      style={{ backgroundColor: '#f0e6d2' }}
    >
      {/* Subtle linen texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' fill='%231e130c'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* ── LEFT PANEL: Brand, description & quotes ───────────────────────── */}
      <motion.div
        className="hidden lg:flex flex-col justify-center items-center gap-10 w-3/5 px-14 xl:px-20 py-16 relative"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        {/* Brand block */}
        <div className="flex flex-col items-center text-center">
          {/* Swift bird mark — centered above brand name */}
          <div className="mb-5" style={{ width: '8.5rem', color: ACCENT }}>
            <SwiftMark />
          </div>

          {/* Brand name */}
          <h1
            style={{
              fontFamily: 'var(--font-playfair)',
              color: INK,
              fontSize: 'clamp(4.5rem, 7vw, 8rem)',
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
            }}
          >
            Swift
          </h1>
          <h1
            className="mb-8"
            style={{
              fontFamily: 'var(--font-playfair)',
              color: ACCENT,
              fontSize: 'clamp(3.5rem, 5.5vw, 6.5rem)',
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
            }}
          >
            Edu.
          </h1>

          <ClassicRule
            className="w-full max-w-xs mb-8"
            style={{ color: INK } as React.CSSProperties}
          />

          {/* Platform description */}
          <p
            className="mb-2 max-w-md"
            style={{
              fontFamily: 'var(--font-lora)',
              color: INK,
              fontSize: '1.2rem',
              lineHeight: 1.75,
            }}
          >
            Sistema completo de gestão educacional — cursos, módulos, avaliações
            e certificados reunidos em uma só plataforma.
          </p>
          <p
            className="max-w-md"
            style={{
              fontFamily: 'var(--font-lora)',
              color: MUTED,
              fontSize: '1.05rem',
              fontStyle: 'italic',
              lineHeight: 1.7,
            }}
          >
            Para instituições de ensino técnico, graduação e formação profissional.
          </p>
        </div>

        {/* Quote carousel */}
        <div className="flex flex-col items-center text-center w-full max-w-md">
          <ClassicRule
            className="w-full max-w-xs mb-6"
            style={{ color: INK } as React.CSSProperties}
          />
          <div className="relative overflow-hidden w-full" style={{ height: '9.5rem' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuote}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.7 }}
              >
                <p
                  className="mb-3"
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: INK,
                    fontSize: '1.15rem',
                    fontStyle: 'italic',
                    lineHeight: 1.7,
                  }}
                >
                  &ldquo;{quotes[currentQuote].text}&rdquo;
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: ACCENT,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                  }}
                >
                  — {quotes[currentQuote].author}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Thin vertical rule between panels (desktop) ───────────────────── */}
      <div
        className="hidden lg:block flex-shrink-0 w-px my-8 self-stretch"
        style={{ backgroundColor: BORDER }}
      />

      {/* ── RIGHT PANEL: Login form ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          className="w-full max-w-[500px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease: 'easeOut' }}
        >
          {/* Card */}
          <div
            className="relative px-8 sm:px-12 py-10 sm:py-12"
            style={{
              backgroundColor: '#faf6ee',
              border: `1px solid ${BORDER}`,
              boxShadow: '0 2px 24px rgba(30,19,12,0.08)',
            }}
          >
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-9 h-9" style={{ color: ACCENT }}>
              <CornerBracket />
            </div>
            <div className="absolute top-0 right-0 w-9 h-9" style={{ color: ACCENT, transform: 'scaleX(-1)' }}>
              <CornerBracket />
            </div>
            <div className="absolute bottom-0 left-0 w-9 h-9" style={{ color: ACCENT, transform: 'scaleY(-1)' }}>
              <CornerBracket />
            </div>
            <div className="absolute bottom-0 right-0 w-9 h-9" style={{ color: ACCENT, transform: 'scale(-1)' }}>
              <CornerBracket />
            </div>

            {/* Bird mark (mobile: visible; desktop: hidden since it's in left panel) */}
            <div className="flex justify-center mb-5 lg:hidden" style={{ color: ACCENT }}>
              <SwiftMark className="w-20" />
            </div>

            {/* Card heading */}
            <div className="text-center mb-1">
              <h2
                style={{
                  fontFamily: 'var(--font-playfair)',
                  color: INK,
                  fontSize: '2.1rem',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                }}
              >
                Portal de Acesso
              </h2>
            </div>

            <ClassicRule
              className="w-full my-6"
              style={{ color: INK } as React.CSSProperties}
            />

            {/* ── Form ────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="space-y-7">

              {/* Email */}
              <div>
                <label
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: MUTED,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '0.6rem',
                  }}
                >
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full bg-transparent px-0 py-3 focus:outline-none transition-colors duration-200 placeholder:italic"
                  style={{
                    fontFamily: 'var(--font-lora)',
                    fontSize: '1.1rem',
                    color: INK,
                    borderBottom: `1px solid rgba(30,19,12,0.25)`,
                    caretColor: ACCENT,
                    WebkitBoxShadow: '0 0 0 1000px #faf6ee inset',
                    WebkitTextFillColor: INK,
                  }}
                  onFocus={e => (e.currentTarget.style.borderBottomColor = ACCENT)}
                  onBlur={e => (e.currentTarget.style.borderBottomColor = 'rgba(30,19,12,0.25)')}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: MUTED,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '0.6rem',
                  }}
                >
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-transparent px-0 py-3 pr-8 focus:outline-none transition-colors duration-200 placeholder:italic"
                    style={{
                      fontFamily: 'var(--font-lora)',
                      fontSize: '1.1rem',
                      color: INK,
                      borderBottom: `1px solid rgba(30,19,12,0.25)`,
                      caretColor: ACCENT,
                      WebkitBoxShadow: '0 0 0 1000px #faf6ee inset',
                      WebkitTextFillColor: INK,
                    }}
                    onFocus={e => (e.currentTarget.style.borderBottomColor = ACCENT)}
                    onBlur={e => (e.currentTarget.style.borderBottomColor = 'rgba(30,19,12,0.25)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80 opacity-60"
                    style={{ color: MUTED }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember / Forgot */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className="w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-colors"
                    style={{
                      borderColor: 'rgba(30,19,12,0.3)',
                      backgroundColor: rememberMe ? ACCENT : 'transparent',
                    }}
                  >
                    {rememberMe && <Check size={8} color="#faf6ee" />}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-lora)',
                      color: MUTED,
                      fontSize: '1rem',
                    }}
                  >
                    Lembrar-me
                  </span>
                  <input type="checkbox" className="hidden" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                </label>

                <button
                  type="button"
                  onClick={() => setForgotPasswordModalOpen(true)}
                  className="transition-colors hover:underline"
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: ACCENT,
                    fontSize: '1rem',
                    fontStyle: 'italic',
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 text-base tracking-widest uppercase transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: 'var(--font-lora)',
                    fontWeight: 600,
                    color: isLoading ? MUTED : '#faf6ee',
                    backgroundColor: isLoading ? 'rgba(30,19,12,0.5)' : INK,
                    border: `1px solid ${INK}`,
                    letterSpacing: '0.2em',
                  }}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <span
                        className="inline-block w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: `${MUTED} transparent transparent transparent` }}
                      />
                      Aguarde
                    </span>
                  ) : 'Entrar'}
                </button>
              </div>

              {/* Status messages */}
              <div className="min-h-5 text-center">
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ fontFamily: 'var(--font-lora)', color: '#8b2525', fontSize: '1rem', fontStyle: 'italic' }}
                    >
                      {error}
                    </motion.p>
                  )}
                  {success && (
                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ fontFamily: 'var(--font-lora)', color: ACCENT, fontSize: '1rem', fontStyle: 'italic' }}
                    >
                      Bem-vindo.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-6">
              <ClassicRule
                className="w-full mb-4"
                style={{ color: INK } as React.CSSProperties}
              />
              <div className="flex justify-center gap-7">
                {[
                  { label: 'Ajuda',    action: () => setContactModalOpen(true) },
                  { label: 'Catálogo', action: () => router.push('/browse-courses') },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="transition-colors hover:underline"
                    style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '1rem' }}
                  >
                    {label}
                  </button>
                ))}
                <div
                  className="flex items-center gap-1.5 cursor-pointer"
                  style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '1rem' }}
                >
                  <Globe size={12} />
                  <span>PT-BR</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
      <ForgotPasswordModal isOpen={forgotPasswordModalOpen} onClose={() => setForgotPasswordModalOpen(false)} />
    </div>
  )
}
