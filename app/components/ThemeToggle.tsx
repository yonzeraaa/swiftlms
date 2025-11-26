'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import Tooltip from './Tooltip'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    const initialTheme = savedTheme || systemTheme
    
    setTheme(initialTheme)
    document.documentElement.classList.toggle('light', initialTheme === 'light')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('light', newTheme === 'light')
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-navy-800/50 animate-pulse" />
    )
  }

  return (
    <Tooltip content={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}>
      <button
        onClick={toggleTheme}
        className="
          relative group
          w-10 h-10 rounded-lg
          bg-navy-800/50 hover:bg-navy-700/50
          border border-gold-500/20 hover:border-gold-500/30
          flex items-center justify-center
          transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-gold-500/40
        "
        aria-label={`Mudar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
      >
        <div className="relative w-6 h-6">
          <Sun 
            className={`
              absolute inset-0 w-6 h-6 text-gold-400
              transform transition-all duration-300
              ${theme === 'light' 
                ? 'opacity-100 rotate-0 scale-100' 
                : 'opacity-0 rotate-180 scale-0'
              }
            `}
          />
          <Moon 
            className={`
              absolute inset-0 w-6 h-6 text-gold-400
              transform transition-all duration-300
              ${theme === 'dark' 
                ? 'opacity-100 rotate-0 scale-100' 
                : 'opacity-0 -rotate-180 scale-0'
              }
            `}
          />
        </div>
        
        {/* Glow effect on hover */}
        <div className="
          absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100
          bg-gradient-to-r from-gold-500/20 to-gold-600/20
          blur-xl transition-opacity duration-300
        " />
      </button>
    </Tooltip>
  )
}

// Hook to use theme in components
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleThemeChange = () => {
      const currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark'
      setTheme(currentTheme)
    }

    // Initial theme
    handleThemeChange()

    // Listen for theme changes
    const observer = new MutationObserver(handleThemeChange)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  return { theme, mounted }
}