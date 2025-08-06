'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { motion } from 'framer-motion'
import {
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Type,
  Palette,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Accessibility,
  Settings,
} from 'lucide-react'

// Accessibility Context
interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  contrast: 'normal' | 'high' | 'highest'
  reducedMotion: boolean
  screenReader: boolean
  keyboardNav: boolean
  focusIndicator: boolean
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome'
  readingMode: boolean
  darkMode: boolean
  soundEnabled: boolean
  captions: boolean
}

interface AccessibilityContextValue {
  settings: AccessibilitySettings
  updateSettings: (settings: Partial<AccessibilitySettings>) => void
  resetSettings: () => void
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 'medium',
  contrast: 'normal',
  reducedMotion: false,
  screenReader: false,
  keyboardNav: true,
  focusIndicator: true,
  colorBlindMode: 'none',
  readingMode: false,
  darkMode: false,
  soundEnabled: true,
  captions: false,
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined)

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider')
  }
  return context
}

// Accessibility Provider
interface AccessibilityProviderProps {
  children: React.ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-settings')
      return saved ? JSON.parse(saved) : defaultSettings
    }
    return defaultSettings
  })

  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings))
    applySettings(settings)
  }, [settings])

  const applySettings = (settings: AccessibilitySettings) => {
    const root = document.documentElement

    // Font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'extra-large': '20px',
    }
    root.style.fontSize = fontSizes[settings.fontSize]

    // Contrast
    if (settings.contrast === 'high') {
      root.classList.add('high-contrast')
    } else if (settings.contrast === 'highest') {
      root.classList.add('highest-contrast')
    } else {
      root.classList.remove('high-contrast', 'highest-contrast')
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Color blind modes
    root.classList.remove(
      'protanopia',
      'deuteranopia',
      'tritanopia',
      'monochrome'
    )
    if (settings.colorBlindMode !== 'none') {
      root.classList.add(settings.colorBlindMode)
    }

    // Reading mode
    if (settings.readingMode) {
      root.classList.add('reading-mode')
    } else {
      root.classList.remove('reading-mode')
    }

    // Dark mode
    if (settings.darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Focus indicator
    if (settings.focusIndicator) {
      root.classList.add('focus-visible')
    } else {
      root.classList.remove('focus-visible')
    }
  }

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
      <AccessibilityToolbar />
    </AccessibilityContext.Provider>
  )
}

