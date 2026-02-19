'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ErrorBoundary from '../components/ErrorBoundary'
import { useAuth } from '../providers/AuthProvider'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Ship,
  Anchor,
  BarChart3,
  GraduationCap,
  PlayCircle,
  FileCheck,
  Database,
  ChevronLeft,
  ChevronRight,
  Layers,
  Folder,
  Award,
  Eye,
  FileSpreadsheet
} from 'lucide-react'
import Logo from '../components/Logo'
import LogoSwiftEDU from '../components/LogoSwiftEDU'
import { getPendingCertificatesCount } from '@/lib/actions/dashboard-layout'
import { useTranslation } from '../contexts/LanguageContext'
import PageTransition from '../components/ui/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import MobileDrawer from '../components/MobileDrawer'
import { DriveImportProvider } from '../contexts/DriveImportContext'
import ImportOverlay from '../components/ImportOverlay'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [pendingCertificates, setPendingCertificates] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()

  // Auth is handled by AuthProvider automatically

  // Save sidebar state to localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarOpen')
    if (savedState !== null) {
      setSidebarOpen(JSON.parse(savedState))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

  // Fetch pending certificate requests count via server action
  useEffect(() => {
    const fetchPendingCertificates = async () => {
      const result = await getPendingCertificatesCount()

      if (result.success) {
        setPendingCertificates(result.count)
      } else {
        console.error('Error fetching pending certificates:', result.error)
        setPendingCertificates(0)
      }
    }

    fetchPendingCertificates()

    // Note: Realtime subscriptions require browser client with auth
    // For now, we poll every 30 seconds instead
    // TODO: Consider implementing server-sent events or polling endpoint
    const interval = setInterval(fetchPendingCertificates, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const menuItems = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.users'), href: '/dashboard/users', icon: Users },
    { name: t('nav.courses'), href: '/dashboard/courses', icon: BookOpen },
    { name: 'Certificados', href: '/dashboard/certificates', icon: Award },
    { name: 'Avaliar TCCs', href: '/dashboard/tcc-evaluation', icon: FileCheck },
    { name: 'Módulos', href: '/dashboard/modules', icon: Folder },
    { name: 'Estrutura', href: '/dashboard/structure', icon: Layers },
    { name: t('nav.subjects'), href: '/dashboard/subjects', icon: GraduationCap },
    { name: t('nav.lessons'), href: '/dashboard/lessons', icon: PlayCircle },
    { name: 'Testes', href: '/dashboard/tests', icon: FileCheck },
    { name: t('nav.reports'), href: '/dashboard/reports', icon: BarChart3 },
    { name: 'Templates Excel', href: '/dashboard/templates', icon: FileSpreadsheet },
    { name: t('nav.settings'), href: '/dashboard/settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)

      // Logout via API route (clears httpOnly cookies server-side)
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Logout API error:', data)
        throw new Error(data.error || 'Logout failed')
      }

      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 200))

      // Force hard redirect
      window.location.href = '/'
    } catch (error) {
      console.error('Error logging out:', error)
      // Still try to redirect even if there's an error
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
      setLoggingOut(false)
    }
  }

  return (
    <DriveImportProvider>
    <div className="min-h-screen bg-navy-900">
      <div className="absolute inset-0 bg-gradient-to-b from-navy-800/30 to-navy-900" />

      {/* Mobile Header */}
      <div className="relative md:hidden bg-navy-900/95 backdrop-blur-md border-b border-gold-500/20 p-4 flex items-center justify-between">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 hover:bg-navy-700 rounded-lg transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6 text-gold-400" />
        </button>
        <Logo width={100} height={40} />
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="relative flex h-screen">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={{ width: sidebarOpen ? 256 : 80 }}
          animate={{ width: sidebarOpen ? 256 : 80 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="hidden md:block relative bg-navy-900/95 backdrop-blur-md border-r border-gold-500/20 flex-shrink-0"
        >
          <div className="flex flex-col h-full p-4">
            {/* Logo e Toggle */}
            <div className="flex items-center justify-start mb-2">
              <Logo width={sidebarOpen ? 120 : 60} height={sidebarOpen ? 120 : 60} />
            </div>

            {/* Sidebar Toggle Button - Improved positioning and visibility */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="absolute -right-5 top-12 w-11 h-11 bg-navy-800/95 backdrop-blur-sm border-2 border-gold-500 rounded-full flex items-center justify-center text-gold-400 hover:text-gold-200 hover:bg-navy-700 hover:scale-110 hover:shadow-lg hover:shadow-gold-500/30 transition-all z-50 group"
              aria-label={sidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
            >
              {sidebarOpen ? 
                <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" /> : 
                <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
              }
            </button>

            {/* Menu de Navegação */}
            <nav className="flex-1 space-y-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative
                        ${active 
                          ? 'bg-gold-500/20 text-gold shadow-lg shadow-gold-500/10' 
                          : 'text-gold-300 hover:bg-navy-800/50 hover:text-gold-200'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${active && 'animate-pulse'}`} />
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span 
                            className="font-medium whitespace-nowrap flex-1"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {/* Badge for pending certificates */}
                      {item.href === '/dashboard/certificates' && pendingCertificates > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`${sidebarOpen ? 'relative' : 'absolute top-1 right-1'} bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1`}
                        >
                          {pendingCertificates}
                        </motion.div>
                      )}
                    </Link>

                    {/* Tooltip for collapsed sidebar */}
                    <AnimatePresence>
                      {!sidebarOpen && hoveredItem === item.href && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50"
                        >
                          <div className="px-3 py-2 bg-navy-800 border border-gold-500/30 rounded-lg shadow-xl whitespace-nowrap">
                            <span className="text-sm text-gold-200">{item.name}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </nav>

            {/* Seção de Preview */}
            <div className="border-t border-gold-500/20 pt-4 mb-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative"
                onMouseEnter={() => setHoveredItem('/student-dashboard')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  href="/student-dashboard"
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative
                    text-blue-400 hover:bg-blue-500/20 hover:text-blue-300
                  `}
                >
                  <Eye className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span 
                        className="font-medium whitespace-nowrap flex-1"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        Portal do Aluno
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>

                {/* Tooltip for collapsed sidebar */}
                <AnimatePresence>
                  {!sidebarOpen && hoveredItem === '/student-dashboard' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50"
                    >
                      <div className="px-3 py-2 bg-navy-800 border border-gold-500/30 rounded-lg shadow-xl whitespace-nowrap">
                        <span className="text-sm text-gold-200">Portal do Aluno</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Footer do Sidebar */}
            <div className="border-t border-gold-500/20 pt-4">
              <div 
                className="relative"
                onMouseEnter={() => setHoveredItem('logout')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <button 
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 w-full rounded-lg
                    text-gold-300 hover:bg-red-500/20 hover:text-red-400 transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span 
                        className="font-medium whitespace-nowrap"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {loggingOut ? t('nav.loggingOut') : t('nav.logout')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                {/* Tooltip for collapsed sidebar */}
                <AnimatePresence>
                  {!sidebarOpen && hoveredItem === 'logout' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50"
                    >
                      <div className="px-3 py-2 bg-navy-800 border border-gold-500/30 rounded-lg shadow-xl whitespace-nowrap">
                        <span className="text-sm text-gold-200">
                          {loggingOut ? t('nav.loggingOut') : t('nav.logout')}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Page Content with Animation */}
          <ErrorBoundary>
            <PageTransition>
              <div className="p-4 sm:p-6 md:p-8">
                {children}
              </div>
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Menu"
      >
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${active
                    ? 'bg-gold-500/20 text-gold'
                    : 'text-gold-300 hover:bg-navy-700 hover:text-gold-200'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            )
          })}

          {/* Logout button in mobile menu */}
          <button
            onClick={() => {
              setMobileMenuOpen(false)
              handleLogout()
            }}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-navy-700 transition-all disabled:opacity-50"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              {loggingOut ? t('nav.loggingOut') : t('nav.logout')}
            </span>
          </button>
        </nav>
      </MobileDrawer>

      {/* Drive import modal and floating widget — rendered here so they persist across navigation */}
      <ImportOverlay />
    </div>
    </DriveImportProvider>
  )
}