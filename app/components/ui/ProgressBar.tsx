'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  color?: 'gold' | 'navy' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  className?: string
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = 'gold',
  size = 'md',
  animate = true,
  className = ''
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const colorClasses = {
    gold: 'bg-gradient-to-r from-gold-400 to-gold-600',
    navy: 'bg-gradient-to-r from-navy-400 to-navy-600',
    success: 'bg-gradient-to-r from-green-400 to-green-600',
    warning: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
    error: 'bg-gradient-to-r from-red-400 to-red-600'
  }

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={`font-medium text-gold-300 ${textSizeClasses[size]}`}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={`font-semibold text-gold ${textSizeClasses[size]}`}>
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-navy-800/50 rounded-full overflow-hidden border border-gold-500/20 ${sizeClasses[size]}`}>
        <motion.div
          className={`h-full ${colorClasses[color]} rounded-full relative overflow-hidden`}
          initial={animate ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: animate ? 1 : 0,
            ease: "easeOut"
          }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </motion.div>
      </div>
    </div>
  )
}