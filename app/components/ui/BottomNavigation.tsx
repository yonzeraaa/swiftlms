'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { 
  Home, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings,
  Plus,
  LucideIcon
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface BottomNavigationProps {
  items?: NavItem[]
  showLabels?: boolean
  showOnDesktop?: boolean
  floatingAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  className?: string
}

const defaultItems: NavItem[] = [
  { id: 'home', label: 'Início', href: '/dashboard', icon: Home },
  { id: 'courses', label: 'Cursos', href: '/dashboard/courses', icon: BookOpen },
  { id: 'users', label: 'Usuários', href: '/dashboard/users', icon: Users },
  { id: 'reports', label: 'Relatórios', href: '/dashboard/reports', icon: BarChart3 },
  { id: 'settings', label: 'Ajustes', href: '/dashboard/settings', icon: Settings }
]

export default function BottomNavigation({
  items = defaultItems,
  showLabels = true,
  showOnDesktop = false,
  floatingAction,
  className = ''
}: BottomNavigationProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Hide/show on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={`
          fixed bottom-0 left-0 right-0 z-40
          bg-navy-900/95 backdrop-blur-lg border-t border-gold-500/30
          transform transition-transform duration-300 ease-out
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}
          ${showOnDesktop ? '' : 'lg:hidden'}
          ${className}
        `}
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="relative">
          {/* Navigation Items */}
          <div className="flex items-center justify-around px-2 py-2">
            {items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`
                    relative flex flex-col items-center justify-center
                    min-w-[64px] px-3 py-2 rounded-lg
                    transition-all duration-200 ease-out
                    ${active 
                      ? 'text-gold bg-gold-500/10' 
                      : 'text-gold-400 hover:text-gold-200 hover:bg-gold-500/5'
                    }
                    group
                  `}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Active Indicator */}
                  {active && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gold-500 rounded-full animate-fade-in" />
                  )}
                  
                  {/* Icon Container */}
                  <div className="relative">
                    <Icon 
                      className={`
                        w-6 h-6 transition-all duration-200
                        ${active ? 'scale-110' : 'group-hover:scale-110'}
                      `}
                    />
                    
                    {/* Badge */}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 
                                     bg-red-500 text-white text-xs font-bold rounded-full
                                     flex items-center justify-center animate-pulse">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  
                  {/* Label */}
                  {showLabels && (
                    <span className={`
                      text-xs mt-1 transition-all duration-200
                      ${active ? 'font-semibold' : 'font-medium'}
                    `}>
                      {item.label}
                    </span>
                  )}
                  
                  {/* Ripple Effect on Tap */}
                  <span className="absolute inset-0 rounded-lg overflow-hidden">
                    <span className="absolute inset-0 bg-gold-500/20 scale-0 group-active:scale-100 transition-transform duration-300 rounded-lg" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Floating Action Button */}
      {floatingAction && (
        <button
          onClick={floatingAction.onClick}
          className={`
            fixed bottom-20 right-4 z-50
            w-14 h-14 rounded-full
            bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900
            shadow-lg shadow-gold-500/30
            flex items-center justify-center
            transform transition-all duration-300 ease-out
            hover:scale-110 hover:shadow-xl hover:shadow-gold-500/40
            active:scale-95
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
            ${showOnDesktop ? '' : 'lg:hidden'}
          `}
          aria-label={floatingAction.label}
        >
          {floatingAction.icon || <Plus className="w-6 h-6" />}
          
          {/* Pulse Animation */}
          <span className="absolute inset-0 rounded-full bg-gold-500 animate-ping opacity-20" />
        </button>
      )}

      {/* Spacer to prevent content from being hidden */}
      <div className={`h-20 ${showOnDesktop ? '' : 'lg:hidden'}`} />
    </>
  )
}

// Tab Bar variant for sectioned content
interface TabBarProps {
  tabs: Array<{
    id: string
    label: string
    icon?: LucideIcon
    count?: number
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
  position?: 'top' | 'bottom'
  className?: string
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  position = 'top',
  className = ''
}: TabBarProps) {
  return (
    <div
      className={`
        ${position === 'bottom' ? 'fixed bottom-0 left-0 right-0 z-40' : ''}
        bg-navy-900/95 backdrop-blur-lg border-${position === 'bottom' ? 't' : 'b'} border-gold-500/30
        ${className}
      `}
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex-1 flex items-center justify-center gap-2
                px-4 py-3 transition-all duration-200
                ${active
                  ? 'text-gold bg-gold-500/10 border-b-2 border-gold-500'
                  : 'text-gold-400 hover:text-gold-200 hover:bg-gold-500/5'
                }
              `}
              aria-label={tab.label}
              aria-selected={active}
              role="tab"
            >
              {Icon && <Icon className="w-5 h-5" />}
              <span className="text-sm font-medium">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-gold-500/20 text-gold text-xs font-bold rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Minimal dock-style navigation
interface DockNavigationProps {
  items: Array<{
    id: string
    icon: LucideIcon
    label: string
    onClick: () => void
  }>
  className?: string
}

export function DockNavigation({ items, className = '' }: DockNavigationProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 p-2
        bg-navy-900/90 backdrop-blur-xl rounded-2xl
        border border-gold-500/30 shadow-2xl
        ${className}
      `}
    >
      {items.map((item, index) => {
        const Icon = item.icon
        const isHovered = hoveredId === item.id
        
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`
              relative p-3 rounded-xl
              text-gold-400 hover:text-gold-200
              transition-all duration-300 ease-out
              ${isHovered ? 'bg-gold-500/20 scale-110' : 'hover:bg-gold-500/10'}
            `}
            style={{
              animationDelay: `${index * 50}ms`
            }}
            aria-label={item.label}
          >
            <Icon className="w-6 h-6" />
            
            {/* Tooltip */}
            {isHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 
                           bg-navy-800 text-gold-200 text-xs rounded-lg whitespace-nowrap
                           border border-gold-500/30 animate-fade-in">
                {item.label}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}