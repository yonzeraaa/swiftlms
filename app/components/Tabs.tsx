'use client'

import { ReactNode, useState, useRef, useEffect } from 'react'

interface Tab {
  id: string
  label: string
  content: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullWidth?: boolean
}

export default function Tabs({
  tabs,
  defaultTab,
  onChange,
  variant = 'default',
  size = 'md',
  className = '',
  fullWidth = false
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const [indicatorStyle, setIndicatorStyle] = useState({})
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  useEffect(() => {
    const activeTabRef = tabRefs.current[activeTab]
    if (activeTabRef && variant === 'underline') {
      setIndicatorStyle({
        left: activeTabRef.offsetLeft,
        width: activeTabRef.offsetWidth
      })
    }
  }, [activeTab, variant])

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (tab && !tab.disabled) {
      setActiveTab(tabId)
      onChange?.(tabId)
    }
  }

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5'
  }

  const getTabStyles = (isActive: boolean, isDisabled: boolean) => {
    const base = `
      relative flex items-center gap-2 font-medium
      transition-all duration-200 focus:outline-none
      ${sizeStyles[size]}
      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${fullWidth ? 'flex-1 justify-center' : ''}
    `

    switch (variant) {
      case 'pills':
        return `
          ${base}
          rounded-lg
          ${isActive 
            ? 'bg-gold-500 text-navy-900 shadow-lg shadow-gold-500/25' 
            : 'text-gold-300 hover:text-gold-200 hover:bg-gold-500/10'
          }
        `
      case 'underline':
        return `
          ${base}
          border-b-2 border-transparent
          ${isActive 
            ? 'text-gold-400' 
            : 'text-gold-300 hover:text-gold-200'
          }
        `
      default:
        return `
          ${base}
          rounded-t-lg
          ${isActive 
            ? 'bg-navy-800 text-gold-400 border-t border-l border-r border-gold-500/30' 
            : 'text-gold-300 hover:text-gold-200 hover:bg-navy-800/50'
          }
        `
    }
  }

  const containerStyles = () => {
    switch (variant) {
      case 'pills':
        return 'flex gap-2 p-1 bg-navy-800/50 rounded-lg'
      case 'underline':
        return 'relative flex border-b border-gold-500/20'
      default:
        return 'flex border-b border-gold-500/20'
    }
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={className}>
      <div className={containerStyles()}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[tab.id] = el }}
            onClick={() => handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={getTabStyles(activeTab === tab.id, !!tab.disabled)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-disabled={tab.disabled}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
        
        {variant === 'underline' && (
          <div
            className="absolute bottom-0 h-0.5 bg-gold-400 transition-all duration-300"
            style={indicatorStyle}
          />
        )}
      </div>

      <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTabContent}
      </div>
    </div>
  )
}

// Simple tab panels component for basic use cases
interface TabPanelProps {
  children: ReactNode
  className?: string
}

export function TabPanel({ children, className = '' }: TabPanelProps) {
  return (
    <div className={`focus:outline-none ${className}`} role="tabpanel">
      {children}
    </div>
  )
}

// Helper component to create tabs more declaratively
interface TabListProps {
  children: ReactNode
  value: string
  onChange: (value: string) => void
  variant?: 'default' | 'pills' | 'underline'
  className?: string
}

interface TabItemProps {
  value: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  children?: never
}

export function TabList({ children, value, onChange, variant = 'default', className = '' }: TabListProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({})
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  useEffect(() => {
    const activeTabRef = tabRefs.current[value]
    if (activeTabRef && variant === 'underline') {
      setIndicatorStyle({
        left: activeTabRef.offsetLeft,
        width: activeTabRef.offsetWidth
      })
    }
  }, [value, variant])

  const containerStyles = () => {
    switch (variant) {
      case 'pills':
        return 'flex gap-2 p-1 bg-navy-800/50 rounded-lg'
      case 'underline':
        return 'relative flex border-b border-gold-500/20'
      default:
        return 'flex border-b border-gold-500/20'
    }
  }

  return (
    <div className={`${containerStyles()} ${className}`} role="tablist">
      {children}
      {variant === 'underline' && (
        <div
          className="absolute bottom-0 h-0.5 bg-gold-400 transition-all duration-300"
          style={indicatorStyle}
        />
      )}
    </div>
  )
}

export function TabItem({ value, label, icon, disabled }: TabItemProps) {
  return null // This component is used for type checking only
}