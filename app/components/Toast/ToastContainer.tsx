'use client'

import type { Toast } from './ToastContext'
import ToastItem from './ToastItem'

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: string) => void
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
