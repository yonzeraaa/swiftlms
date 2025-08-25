'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react'
import { ReactNode, useEffect, useState } from 'react'

// Toast Notification Component
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  position = 'top-right'
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  }

  const colors = {
    success: 'bg-green-500/20 border-green-500 text-green-400',
    error: 'bg-red-500/20 border-red-500 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    info: 'bg-blue-500/20 border-blue-500 text-blue-400'
  }

  const positions = {
    'top': 'top-4 left-1/2 -translate-x-1/2',
    'bottom': 'bottom-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className={`fixed ${positions[position]} z-50 flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm ${colors[type]}`}
        >
          {icons[type]}
          <span className="font-medium">{message}</span>
          <button
            onClick={() => {
              setIsVisible(false)
              onClose?.()
            }}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Tooltip Component
interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 0
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setTimeout(() => setIsVisible(true), delay)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute ${positions[position]} px-2 py-1 text-xs font-medium text-gold-200 bg-navy-800 border border-gold-500/30 rounded-md whitespace-nowrap z-50 pointer-events-none`}
          >
            {content}
            <div
              className={`absolute w-2 h-2 bg-navy-800 border-gold-500/30 rotate-45 ${
                position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b' :
                position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t' :
                position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t border-r' :
                'right-full top-1/2 -translate-y-1/2 -mr-1 border-b border-l'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Progress Feedback Component
interface ProgressFeedbackProps {
  progress: number
  showPercentage?: boolean
  color?: string
  height?: number
}

export function ProgressFeedback({
  progress,
  showPercentage = true,
  color = 'gold',
  height = 8
}: ProgressFeedbackProps) {
  return (
    <div className="relative">
      <div 
        className="w-full bg-navy-800/50 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <motion.div
          className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-600 rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {showPercentage && (
        <motion.span
          className="absolute -top-6 text-xs text-gold-300 font-medium"
          style={{ left: `${progress}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {progress}%
        </motion.span>
      )}
    </div>
  )
}

// Success Animation Component
interface SuccessAnimationProps {
  show: boolean
  message?: string
  onComplete?: () => void
}

export function SuccessAnimation({
  show,
  message = 'Sucesso!',
  onComplete
}: SuccessAnimationProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          <motion.div
            className="bg-green-500/20 backdrop-blur-sm rounded-full p-8 border-2 border-green-500"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1]
            }}
            transition={{
              duration: 0.6,
              repeat: 2,
              repeatType: 'reverse'
            }}
          >
            <Check className="w-16 h-16 text-green-400" />
          </motion.div>
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-1/3 text-green-400 font-semibold text-lg"
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Ripple Effect Hook
export function useRipple() {
  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget
    const ripple = document.createElement('span')
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    ripple.classList.add('ripple')

    button.appendChild(ripple)

    setTimeout(() => {
      ripple.remove()
    }, 600)
  }

  return { createRipple }
}

// Pulse Animation Component
interface PulseProps {
  children: ReactNode
  color?: string
  duration?: number
}

export function Pulse({
  children,
  color = 'gold',
  duration = 2
}: PulseProps) {
  return (
    <motion.div
      className="relative inline-block"
      animate={{
        scale: [1, 1.05, 1]
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: 'loop'
      }}
    >
      {children}
      <motion.div
        className={`absolute inset-0 rounded-full bg-${color}-500/20`}
        animate={{
          scale: [1, 1.5, 2],
          opacity: [0.4, 0.2, 0]
        }}
        transition={{
          duration,
          repeat: Infinity,
          repeatType: 'loop'
        }}
      />
    </motion.div>
  )
}