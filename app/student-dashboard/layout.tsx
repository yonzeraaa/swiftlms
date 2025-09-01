'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ErrorBoundary from '../components/ErrorBoundary'
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap,
  Trophy,
  Calendar,
  FileText,
  FileCheck,
  Settings, 
  LogOut,
  Menu,
  X,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowLeft
} from 'lucide-react'
import Logo from '../components/Logo'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../contexts/LanguageContext'
import PageTransition from '../components/ui/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentAvatar, setStudentAvatar] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
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

  useEffect(() => {
    fetchStudentInfo()
  }, [])

  const fetchStudentInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url, role')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setStudentName(profile.full_name || profile.email)
          setStudentAvatar(profile.avatar_url || '')
          setIsAdmin(profile.role === 'admin')
        }
      }
    } catch (error) {
      console.error('Error fetching student info:', error)
    }
  }

  const menuItems = [
    { name: 'Painel Geral', href: '/student-dashboard', icon: LayoutDashboard },
    { name: 'Explorar Cursos', href: '/student-dashboard/courses', icon: Search },
    { name: 'Meus Cursos', href: '/student-dashboard/my-courses', icon: BookOpen },
    { name: 'Progresso', href: '/student-dashboard/progress', icon: GraduationCap },
    { name: 'Calendário', href: '/student-dashboard/calendar', icon: Calendar },
    { name: 'Testes', href: '/student-dashboard/tests', icon: FileCheck },
    { name: 'Minhas Notas', href: '/student-dashboard/grades', icon: FileText },
    { name: 'Certificados', href: '/student-dashboard/certificates', icon: Trophy },
    { name: 'Configurações', href: '/student-dashboard/settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/student-dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Logout failed')
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      window.location.href = '/'
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
            <div className="flex items-center justify-between mb-8">
              <motion.div 
                className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}
                animate={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
              >
                <Logo width={48} height={48} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-xs text-gold-300 whitespace-nowrap">Portal do Aluno</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
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

            {/* Student Info */}
            <AnimatePresence>
              {sidebarOpen && studentName && (
                <motion.div 
                  className="mb-6 p-3 bg-navy-800/50 rounded-lg border border-gold-500/20"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center overflow-hidden">
                      {studentAvatar ? (
                        <img 
                          src={studentAvatar} 
                          alt={studentName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gold" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gold-300">Bem-vindo(a),</p>
                      <p className="text-gold font-medium truncate">{studentName}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
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
                            className="font-medium whitespace-nowrap"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
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

            {/* Admin Mode Indicator */}
            {isAdmin && (
              <div className="border-t border-gold-500/20 pt-4 mb-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative"
                  onMouseEnter={() => setHoveredItem('/dashboard')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    href="/dashboard"
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative
                      text-purple-400 hover:bg-purple-500/20 hover:text-purple-300
                      ${!sidebarOpen && 'justify-center'}
                    `}
                  >
                    <Shield className="w-5 h-5 flex-shrink-0" />
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span 
                          className="font-medium whitespace-nowrap flex-1"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          Voltar ao Admin
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>

                  {/* Tooltip for collapsed sidebar */}
                  <AnimatePresence>
                    {!sidebarOpen && hoveredItem === '/dashboard' && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50"
                      >
                        <div className="px-3 py-2 bg-navy-800 border border-gold-500/30 rounded-lg shadow-xl whitespace-nowrap">
                          <span className="text-sm text-gold-200">Voltar ao Admin</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}

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
                        {loggingOut ? 'Saindo...' : 'Sair'}
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
                          {loggingOut ? 'Saindo...' : 'Sair'}
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
              <div className="p-8">
                {children}
              </div>
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}