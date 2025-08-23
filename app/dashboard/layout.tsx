'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  Award
} from 'lucide-react'
import Logo from '../components/Logo'
import LogoSwiftEDU from '../components/LogoSwiftEDU'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../contexts/LanguageContext'
import PageTransition from '../components/ui/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [pendingCertificates, setPendingCertificates] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

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

  // Fetch pending certificate requests count
  useEffect(() => {
    const fetchPendingCertificates = async () => {
      const { count } = await supabase
        .from('certificate_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      
      setPendingCertificates(count || 0)
    }

    fetchPendingCertificates()
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('certificate_requests')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'certificate_requests' 
      }, fetchPendingCertificates)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const menuItems = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.users'), href: '/dashboard/users', icon: Users },
    { name: t('nav.courses'), href: '/dashboard/courses', icon: BookOpen },
    { name: 'Certificados', href: '/dashboard/certificates', icon: Award },
    { name: 'Módulos', href: '/dashboard/modules', icon: Folder },
    { name: 'Estrutura', href: '/dashboard/structure', icon: Layers },
    { name: t('nav.subjects'), href: '/dashboard/subjects', icon: GraduationCap },
    { name: t('nav.lessons'), href: '/dashboard/lessons', icon: PlayCircle },
    { name: t('nav.tests'), href: '/dashboard/tests', icon: FileCheck },
    { name: t('nav.questionBank'), href: '/dashboard/question-bank', icon: Database },
    { name: t('nav.reports'), href: '/dashboard/reports', icon: BarChart3 },
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
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Redirecionar para a página de login
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-pattern">
      <div className="absolute inset-0 bg-gradient-to-br from-navy-600/50 via-navy-700/50 to-navy-900/50" />
      
      
      <div className="relative flex h-screen">
        {/* Sidebar */}
        <motion.aside 
          initial={{ width: sidebarOpen ? 256 : 80 }}
          animate={{ width: sidebarOpen ? 256 : 80 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative bg-navy-900/95 backdrop-blur-md border-r border-gold-500/20 flex-shrink-0"
        >
          <div className="flex flex-col h-full p-4">
            {/* Logo e Toggle */}
            <div className="flex items-center justify-center mb-2">
              <Logo width={sidebarOpen ? 120 : 60} height={sidebarOpen ? 120 : 60} />
            </div>

            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="absolute -right-3 top-12 w-6 h-6 bg-navy-800 border border-gold-500/30 rounded-full flex items-center justify-center text-gold-400 hover:text-gold-200 hover:bg-navy-700 transition-all z-10 group"
            >
              {sidebarOpen ? 
                <ChevronLeft className="w-3 h-3 group-hover:scale-110 transition-transform" /> : 
                <ChevronRight className="w-3 h-3 group-hover:scale-110 transition-transform" />
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
                        ${!sidebarOpen && 'justify-center'}
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
                    ${!sidebarOpen && 'justify-center'}
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
          <PageTransition>
            <div className="p-8">
              {children}
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  )
}