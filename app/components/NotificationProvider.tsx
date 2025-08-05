'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useNotifications } from './NotificationBell'
import { useRouter } from 'next/navigation'

interface NotificationContextType {
  notifications: ReturnType<typeof useNotifications>['notifications']
  addNotification: ReturnType<typeof useNotifications>['addNotification']
  markAsRead: ReturnType<typeof useNotifications>['markAsRead']
  markAllAsRead: ReturnType<typeof useNotifications>['markAllAsRead']
  deleteNotification: ReturnType<typeof useNotifications>['deleteNotification']
  clearAll: ReturnType<typeof useNotifications>['clearAll']
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
  supabaseUrl?: string
  supabaseAnonKey?: string
  userId?: string
}

export function NotificationProvider({ 
  children, 
  supabaseUrl, 
  supabaseAnonKey,
  userId 
}: NotificationProviderProps) {
  const notificationHelpers = useNotifications()
  const router = useRouter()

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || !userId) return

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new
          notificationHelpers.addNotification({
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info',
            actionUrl: notification.action_url,
            actionLabel: notification.action_label
          })
        }
      )
      .subscribe()

    // Load existing notifications
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data && !error) {
        data.forEach(notification => {
          notificationHelpers.addNotification({
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info',
            actionUrl: notification.action_url,
            actionLabel: notification.action_label
          })
        })
      }
    }

    loadNotifications()

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabaseUrl, supabaseAnonKey, userId])

  // Example notifications for different events
  useEffect(() => {
    // Simulate different notification types
    const exampleNotifications = [
      {
        title: 'Novo curso disponível',
        message: 'O curso "React Avançado" está disponível para matrícula.',
        type: 'info' as const,
        actionUrl: '/dashboard/courses',
        actionLabel: 'Ver curso'
      },
      {
        title: 'Aula concluída',
        message: 'Parabéns! Você concluiu a aula "Introdução ao TypeScript".',
        type: 'success' as const
      },
      {
        title: 'Prazo se aproximando',
        message: 'Você tem 2 dias para completar a atividade "Projeto Final".',
        type: 'warning' as const,
        actionUrl: '/dashboard/activities',
        actionLabel: 'Ver atividade'
      }
    ]

    // Add example notifications on mount (remove this in production)
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        exampleNotifications.forEach((notification, index) => {
          setTimeout(() => {
            notificationHelpers.addNotification(notification)
          }, index * 1000)
        })
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <NotificationContext.Provider value={notificationHelpers}>
      {children}
    </NotificationContext.Provider>
  )
}