'use client'

import { Toaster, toast as hotToast, ToastOptions } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  Loader2,
  X,
  Sparkles,
  Trophy,
  Star
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { ReactNode } from 'react'

// Custom Toast Component
interface CustomToastProps {
  message: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading' | 'achievement'
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

const CustomToast = ({ message, type, icon, action }: CustomToastProps) => {
  const typeConfig = {
    success: {
      bgColor: 'from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      defaultIcon: <CheckCircle className="w-5 h-5" />
    },
    error: {
      bgColor: 'from-red-500/20 to-red-600/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      defaultIcon: <XCircle className="w-5 h-5" />
    },
    warning: {
      bgColor: 'from-yellow-500/20 to-yellow-600/10',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      defaultIcon: <AlertCircle className="w-5 h-5" />
    },
    info: {
      bgColor: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      defaultIcon: <Info className="w-5 h-5" />
    },
    loading: {
      bgColor: 'from-gold-500/20 to-gold-600/10',
      borderColor: 'border-gold-500/30',
      textColor: 'text-gold-400',
      defaultIcon: <Loader2 className="w-5 h-5 animate-spin" />
    },
    achievement: {
      bgColor: 'from-gold-500/30 to-gold-600/20',
      borderColor: 'border-gold-500/50',
      textColor: 'text-gold-300',
      defaultIcon: <Trophy className="w-5 h-5" />
    }
  }

  const config = typeConfig[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        bg-gradient-to-r ${config.bgColor}
        border ${config.borderColor}
        backdrop-blur-xl shadow-2xl
        min-w-[300px] max-w-[500px]
      `}
    >
      <div className={`flex-shrink-0 ${config.textColor}`}>
        {icon || config.defaultIcon}
      </div>
      
      <div className="flex-1">
        <p className="text-sm font-medium text-white">
          {message}
        </p>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="flex-shrink-0 px-3 py-1 text-xs font-medium text-gold-300 
                   bg-gold-500/20 hover:bg-gold-500/30 rounded-lg 
                   transition-colors duration-200"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}

// Toast Functions
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    hotToast.custom(
      (t) => <CustomToast message={message} type="success" />,
      {
        duration: 4000,
        ...options
      }
    )
  },

  error: (message: string, options?: ToastOptions) => {
    hotToast.custom(
      (t) => <CustomToast message={message} type="error" />,
      {
        duration: 5000,
        ...options
      }
    )
  },

  warning: (message: string, options?: ToastOptions) => {
    hotToast.custom(
      (t) => <CustomToast message={message} type="warning" />,
      {
        duration: 4500,
        ...options
      }
    )
  },

  info: (message: string, options?: ToastOptions) => {
    hotToast.custom(
      (t) => <CustomToast message={message} type="info" />,
      {
        duration: 4000,
        ...options
      }
    )
  },

  loading: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => <CustomToast message={message} type="loading" />,
      {
        duration: Infinity,
        ...options
      }
    )
  },

  achievement: (message: string, options?: ToastOptions) => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00CED1']
    })

    hotToast.custom(
      (t) => (
        <CustomToast 
          message={message} 
          type="achievement"
          icon={<Trophy className="w-6 h-6 text-gold-400" />}
        />
      ),
      {
        duration: 6000,
        ...options
      }
    )
  },

  promise: <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: any) => string)
    },
    options?: ToastOptions
  ) => {
    return hotToast.promise(
      promise,
      {
        loading: <CustomToast message={msgs.loading} type="loading" />,
        success: (data) => (
          <CustomToast 
            message={typeof msgs.success === 'function' ? msgs.success(data) : msgs.success} 
            type="success" 
          />
        ),
        error: (err) => (
          <CustomToast 
            message={typeof msgs.error === 'function' ? msgs.error(err) : msgs.error} 
            type="error" 
          />
        )
      },
      options
    )
  },

  dismiss: (toastId?: string) => {
    hotToast.dismiss(toastId)
  }
}

// Special Toast Functions
export const showLevelUp = (level: number) => {
  // Multiple confetti bursts
  const count = 200
  const defaults = {
    origin: { y: 0.7 }
  }

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    })
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  })
  fire(0.2, {
    spread: 60,
  })
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  })

  hotToast.custom(
    (t) => (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex items-center gap-4 px-6 py-4 rounded-2xl
                 bg-gradient-to-r from-gold-500/30 to-gold-600/20
                 border-2 border-gold-500/50 backdrop-blur-xl shadow-2xl"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Star className="w-8 h-8 text-gold-400" fill="currentColor" />
          </motion.div>
          <div className="absolute -top-1 -right-1 text-xs font-bold text-white 
                        bg-gold-500 rounded-full w-5 h-5 flex items-center justify-center">
            {level}
          </div>
        </div>
        <div>
          <p className="text-lg font-bold text-gold-200">Level Up!</p>
          <p className="text-sm text-gold-300">Você alcançou o nível {level}</p>
        </div>
      </motion.div>
    ),
    {
      duration: 7000,
      position: 'top-center'
    }
  )
}

export const showStreak = (days: number) => {
  // Fire emoji animation
  const fireEmojis = ['🔥', '✨', '⭐', '💫', '🌟']
  
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.8 },
    shapes: ['circle', 'square'],
    colors: ['#FFD700', '#FF6347', '#FFA500']
  })

  hotToast.custom(
    (t) => (
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        className="flex items-center gap-3 px-5 py-3 rounded-xl
                 bg-gradient-to-r from-orange-500/20 to-red-500/20
                 border border-orange-500/30 backdrop-blur-xl"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-2xl"
        >
          🔥
        </motion.div>
        <div>
          <p className="text-sm font-bold text-orange-300">
            {days} dias de sequência!
          </p>
          <p className="text-xs text-orange-200">
            Continue assim! 💪
          </p>
        </div>
      </motion.div>
    ),
    {
      duration: 5000,
      position: 'bottom-right'
    }
  )
}

// Toast Provider Component
export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      toastOptions={{
        className: '',
        style: {
          background: 'transparent',
          color: '#fff',
          boxShadow: 'none',
          padding: 0,
          margin: 0
        }
      }}
    />
  )
}