// Accessibility Toolbar
function AccessibilityToolbar() {
  const { settings, updateSettings } = useAccessibility()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-50 p-3 bg-gold-500 text-navy-900 rounded-full shadow-elevation-3 hover:shadow-elevation-4 transition-shadow"
        aria-label="Acessibilidade"
      >
        <Accessibility className="w-6 h-6" />
      </button>

      {/* Toolbar Panel */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed left-4 bottom-20 z-50 w-80 bg-white dark:bg-navy-900 rounded-lg shadow-elevation-4 border-2 border-gold-500/20 p-4"
        >
          <h3 className="text-lg font-semibold text-navy-900 dark:text-gold-100 mb-4">
            Acessibilidade
          </h3>

          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="text-sm font-medium text-navy-700 dark:text-gold-300 mb-2 block">
                Tamanho da Fonte
              </label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ fontSize: size })}
                    className={`
                      px-3 py-1 rounded text-sm transition-colors
                      ${settings.fontSize === size
                        ? 'bg-gold-500 text-navy-900'
                        : 'bg-navy-100 dark:bg-navy-800 text-navy-700 dark:text-gold-300 hover:bg-navy-200 dark:hover:bg-navy-700'
                      }
                    `}
                  >
                    {size === 'small' && 'P'}
                    {size === 'medium' && 'M'}
                    {size === 'large' && 'G'}
                    {size === 'extra-large' && 'GG'}
                  </button>
                ))}
              </div>
            </div>

            {/* Contrast */}
            <div>
              <label className="text-sm font-medium text-navy-700 dark:text-gold-300 mb-2 block">
                Contraste
              </label>
              <div className="flex gap-2">
                {(['normal', 'high', 'highest'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => updateSettings({ contrast: level })}
                    className={`
                      px-3 py-1 rounded text-sm transition-colors
                      ${settings.contrast === level
                        ? 'bg-gold-500 text-navy-900'
                        : 'bg-navy-100 dark:bg-navy-800 text-navy-700 dark:text-gold-300 hover:bg-navy-200 dark:hover:bg-navy-700'
                      }
                    `}
                  >
                    {level === 'normal' && 'Normal'}
                    {level === 'high' && 'Alto'}
                    {level === 'highest' && 'Máximo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Blind Mode */}
            <div>
              <label className="text-sm font-medium text-navy-700 dark:text-gold-300 mb-2 block">
                Modo Daltonismo
              </label>
              <select
                value={settings.colorBlindMode}
                onChange={(e) => updateSettings({ colorBlindMode: e.target.value as any })}
                className="w-full px-3 py-2 rounded border-2 border-navy-700/30 dark:border-gold-500/20 bg-white dark:bg-navy-900 text-navy-900 dark:text-gold-100"
              >
                <option value="none">Nenhum</option>
                <option value="protanopia">Protanopia</option>
                <option value="deuteranopia">Deuteranopia</option>
                <option value="tritanopia">Tritanopia</option>
                <option value="monochrome">Monocromático</option>
              </select>
            </div>

            {/* Toggle Options */}
            <div className="space-y-2">
              <ToggleOption
                label="Modo Escuro"
                icon={settings.darkMode ? <Moon /> : <Sun />}
                checked={settings.darkMode}
                onChange={(checked) => updateSettings({ darkMode: checked })}
              />
              
              <ToggleOption
                label="Reduzir Movimento"
                icon={<Eye />}
                checked={settings.reducedMotion}
                onChange={(checked) => updateSettings({ reducedMotion: checked })}
              />
              
              <ToggleOption
                label="Modo Leitura"
                icon={<Type />}
                checked={settings.readingMode}
                onChange={(checked) => updateSettings({ readingMode: checked })}
              />
              
              <ToggleOption
                label="Indicador de Foco"
                icon={<Eye />}
                checked={settings.focusIndicator}
                onChange={(checked) => updateSettings({ focusIndicator: checked })}
              />
              
              <ToggleOption
                label="Som"
                icon={settings.soundEnabled ? <Volume2 /> : <VolumeX />}
                checked={settings.soundEnabled}
                onChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
              
              <ToggleOption
                label="Legendas"
                icon={<Type />}
                checked={settings.captions}
                onChange={(checked) => updateSettings({ captions: checked })}
              />
            </div>
          </div>
        </motion.div>
      )}
    </>
  )
}

// Toggle Option Component
interface ToggleOptionProps {
  label: string
  icon: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleOption({ label, icon, checked, onChange }: ToggleOptionProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 text-navy-600 dark:text-gold-400">{icon}</span>
        <span className="text-sm text-navy-700 dark:text-gold-300">{label}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-11 h-6 rounded-full transition-colors
          ${checked ? 'bg-gold-500' : 'bg-navy-300 dark:bg-navy-700'}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </label>
  )
}

// Skip to Content Link
export function SkipToContent({ target = '#main-content' }: { target?: string }) {
  return (
    <a
      href={target}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-gold-500 text-navy-900 rounded-lg font-medium"
    >
      Pular para o conteúdo principal
    </a>
  )
}

// Screen Reader Only Text
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}

// Focus Trap Component
interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
}

export function FocusTrap({ children, active = true }: FocusTrapProps) {
  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active])

  return <>{children}</>
}

// Announce Component (for screen readers)
export function Announce({ message, priority = 'polite' }: { message: string; priority?: 'polite' | 'assertive' }) {
  useEffect(() => {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    return () => {
      document.body.removeChild(announcement)
    }
  }, [message, priority])

  return null
}

// Keyboard Shortcuts Provider
interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  handler: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey
        const altMatch = shortcut.alt ? e.altKey : !e.altKey
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          altMatch &&
          shiftMatch
        ) {
          e.preventDefault()
          shortcut.handler()
        }
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}