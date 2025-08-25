'use client'

import { motion } from 'framer-motion'

interface PremiumLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

export default function PremiumLoader({ 
  size = 'md', 
  text = 'Carregando...', 
  fullScreen = false 
}: PremiumLoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const Loader = () => (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          className={`${sizeClasses[size]} rounded-full border-4 border-gold-500/20`}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner spinning arc */}
        <motion.div
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-4 border-transparent border-t-gold-500`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Center pulse */}
        <motion.div
          className="absolute inset-2 bg-gold-500/20 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      
      {text && (
        <motion.p
          className="text-gold-500 text-sm font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-navy-950/90 backdrop-blur-sm flex items-center justify-center z-50">
        <Loader />
      </div>
    )
  }

  return <Loader />
}

export function PremiumSkeleton({ 
  className = '', 
  height = 'h-4',
  rounded = 'rounded' 
}: { 
  className?: string
  height?: string
  rounded?: string
}) {
  return (
    <motion.div
      className={`
        ${height} ${rounded} ${className}
        bg-gradient-to-r from-navy-800 via-gold-500/10 to-navy-800
        background-size-200 animate-shimmer
      `}
      animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    />
  )
}