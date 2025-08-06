'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Command } from 'cmdk'
import { 
  Search, Home, Users, BookOpen, Settings, LogOut,
  FileCheck, Database, BarChart3, GraduationCap, PlayCircle,
  Plus, Moon, Sun, Globe, HelpCircle, User, Bell,
  Zap, Command as CommandIcon, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface CommandItem {
  id: string
  label: string
  icon?: React.ReactNode
  shortcut?: string
  action?: () => void
  href?: string
  group?: string
  keywords?: string[]
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Toggle command palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }

      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/')
  }

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'light' : 'dark')
  }

  const navigateTo = (href: string) => {
    router.push(href)
    setOpen(false)
  }

  const isDashboard = pathname.startsWith('/dashboard')
  const isStudentDashboard = pathname.startsWith('/student-dashboard')

  const navigationItems: CommandItem[] = isDashboard ? [
    // Admin/Teacher Navigation
    { id: 'home', label: 'Dashboard', icon: <Home className="w-4 h-4" />, href: '/dashboard', group: 'Navegação' },
    { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" />, href: '/dashboard/users', group: 'Navegação' },
    { id: 'courses', label: 'Cursos', icon: <BookOpen className="w-4 h-4" />, href: '/dashboard/courses', group: 'Navegação' },
    { id: 'subjects', label: 'Disciplinas', icon: <GraduationCap className="w-4 h-4" />, href: '/dashboard/subjects', group: 'Navegação' },
    { id: 'lessons', label: 'Aulas', icon: <PlayCircle className="w-4 h-4" />, href: '/dashboard/lessons', group: 'Navegação' },
    { id: 'tests', label: 'Testes', icon: <FileCheck className="w-4 h-4" />, href: '/dashboard/tests', group: 'Navegação' },
    { id: 'questions', label: 'Banco de Questões', icon: <Database className="w-4 h-4" />, href: '/dashboard/question-bank', group: 'Navegação' },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 className="w-4 h-4" />, href: '/dashboard/reports', group: 'Navegação' },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" />, href: '/dashboard/settings', group: 'Navegação' },
  ] : [
    // Student Navigation
    { id: 'home', label: 'Dashboard', icon: <Home className="w-4 h-4" />, href: '/student-dashboard', group: 'Navegação' },
    { id: 'courses', label: 'Cursos', icon: <BookOpen className="w-4 h-4" />, href: '/student-dashboard/courses', group: 'Navegação' },
    { id: 'my-courses', label: 'Meus Cursos', icon: <BookOpen className="w-4 h-4" />, href: '/student-dashboard/my-courses', group: 'Navegação' },
    { id: 'progress', label: 'Progresso', icon: <BarChart3 className="w-4 h-4" />, href: '/student-dashboard/progress', group: 'Navegação' },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" />, href: '/student-dashboard/settings', group: 'Navegação' },
  ]

  const actionItems: CommandItem[] = [
    // Quick Actions
    ...(isDashboard ? [
      { id: 'new-user', label: 'Novo Usuário', icon: <Plus className="w-4 h-4" />, shortcut: '⌘N', group: 'Ações Rápidas', keywords: ['criar', 'adicionar'] },
      { id: 'new-course', label: 'Novo Curso', icon: <Plus className="w-4 h-4" />, group: 'Ações Rápidas', keywords: ['criar', 'adicionar'] },
      { id: 'new-test', label: 'Novo Teste', icon: <Plus className="w-4 h-4" />, group: 'Ações Rápidas', keywords: ['criar', 'adicionar', 'prova'] },
      { id: 'new-question', label: 'Nova Questão', icon: <Plus className="w-4 h-4" />, group: 'Ações Rápidas', keywords: ['criar', 'adicionar', 'pergunta'] },
    ] : []),
    
    // System Actions
    { id: 'theme', label: 'Alternar Tema', icon: <Moon className="w-4 h-4" />, shortcut: '⌘T', action: toggleTheme, group: 'Sistema' },
    { id: 'notifications', label: 'Notificações', icon: <Bell className="w-4 h-4" />, group: 'Sistema' },
    { id: 'profile', label: 'Meu Perfil', icon: <User className="w-4 h-4" />, group: 'Sistema' },
    { id: 'help', label: 'Ajuda', icon: <HelpCircle className="w-4 h-4" />, shortcut: '⌘?', group: 'Sistema' },
    { id: 'logout', label: 'Sair', icon: <LogOut className="w-4 h-4" />, action: handleLogout, group: 'Sistema' },
  ]

  const allItems = [...navigationItems, ...actionItems]

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3 bg-navy-800 dark:bg-navy-900 border border-gold-500/20 rounded-full shadow-elevation-3 hover:shadow-elevation-4 transition-all duration-200 group"
        aria-label="Open command palette"
      >
        <div className="relative">
          <CommandIcon className="w-6 h-6 text-gold-500 group-hover:text-gold-400 transition-colors" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500"></span>
          </span>
        </div>
      </button>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Command Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-x-0 top-[20%] z-50 mx-auto max-w-2xl px-4"
            >
              <Command className="relative overflow-hidden rounded-xl bg-white dark:bg-navy-900 shadow-2xl border border-gold-500/20">
                {/* Header */}
                <div className="flex items-center border-b border-gold-500/10 px-4">
                  <Search className="mr-2 h-5 w-5 shrink-0 text-navy-600 dark:text-gold-400" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Buscar comandos..."
                    className="flex h-14 w-full bg-transparent py-3 text-base outline-none placeholder:text-navy-400 dark:placeholder:text-gold-600 text-navy-900 dark:text-gold-100"
                  />
                  <button
                    onClick={() => setOpen(false)}
                    className="ml-2 p-1 hover:bg-navy-100 dark:hover:bg-navy-800 rounded transition-colors"
                  >
                    <X className="h-5 w-5 text-navy-600 dark:text-gold-400" />
                  </button>
                </div>

                {/* Results */}
                <Command.List className="max-h-[400px] overflow-y-auto p-2">
                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold-500 border-t-transparent" />
                    </div>
                  )}

                  <Command.Empty className="py-8 text-center text-navy-600 dark:text-gold-600">
                    Nenhum resultado encontrado.
                  </Command.Empty>

                  {/* Group items by category */}
                  {['Navegação', 'Ações Rápidas', 'Sistema'].map(group => {
                    const groupItems = allItems.filter(item => item.group === group)
                    if (groupItems.length === 0) return null

                    return (
                      <Command.Group key={group} heading={group} className="px-2 py-2">
                        <div className="text-xs font-semibold text-navy-600 dark:text-gold-500 mb-2">
                          {group}
                        </div>
                        {groupItems.map(item => (
                          <Command.Item
                            key={item.id}
                            value={`${item.label} ${item.keywords?.join(' ') || ''}`}
                            onSelect={() => {
                              if (item.action) {
                                item.action()
                              } else if (item.href) {
                                navigateTo(item.href)
                              }
                            }}
                            className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none hover:bg-navy-100 dark:hover:bg-navy-800 data-[selected]:bg-navy-100 dark:data-[selected]:bg-navy-800 transition-colors"
                          >
                            <div className="mr-3 text-navy-600 dark:text-gold-400">
                              {item.icon}
                            </div>
                            <span className="flex-1 text-navy-900 dark:text-gold-100">
                              {item.label}
                            </span>
                            {item.shortcut && (
                              <kbd className="ml-auto text-xs text-navy-400 dark:text-gold-600">
                                {item.shortcut}
                              </kbd>
                            )}
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )
                  })}
                </Command.List>

                {/* Footer */}
                <div className="border-t border-gold-500/10 px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-navy-600 dark:text-gold-600">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-navy-100 dark:bg-navy-800 rounded">↑↓</kbd>
                        Navegar
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-navy-100 dark:bg-navy-800 rounded">↵</kbd>
                        Selecionar
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-navy-100 dark:bg-navy-800 rounded">esc</kbd>
                        Fechar
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Powered by cmdk</span>
                    </div>
                  </div>
                </div>
              </Command>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}