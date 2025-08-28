'use client'

import { createContext, useContext, ReactNode } from 'react'
import { toast as hotToast, Toaster } from 'react-hot-toast'

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = (message: string) => {
    if (message.toLowerCase().includes('erro') || message.toLowerCase().includes('error')) {
      hotToast.error(message)
    } else if (message.toLowerCase().includes('sucesso') || message.toLowerCase().includes('success')) {
      hotToast.success(message)
    } else {
      hotToast(message)
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#003366',
            color: '#FFD700',
            border: '2px solid #FFD700'
          },
          success: {
            style: {
              background: '#003366',
              color: '#FFD700',
              border: '2px solid #FFD700'
            }
          },
          error: {
            style: {
              background: '#8B0000',
              color: '#FFD700',
              border: '2px solid #FFD700'
            }
          }
        }}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Se não houver provider, retorna uma função que usa hotToast diretamente
    return {
      showToast: (message: string) => {
        if (message.toLowerCase().includes('erro') || message.toLowerCase().includes('error')) {
          hotToast.error(message)
        } else if (message.toLowerCase().includes('sucesso') || message.toLowerCase().includes('success')) {
          hotToast.success(message)
        } else {
          hotToast(message)
        }
      }
    }
  }
  return context
}