'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'gold' | 'navy' | 'white'
  className?: string
}

export function Spinner({ size = 'md', color = 'gold', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const colorClasses = {
    gold: 'text-gold-500',
    navy: 'text-navy-500',
    white: 'text-white'
  }

  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`} 
    />
  )
}

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({ 
  className = '', 
  variant = 'text',
  animation = 'pulse' 
}: SkeletonProps) {
  const baseClasses = 'bg-navy-700/50 dark:bg-navy-800/50'
  
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-lg'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'relative overflow-hidden',
    none: ''
  }

  const getVariantSize = () => {
    switch (variant) {
      case 'circular':
        return 'w-12 h-12'
      case 'card':
        return 'w-full h-48'
      case 'rectangular':
        return 'w-full h-24'
      default:
        return ''
    }
  }

  return (
    <div 
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${getVariantSize()}
        ${animationClasses[animation]}
        ${className}
      `}
    >
      {animation === 'wave' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-500/10 to-transparent animate-shimmer" />
      )}
    </div>
  )
}

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'gold' | 'navy' | 'white'
}

export function LoadingDots({ size = 'md', color = 'gold' }: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const colorClasses = {
    gold: 'bg-gold-500',
    navy: 'bg-navy-500',
    white: 'bg-white'
  }

  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.2,
          }}
        />
      ))}
    </div>
  )
}

interface LoadingCardProps {
  showAvatar?: boolean
  lines?: number
}

export function LoadingCard({ showAvatar = true, lines = 3 }: LoadingCardProps) {
  return (
    <div className="w-full p-6 bg-navy-900/50 border border-gold-500/20 rounded-lg space-y-4">
      {showAvatar && (
        <div className="flex items-center space-x-4">
          <Skeleton variant="circular" className="w-12 h-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton 
            key={index} 
            className={`h-3 ${index === lines - 1 ? 'w-4/5' : 'w-full'}`} 
          />
        ))}
      </div>
      
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  )
}

interface ProgressLoaderProps {
  progress: number
  message?: string
  showPercentage?: boolean
}

export function ProgressLoader({ 
  progress, 
  message = 'Carregando...', 
  showPercentage = true 
}: ProgressLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative">
        <svg className="w-20 h-20">
          <circle
            className="text-navy-700"
            strokeWidth="4"
            stroke="currentColor"
            fill="transparent"
            r="36"
            cx="40"
            cy="40"
          />
          <motion.circle
            className="text-gold-500"
            strokeWidth="4"
            stroke="currentColor"
            fill="transparent"
            r="36"
            cx="40"
            cy="40"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress / 100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{
              strokeDasharray: '226',
              strokeDashoffset: 0,
              transform: 'rotate(-90deg)',
              transformOrigin: 'center'
            }}
          />
        </svg>
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gold">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
      
      {message && (
        <p className="text-gold-300 text-sm font-medium">
          {message}
        </p>
      )}
    </div>
  )
}

interface LoadingOverlayProps {
  message?: string
  fullScreen?: boolean
}

export function LoadingOverlay({ 
  message = 'Processando...', 
  fullScreen = false 
}: LoadingOverlayProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50'
    : 'absolute inset-0 z-40'

  return (
    <motion.div
      className={`${containerClasses} flex items-center justify-center bg-navy-900/80 backdrop-blur-sm`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="bg-navy-800 border border-gold-500/30 rounded-lg p-6 shadow-2xl">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <p className="text-gold-300 font-medium">{message}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default {
  Spinner,
  Skeleton,
  LoadingDots,
  LoadingCard,
  ProgressLoader,
  LoadingOverlay
}