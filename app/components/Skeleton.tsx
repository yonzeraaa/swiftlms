'use client'

import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
  count?: number
  className?: string
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  count = 1,
  className = '',
  ...props
}: SkeletonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'circular':
        return 'rounded-full'
      case 'rectangular':
        return 'rounded-none'
      case 'rounded':
        return 'rounded-lg'
      default:
        return ''
    }
  }

  const getAnimationStyles = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse'
      case 'wave':
        return 'animate-shimmer'
      case 'none':
        return ''
      default:
        return ''
    }
  }

  const baseStyles = `
    bg-gold-500/10
    ${getVariantStyles()}
    ${getAnimationStyles()}
    ${className}
  `

  const style = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : variant === 'text' ? '1rem' : '20px'),
    ...props.style
  }

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={baseStyles}
            style={{
              ...style,
              width: index === count - 1 && variant === 'text' ? '80%' : style.width
            }}
            {...props}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={baseStyles}
      style={style}
      {...props}
    />
  )
}

// Specialized skeleton components
export function SkeletonText({ lines = 3, ...props }: { lines?: number } & Omit<SkeletonProps, 'count'>) {
  return <Skeleton variant="text" count={lines} {...props} />
}

export function SkeletonAvatar(props: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="circular" {...props} />
}

export function SkeletonCard({ showAvatar = true, lines = 3 }: { showAvatar?: boolean; lines?: number }) {
  return (
    <div className="bg-navy-800/50 rounded-xl p-6 space-y-4">
      {showAvatar && (
        <div className="flex items-center gap-4">
          <SkeletonAvatar width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="50%" height={20} />
            <Skeleton variant="text" width="30%" height={16} />
          </div>
        </div>
      )}
      <SkeletonText lines={lines} />
      <div className="flex gap-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} variant="text" height={20} />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="grid gap-4 py-2" 
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" height={16} />
          ))}
        </div>
      ))}
    </div>
  )
}