'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, BellOff, Check, X, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  createdAt: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

interface NotificationBellProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export default function NotificationBell({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getNotificationStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-500/20 hover:border-green-500/30'
      case 'warning':
        return 'border-yellow-500/20 hover:border-yellow-500/30'
      case 'error':
        return 'border-red-500/20 hover:border-red-500/30'
      default:
        return 'border-blue-500/20 hover:border-blue-500/30'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gold-500/10 transition-colors duration-200"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <Bell className="w-5 h-5 text-gold-400" />
        ) : (
          <BellOff className="w-5 h-5 text-gold-400/50" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[600px] bg-navy-800/95 backdrop-blur-lg rounded-xl border border-gold-500/20 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="sticky top-0 bg-navy-800 border-b border-gold-500/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gold-400">Notificações</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-xs text-gold-300 hover:text-gold-200 transition-colors"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Limpar todas
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[500px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellOff className="w-12 h-12 text-gold-400/30 mx-auto mb-3" />
                <p className="text-gold-300/50">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-gold-500/10">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      relative p-4 transition-all duration-200
                      ${!notification.read ? 'bg-gold-500/5' : ''}
                      hover:bg-gold-500/10 group
                      border-l-2 ${getNotificationStyles(notification.type)}
                    `}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-medium ${!notification.read ? 'text-gold-300' : 'text-gold-400/70'}`}>
                            {notification.title}
                          </h4>
                          <button
                            onClick={() => onDelete(notification.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gold-400/50 hover:text-red-400"
                            aria-label="Delete notification"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <p className="text-sm text-gold-300/60 mt-1">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gold-400/40">
                            {format(notification.createdAt, "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {notification.actionUrl && (
                              <a
                                href={notification.actionUrl}
                                className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
                                onClick={() => {
                                  onMarkAsRead(notification.id)
                                  setIsOpen(false)
                                }}
                              >
                                {notification.actionLabel || 'Ver mais'}
                              </a>
                            )}
                            
                            {!notification.read && (
                              <button
                                onClick={() => onMarkAsRead(notification.id)}
                                className="text-xs text-gold-400/60 hover:text-gold-300 transition-colors flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Marcar como lida
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Hook para gerenciar notificações
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      read: false
    }
    setNotifications(prev => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  }
}