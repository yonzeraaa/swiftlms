'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  count?: number
  animation?: 'pulse' | 'wave' | 'shimmer'
  children?: ReactNode
}

export default function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
  animation = 'wave',
  children
}: SkeletonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return 'h-4 w-full rounded'
      case 'circular':
        return 'rounded-full'
      case 'rectangular':
        return 'rounded-lg'
      case 'card':
        return 'rounded-xl'
      default:
        return ''
    }
  }

  const getAnimationClass = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse'
      case 'shimmer':
        return 'shimmer-animation'
      case 'wave':
      default:
        return 'skeleton'
    }
  }

  const baseStyles = `
    ${getVariantStyles()}
    ${getAnimationClass()}
    bg-gradient-to-r from-navy-800/50 via-navy-700/50 to-navy-800/50
    ${className}
  `

  const style = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : variant === 'text' ? '16px' : '100px')
  }

  if (children) {
    return (
      <div className={`${baseStyles} relative overflow-hidden`} style={style}>
        <div className="invisible">{children}</div>
        {animation === 'shimmer' && (
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        )}
      </div>
    )
  }

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className={baseStyles}
          style={style}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        />
      ))}
    </>
  )
}

// Skeleton Group Component for Complex Layouts
interface SkeletonGroupProps {
  children: ReactNode
  className?: string
}

export function SkeletonGroup({ children, className = '' }: SkeletonGroupProps) {
  return (
    <motion.div 
      className={`space-y-3 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

// Pre-built Skeleton Templates
export function SkeletonCard() {
  return (
    <div className="bg-navy-800/30 rounded-xl p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton variant="circular" width={60} height={60} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={200} />
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-navy-800/30 rounded-xl p-6">
      <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 pb-3 border-b border-gold-500/20">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="text" height={20} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 py-2">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} variant="text" height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-navy-800/30 rounded-xl p-6">
            <Skeleton variant="text" width="60%" height={14} />
            <Skeleton variant="text" width="40%" height={32} className="mt-2" />
          </div>
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-navy-800/30 rounded-xl p-6">
          <Skeleton variant="text" width="40%" height={24} className="mb-4" />
          <Skeleton variant="rectangular" height={300} />
        </div>
        <div className="bg-navy-800/30 rounded-xl p-6">
          <Skeleton variant="text" width="40%" height={24} className="mb-4" />
          <Skeleton variant="rectangular" height={300} />
        </div>
      </div>
      
      {/* Table */}
      <SkeletonTable />
    </div>
  )
}

// Add shimmer animation to global CSS if not already present
if (typeof window !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
    .shimmer-animation {
      position: relative;
      overflow: hidden;
    }
  `
  if (!document.head.querySelector('style[data-skeleton]')) {
    style.setAttribute('data-skeleton', 'true')
    document.head.appendChild(style)
  }
}