'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Loader2,
} from 'lucide-react'

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading'
export type NotificationPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface NotificationOptions {
  id?: string
  title?: string
  message: string
  type?: NotificationType
  duration?: number
  position?: NotificationPosition
  persistent?: boolean
  closable?: boolean
  icon?: React.ReactNode
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'ghost'
  }>
  onClose?: () => void
  sound?: boolean
  vibrate?: boolean
  progress?: boolean
}

interface NotificationItem extends Required<Omit<NotificationOptions, 'sound' | 'vibrate'>> {
  id: string
  createdAt: number
}

// Notification Context
interface NotificationContextValue {
  notifications: NotificationItem[]
  notify: (options: NotificationOptions) => string
  dismiss: (id: string) => void
  dismissAll: () => void
  updateNotification: (id: string, options: Partial<NotificationOptions>) => void
  pauseNotification: (id: string) => void
  resumeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

// Notification Provider
interface NotificationProviderProps {
  children: React.ReactNode
  maxNotifications?: number
  defaultPosition?: NotificationPosition
  defaultDuration?: number
  soundEnabled?: boolean
  vibrateEnabled?: boolean
}

export function NotificationProvider({
  children,
  maxNotifications = 5,
  defaultPosition = 'top-right',
  defaultDuration = 5000,
  soundEnabled = true,
  vibrateEnabled = true,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [pausedNotifications, setPausedNotifications] = useState<Set<string>>(new Set())

  const playSound = (type: NotificationType) => {
    if (!soundEnabled) return
    
    // Play different sounds based on notification type
    const audio = new Audio()
    switch (type) {
      case 'success':
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCCl+0Oy9diMFl2+z'
        break
      case 'error':
        audio.src = 'data:audio/wav;base64,UklGRhwGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAADy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy'
        break
      default:
        audio.src = 'data:audio/wav;base64,UklGRnIGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'
    }
    audio.volume = 0.3
    audio.play().catch(() => {})
  }

  const vibrate = () => {
    if (!vibrateEnabled) return
    if ('vibrate' in navigator) {
      navigator.vibrate(200)
    }
  }

  const notify = (options: NotificationOptions): string => {
    const id = options.id || `notification-${Date.now()}-${Math.random()}`
    
    const notification: NotificationItem = {
      id,
      title: options.title || '',
      message: options.message,
      type: options.type || 'info',
      duration: options.duration !== undefined ? options.duration : defaultDuration,
      position: options.position || defaultPosition,
      persistent: options.persistent || false,
      closable: options.closable !== false,
      icon: options.icon || null,
      actions: options.actions || [],
      onClose: options.onClose || (() => {}),
      progress: options.progress !== false,
      createdAt: Date.now(),
    }

    setNotifications((prev) => {
      const filtered = prev.filter((n) => n.id !== id)
      const newNotifications = [notification, ...filtered]
      return newNotifications.slice(0, maxNotifications)
    })

    if (options.sound !== false) {
      playSound(notification.type)
    }

    if (options.vibrate !== false) {
      vibrate()
    }

    return id
  }

  const dismiss = (id: string) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id)
      if (notification?.onClose) {
        notification.onClose()
      }
      return prev.filter((n) => n.id !== id)
    })
  }

  const dismissAll = () => {
    notifications.forEach((n) => {
      if (n.onClose) n.onClose()
    })
    setNotifications([])
  }

  const updateNotification = (id: string, options: Partial<NotificationOptions>) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              ...options,
              id,
              createdAt: n.createdAt,
            }
          : n
      )
    )
  }

  const pauseNotification = (id: string) => {
    setPausedNotifications((prev) => new Set(prev).add(id))
  }

  const resumeNotification = (id: string) => {
    setPausedNotifications((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // Auto-dismiss notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setNotifications((prev) =>
        prev.filter((notification) => {
          if (notification.persistent || pausedNotifications.has(notification.id)) {
            return true
          }
          if (notification.duration === 0) {
            return true
          }
          const elapsed = now - notification.createdAt
          return elapsed < notification.duration
        })
      )
    }, 100)

    return () => clearInterval(interval)
  }, [pausedNotifications])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        notify,
        dismiss,
        dismissAll,
        updateNotification,
        pauseNotification,
        resumeNotification,
      }}
    >
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

