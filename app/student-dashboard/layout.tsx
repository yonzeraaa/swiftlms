'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  Search
} from 'lucide-react'
import Logo from '../components/Logo'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../contexts/LanguageContext'
import CommandPalette from '../components/ui/CommandPalette'
import PageTransition from '../components/ui/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentAvatar, setStudentAvatar] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  useEffect(() => {
    fetchStudentInfo()
  }, [])

  const fetchStudentInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setStudentName(profile.full_name || profile.email)
          setStudentAvatar(profile.avatar_url || '')
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
    { name: 'Avaliações', href: '/student-dashboard/assessments', icon: FileCheck },
    { name: 'Progresso', href: '/student-dashboard/progress', icon: GraduationCap },
    { name: 'Calendário', href: '/student-dashboard/calendar', icon: Calendar },
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
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
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
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-navy-900/95 backdrop-blur-md border-r border-gold-500/20`}>
          <div className="flex flex-col h-full p-4">
            {/* Logo e Toggle */}
            <div className="flex items-center justify-between mb-8">
              <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
                <Logo className="w-12 h-12" />
                {sidebarOpen && (
                  <div>
                    <h1 className="text-xl font-bold text-gold">SwiftEDU</h1>
                    <p className="text-xs text-gold-300">Portal do Aluno</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Student Info */}
            {sidebarOpen && studentName && (
              <div className="mb-6 p-3 bg-navy-800/50 rounded-lg border border-gold-500/20">
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
              </div>
            )}

            {/* Menu de Navegação */}
            <nav className="flex-1 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                      ${active 
                        ? 'bg-gold-500/20 text-gold border-l-4 border-gold-500' 
                        : 'text-gold-300 hover:bg-navy-800/50 hover:text-gold-200'
                      }
                      ${!sidebarOpen && 'justify-center'}
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                  </Link>
                )
              })}
            </nav>

            {/* Footer do Sidebar */}
            <div className="border-t border-gold-500/20 pt-4">
              <button 
                onClick={handleLogout}
                disabled={loggingOut}
                className={`
                  flex items-center gap-3 px-3 py-2 w-full rounded-lg
                  text-gold-300 hover:bg-red-500/20 hover:text-red-400 transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${!sidebarOpen && 'justify-center'}
                `}
              >
                <LogOut className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium">{loggingOut ? 'Saindo...' : 'Sair'}</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}