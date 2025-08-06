'use client'

import { useState } from 'react'
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
  Database
} from 'lucide-react'
import Logo from '../components/Logo'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../contexts/LanguageContext'
import CommandPalette from '../components/ui/CommandPalette'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import PageTransition from '../components/ui/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  const menuItems = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.users'), href: '/dashboard/users', icon: Users },
    { name: t('nav.courses'), href: '/dashboard/courses', icon: BookOpen },
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
      
      {/* Command Palette */}
      <CommandPalette />
      
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
                    <p className="text-xs text-gold-300">Admin Dashboard</p>
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

            {/* Menu de Navegação */}
            <nav className="flex-1 space-y-2">
              <AnimatePresence>
                {menuItems.map((item, index) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
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
                  </motion.div>
                )
                })}
              </AnimatePresence>
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
                {sidebarOpen && <span className="font-medium">{loggingOut ? t('nav.loggingOut') : t('nav.logout')}</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Top Bar with Breadcrumbs */}
          <div className="sticky top-0 z-30 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border-b border-gold-500/10 px-8 py-4">
            <Breadcrumbs />
          </div>
          
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