// Notification Container
function NotificationContainer() {
  const { notifications } = useNotification()

  const positions: Record<NotificationPosition, string> = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  }

  const groupedNotifications = notifications.reduce((acc, notification) => {
    if (!acc[notification.position]) {
      acc[notification.position] = []
    }
    acc[notification.position].push(notification)
    return acc
  }, {} as Record<NotificationPosition, NotificationItem[]>)

  return (
    <>
      {Object.entries(groupedNotifications).map(([position, items]) => (
        <div
          key={position}
          className={`fixed z-[9999] ${positions[position as NotificationPosition]} pointer-events-none`}
        >
          <AnimatePresence>
            {items.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </>
  )
}

// Notification Item Component
interface NotificationItemProps {
  notification: NotificationItem
  index: number
}

function NotificationItem({ notification, index }: NotificationItemProps) {
  const { dismiss, pauseNotification, resumeNotification } = useNotification()
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (notification.persistent || notification.duration === 0 || !notification.progress) {
      return
    }

    if (isPaused) {
      return
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (100 / (notification.duration / 100))
        if (next <= 0) {
          dismiss(notification.id)
          return 0
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
  }, [notification, isPaused, dismiss])

  const handleMouseEnter = () => {
    setIsPaused(true)
    pauseNotification(notification.id)
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
    resumeNotification(notification.id)
  }

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success-500" />,
    error: <XCircle className="w-5 h-5 text-error-500" />,
    warning: <AlertCircle className="w-5 h-5 text-warning-500" />,
    info: <Info className="w-5 h-5 text-info-500" />,
    loading: <Loader2 className="w-5 h-5 text-info-500 animate-spin" />,
  }

  const colors = {
    success: 'bg-success-50 dark:bg-success-900/20 border-success-500/20',
    error: 'bg-error-50 dark:bg-error-900/20 border-error-500/20',
    warning: 'bg-warning-50 dark:bg-warning-900/20 border-warning-500/20',
    info: 'bg-info-50 dark:bg-info-900/20 border-info-500/20',
    loading: 'bg-info-50 dark:bg-info-900/20 border-info-500/20',
  }

  const progressColors = {
    success: 'bg-success-500',
    error: 'bg-error-500',
    warning: 'bg-warning-500',
    info: 'bg-info-500',
    loading: 'bg-info-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: index * 10, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        relative w-96 max-w-[90vw] mb-4 p-4 rounded-lg border-2 shadow-elevation-3
        ${colors[notification.type]}
        pointer-events-auto
      `}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {notification.icon || icons[notification.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {notification.title && (
            <h3 className="text-sm font-semibold text-navy-900 dark:text-gold-100 mb-1">
              {notification.title}
            </h3>
          )}
          <p className="text-sm text-navy-700 dark:text-gold-300">
            {notification.message}
          </p>

          {/* Actions */}
          {notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action, idx) => {
                const variants = {
                  primary: 'bg-gold-500 hover:bg-gold-600 text-navy-900',
                  secondary: 'bg-navy-600 hover:bg-navy-700 text-gold-100',
                  ghost: 'hover:bg-navy-100 dark:hover:bg-navy-800 text-navy-700 dark:text-gold-300',
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      action.onClick()
                      if (!notification.persistent) {
                        dismiss(notification.id)
                      }
                    }}
                    className={`
                      px-3 py-1 text-xs font-medium rounded
                      transition-colors duration-200
                      ${variants[action.variant || 'ghost']}
                    `}
                  >
                    {action.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Close button */}
        {notification.closable && (
          <button
            onClick={() => dismiss(notification.id)}
            className="flex-shrink-0 p-1 rounded hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
          >
            <X className="w-4 h-4 text-navy-600 dark:text-gold-400" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {notification.progress && !notification.persistent && notification.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-navy-200 dark:bg-navy-800 rounded-b-lg overflow-hidden">
          <motion.div
            className={`h-full ${progressColors[notification.type]}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  )
}

// Notification Bell Component (for notification center)
interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { notifications } = useNotification()
  const [isOpen, setIsOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const unreadCount = notifications.length

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success-500" />,
    error: <XCircle className="w-5 h-5 text-error-500" />,
    warning: <AlertCircle className="w-5 h-5 text-warning-500" />,
    info: <Info className="w-5 h-5 text-info-500" />,
    loading: <Loader2 className="w-5 h-5 text-info-500 animate-spin" />,
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors ${className}`}
      >
        {isMuted ? (
          <BellOff className="w-5 h-5 text-navy-600 dark:text-gold-400" />
        ) : (
          <Bell className="w-5 h-5 text-navy-600 dark:text-gold-400" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-white dark:bg-navy-900 rounded-lg shadow-elevation-4 border-2 border-gold-500/20"
          >
            <div className="p-4 border-b border-gold-500/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-gold-100">
                  Notificações ({unreadCount})
                </h3>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 rounded hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-navy-600 dark:text-gold-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-navy-600 dark:text-gold-400" />
                  )}
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-navy-300 dark:text-navy-700 mx-auto mb-3" />
                <p className="text-sm text-navy-600 dark:text-gold-600">
                  Nenhuma notificação
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gold-500/10">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-navy-50 dark:hover:bg-navy-800/50">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        {notification.icon || icons[notification.type]}
                      </div>
                      <div className="flex-1">
                        {notification.title && (
                          <h4 className="text-sm font-medium text-navy-900 dark:text-gold-100">
                            {notification.title}
                          </h4>
                        )}
                        <p className="text-xs text-navy-600 dark:text-gold-600 mt-1">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}