'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { Toast, ToastType } from './ToastContext'

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

const toastStyles: Record<ToastType, string> = {
  success: 'bg-green-500/20 border-green-500/30 text-green-400',
  error: 'bg-red-500/20 border-red-500/30 text-red-400',
  warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  info: 'bg-blue-500/20 border-blue-500/30 text-blue-400'
}

export default function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [isEntering, setIsEntering] = useState(true)
  const Icon = toastIcons[toast.type]

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 300) // Wait for animation to complete
  }

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => {
      setIsEntering(false)
    }, 10)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      id={`toast-${toast.id}`}
      className={`
        pointer-events-auto min-w-[300px] max-w-md
        transform transition-all duration-300 ease-out
        ${isEntering ? 'translate-x-full opacity-0' : 
          isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div
        className={`
          flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm
          ${toastStyles[toast.type]}
          shadow-2xl bg-navy-800
        `}
      >
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{toast.title}</h4>
          {toast.message && (
            <p className="text-sm mt-1 opacity-90">{toast.message}</p>
          )}
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}