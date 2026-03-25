'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Playfair_Display, Lora } from 'next/font/google'
import ErrorBoundary from '../components/ErrorBoundary'
import {
  Library,
  Contact2,
  Scroll,
  PenTool,
  LogOut,
  Menu,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Medal,
  Eye,
  Table,
  X,
  Network,
  GitMerge,
  Blocks,
  BookOpenCheck,
  FileVideo,
  FileCheck2,
  ClipboardCheck
} from 'lucide-react'
import { getPendingCertificatesCount } from '@/lib/actions/dashboard-layout'
import { useTranslation } from '../contexts/LanguageContext'
import PageTransition from '../components/ui/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import { DriveImportProvider } from '../contexts/DriveImportContext'
import ImportOverlay from '../components/ImportOverlay'
import { ClassicRule, CornerBracket, SwiftMark } from '../components/ui/RenaissanceSvgs'

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

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.15)'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [pendingCertificates, setPendingCertificates] = useState(0)
  const pathname = usePathname()
  const { t } = useTranslation()

  const isStructurePath = pathname.startsWith('/dashboard/structure') || 
                          pathname.startsWith('/dashboard/courses') ||
                          pathname.startsWith('/dashboard/modules') || 
                          pathname.startsWith('/dashboard/subjects') || 
                          pathname.startsWith('/dashboard/lessons') || 
                          pathname.startsWith('/dashboard/tests')

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Estrutura': isStructurePath
  })

  useEffect(() => {
    if (isStructurePath) {
      setOpenMenus(prev => ({ ...prev, 'Estrutura': true }))
    }
  }, [isStructurePath])

  const toggleSubMenu = (menuName: string) => {
    setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }))
    if (!sidebarOpen) setSidebarOpen(true)
  }

  useEffect(() => {
    const saved = localStorage.getItem('sidebarOpen')
    if (saved !== null) setSidebarOpen(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

  useEffect(() => {
    const fetch = async () => {
      const result = await getPendingCertificatesCount()
      setPendingCertificates(result.success ? result.count : 0)
    }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [])

  const menuItems = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: Library },
    { name: t('nav.users'), href: '/dashboard/users', icon: Contact2 },
    { name: 'Certificados', href: '/dashboard/certificates', icon: Medal, badge: pendingCertificates },
    { name: 'Avaliar TCCs', href: '/dashboard/tcc-evaluation', icon: ClipboardCheck },
    {
      name: 'Estrutura',
      icon: Network,
      subItems: [
        { name: 'Visão Geral', href: '/dashboard/structure', icon: GitMerge },
        { name: t('nav.courses'), href: '/dashboard/courses', icon: Scroll },
        { name: 'Módulos', href: '/dashboard/modules', icon: Blocks },
        { name: t('nav.subjects'), href: '/dashboard/subjects', icon: BookOpenCheck },
        { name: t('nav.lessons'), href: '/dashboard/lessons', icon: FileVideo },
        { name: 'Testes', href: '/dashboard/tests', icon: FileCheck2 },
      ]
    },
    { name: t('nav.reports'), href: '/dashboard/reports', icon: PieChart },
    { name: 'Templates Excel', href: '/dashboard/templates', icon: Table },
    { name: t('nav.settings'), href: '/dashboard/settings', icon: PenTool },
  ]

  const isActive = (href: string | undefined) => {
    if (!href) return false
    return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Logout failed')
      await new Promise(r => setTimeout(r, 200))
      window.location.href = '/'
    } catch (err) {
      console.error('Error logging out:', err)
      setTimeout(() => { window.location.href = '/' }, 1000)
      setLoggingOut(false)
    }
  }

  const sidebarWidth = sidebarOpen ? 260 : 80

  return (
    <DriveImportProvider>
      <div
        className={`${playfair.variable} ${lora.variable} h-screen w-full flex flex-col relative overflow-hidden`}
        style={{ backgroundColor: PARCH }}
      >
        {/* Fundo texturizado global para a área principal */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            opacity: 0.04,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' fill='%231e130c'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'repeat',
            backgroundAttachment: 'fixed'
          }}
        />

        {/* ── Mobile Header ── */}
        <div
          className="lg:hidden relative z-30 flex items-center justify-between px-4 py-3"
          style={{
            backgroundColor: INK,
            borderBottom: `1px solid rgba(139,109,34,0.25)`,
            boxShadow: '0 2px 24px rgba(30,19,12,0.1)',
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
            style={{ color: PARCH, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div style={{ width: '2.5rem', color: ACCENT }}>
              <SwiftMark />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-playfair)',
                color: PARCH,
                fontSize: '1.2rem',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              Swift
            </span>
          </div>
          <div style={{ width: 24 }} />
        </div>

        {/* ── Layout Principal ── */}
        <div className="flex flex-1 overflow-hidden relative z-10">

          {/* ── Sidebar Desktop ── */}
          <motion.aside
            className="hidden lg:flex flex-col relative z-20 h-full flex-shrink-0"
            initial={{ width: sidebarWidth }}
            animate={{ width: sidebarWidth }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{
              backgroundColor: INK,
              borderRight: `1px solid rgba(139,109,34,0.2)`,
              boxShadow: '4px 0 24px rgba(30,19,12,0.15)',
            }}
          >
            {/* Botão toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              className="absolute -right-4 top-8 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[rgba(139,109,34,0.1)]"
              style={{
                backgroundColor: INK,
                border: `1px solid ${ACCENT}`,
                color: PARCH,
                zIndex: 50,
                cursor: 'pointer',
              }}
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            <div className="flex flex-col h-full py-6 px-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
              
              <div className="flex items-center gap-3 px-2 mb-6 min-h-[40px]">
                <div style={{ width: sidebarOpen ? '3.5rem' : '2.5rem', color: ACCENT, transition: 'width 0.3s' }}>
                  <SwiftMark />
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="whitespace-nowrap"
                    >
                      <h1
                        style={{
                          fontFamily: 'var(--font-playfair)',
                          color: PARCH,
                          fontSize: '1.4rem',
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        Swift <span style={{ color: ACCENT, fontStyle: 'italic', fontWeight: 400 }}>Edu.</span>
                      </h1>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mb-6 px-2 opacity-40">
                <ClassicRule style={{ color: PARCH }} />
              </div>

              <nav className="flex-1 flex flex-col gap-1">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const active = item.href ? isActive(item.href) : (item.subItems?.some(sub => isActive(sub.href)))
                  const hovered = hoveredItem === (item.href || item.name)
                  const isOpen = openMenus[item.name]

                  return (
                    <div key={item.href || item.name} className="flex flex-col">
                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredItem(item.href || item.name)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200"
                            style={{
                              color: active ? ACCENT : hovered ? PARCH : `rgba(250,246,238,0.6)`,
                              backgroundColor: active
                                ? 'rgba(139,109,34,0.1)'
                                : hovered
                                ? 'rgba(250,246,238,0.04)'
                                : 'transparent',
                              fontFamily: 'var(--font-lora)',
                              fontSize: '0.95rem',
                              fontWeight: active ? 600 : 400,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                            }}
                          >
                            <Icon size={18} style={{ flexShrink: 0 }} />
                            
                            <AnimatePresence>
                              {sidebarOpen && (
                                <motion.span
                                  initial={{ opacity: 0, width: 0 }}
                                  animate={{ opacity: 1, width: 'auto' }}
                                  exit={{ opacity: 0, width: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex-1 truncate"
                                >
                                  {item.name}
                                </motion.span>
                              )}
                            </AnimatePresence>

                            {item.badge ? (
                              <span
                                className={`${sidebarOpen ? 'relative' : 'absolute top-1 right-1'} flex items-center justify-center rounded-full`}
                                style={{
                                  backgroundColor: '#8b2525',
                                  color: PARCH,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  minWidth: '18px',
                                  height: '18px',
                                  padding: '0 4px',
                                }}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        ) : (
                          <button
                            onClick={() => toggleSubMenu(item.name)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm transition-all duration-200 cursor-pointer border-none text-left"
                            style={{
                              color: active || isOpen ? ACCENT : hovered ? PARCH : `rgba(250,246,238,0.6)`,
                              backgroundColor: active && !isOpen
                                ? 'rgba(139,109,34,0.1)'
                                : hovered
                                ? 'rgba(250,246,238,0.04)'
                                : 'transparent',
                              fontFamily: 'var(--font-lora)',
                              fontSize: '0.95rem',
                              fontWeight: active || isOpen ? 600 : 400,
                              borderLeft: active || isOpen ? `2px solid ${ACCENT}` : '2px solid transparent',
                            }}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <Icon size={18} style={{ flexShrink: 0 }} />
                              <AnimatePresence>
                                {sidebarOpen && (
                                  <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex-1 truncate"
                                  >
                                    {item.name}
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                            {sidebarOpen && (
                              <ChevronDown 
                                size={16} 
                                className="transition-transform duration-200 flex-shrink-0" 
                                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} 
                              />
                            )}
                          </button>
                        )}

                        <AnimatePresence>
                          {!sidebarOpen && hovered && (
                            <motion.div
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -5 }}
                              className="absolute left-full top-1/2 -translate-y-1/2 ml-4 z-50 py-1.5 px-3 whitespace-nowrap"
                              style={{
                                backgroundColor: PARCH,
                                border: `1px solid ${BORDER}`,
                                boxShadow: '0 4px 12px rgba(30,19,12,0.15)',
                              }}
                            >
                              <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: INK }}>
                                {item.name}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <AnimatePresence>
                        {item.subItems && sidebarOpen && isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-1 overflow-hidden"
                          >
                            {item.subItems.map((sub) => {
                              const SubIcon = sub.icon
                              const subActive = isActive(sub.href)
                              const subHovered = hoveredItem === sub.href
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onMouseEnter={() => setHoveredItem(sub.href)}
                                  onMouseLeave={() => setHoveredItem(null)}
                                  className="flex items-center gap-3 pl-10 pr-3 py-2 rounded-sm transition-all duration-200"
                                  style={{
                                    color: subActive ? ACCENT : subHovered ? PARCH : `rgba(250,246,238,0.5)`,
                                    backgroundColor: subActive
                                      ? 'rgba(139,109,34,0.05)'
                                      : subHovered
                                      ? 'rgba(250,246,238,0.02)'
                                      : 'transparent',
                                    fontFamily: 'var(--font-lora)',
                                    fontSize: '0.85rem',
                                    fontWeight: subActive ? 500 : 400,
                                    textDecoration: 'none',
                                    whiteSpace: 'nowrap',
                                    borderLeft: '2px solid transparent',
                                  }}
                                >
                                  <SubIcon size={16} style={{ flexShrink: 0 }} />
                                  <span className="flex-1 truncate">{sub.name}</span>
                                </Link>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </nav>

              <div className="my-6 px-2 opacity-40">
                <ClassicRule style={{ color: PARCH }} />
              </div>

              <div
                className="relative mb-2"
                onMouseEnter={() => setHoveredItem('/student-dashboard')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  href="/student-dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors"
                  style={{
                    color: hoveredItem === '/student-dashboard' ? `rgba(250,246,238,0.9)` : MUTED,
                    fontFamily: 'var(--font-lora)',
                    fontSize: '0.95rem',
                    fontStyle: 'italic',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Eye size={18} style={{ flexShrink: 0 }} />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        Portal do Aluno
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </div>

              <div
                className="relative"
                onMouseEnter={() => setHoveredItem('logout')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
                  style={{
                    color: hoveredItem === 'logout' ? PARCH : `rgba(250,246,238,0.5)`,
                    fontFamily: 'var(--font-lora)',
                    fontSize: '0.95rem',
                    background: 'none',
                    border: 'none',
                    cursor: loggingOut ? 'not-allowed' : 'pointer',
                    opacity: loggingOut ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <LogOut size={18} style={{ flexShrink: 0 }} />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {loggingOut ? t('nav.loggingOut') : t('nav.logout')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
          </motion.aside>

          {/* ── Área de Conteúdo Única ── */}
          <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar h-full w-full">
            <div className="min-h-full w-full px-6 py-8 sm:px-10 lg:px-16 relative">
              
              {/* Cantoneiras Decorativas Globais */}
              <div className="absolute top-6 left-6 w-12 h-12 pointer-events-none" style={{ color: ACCENT }}>
                <CornerBracket />
              </div>
              <div className="absolute top-6 right-6 w-12 h-12 pointer-events-none" style={{ color: ACCENT, transform: 'scaleX(-1)' }}>
                <CornerBracket />
              </div>
              <div className="absolute bottom-6 left-6 w-12 h-12 pointer-events-none" style={{ color: ACCENT, transform: 'scaleY(-1)' }}>
                <CornerBracket />
              </div>
              <div className="absolute bottom-6 right-6 w-12 h-12 pointer-events-none" style={{ color: ACCENT, transform: 'scale(-1)' }}>
                <CornerBracket />
              </div>

              <ErrorBoundary>
                <PageTransition>
                  <div className="max-w-[1400px] mx-auto relative z-10">
                    {children}
                  </div>
                </PageTransition>
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* ── Mobile Drawer ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-40"
                style={{ backgroundColor: 'rgba(30,19,12,0.6)', backdropFilter: 'blur(2px)' }}
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[280px] z-50 flex flex-col overflow-y-auto custom-scrollbar"
                style={{
                  backgroundColor: INK,
                  borderRight: `1px solid rgba(139,109,34,0.2)`,
                  boxShadow: '4px 0 24px rgba(30,19,12,0.2)',
                }}
              >
                <div className="flex items-center justify-between p-6 flex-shrink-0">
                  <div style={{ width: '3rem', color: ACCENT }}>
                    <SwiftMark />
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: `rgba(250,246,238,0.5)`, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="px-6 opacity-40">
                  <ClassicRule style={{ color: PARCH }} />
                </div>

                <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
                  {menuItems.map(item => {
                    const Icon = item.icon
                    const active = item.href ? isActive(item.href) : (item.subItems?.some(sub => isActive(sub.href)))
                    const isOpen = openMenus[item.name]

                    return (
                      <div key={item.href || item.name} className="flex flex-col gap-1">
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-sm"
                            style={{
                              color: active ? ACCENT : `rgba(250,246,238,0.7)`,
                              backgroundColor: active ? 'rgba(139,109,34,0.12)' : 'transparent',
                              fontFamily: 'var(--font-lora)',
                              textDecoration: 'none',
                              borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                            }}
                          >
                            <Icon size={18} />
                            <span>{item.name}</span>
                          </Link>
                        ) : (
                          <button
                            onClick={() => setOpenMenus(prev => ({...prev, [item.name]: !prev[item.name]}))}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-sm border-none text-left"
                            style={{
                              color: active || isOpen ? ACCENT : `rgba(250,246,238,0.7)`,
                              backgroundColor: active && !isOpen ? 'rgba(139,109,34,0.12)' : 'transparent',
                              fontFamily: 'var(--font-lora)',
                              borderLeft: active || isOpen ? `2px solid ${ACCENT}` : '2px solid transparent',
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Icon size={18} />
                              <span>{item.name}</span>
                            </div>
                            <ChevronDown 
                              size={16} 
                              className="transition-transform duration-200" 
                              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} 
                            />
                          </button>
                        )}
                        
                        <AnimatePresence>
                          {item.subItems && isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex flex-col overflow-hidden"
                            >
                              {item.subItems.map(sub => {
                                const SubIcon = sub.icon
                                const subActive = isActive(sub.href)
                                return (
                                  <Link
                                    key={sub.href}
                                    href={sub.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 pl-12 pr-4 py-2.5 rounded-sm"
                                    style={{
                                      color: subActive ? ACCENT : `rgba(250,246,238,0.6)`,
                                      backgroundColor: subActive ? 'rgba(139,109,34,0.06)' : 'transparent',
                                      fontFamily: 'var(--font-lora)',
                                      fontSize: '0.9rem',
                                      textDecoration: 'none',
                                      borderLeft: '2px solid transparent',
                                    }}
                                  >
                                    <SubIcon size={16} />
                                    <span>{sub.name}</span>
                                  </Link>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <ImportOverlay />
      </div>
    </DriveImportProvider>
  )
}
