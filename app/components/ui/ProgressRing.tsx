'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface ProgressRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  label?: string
  showValue?: boolean
  gradient?: boolean
  animated?: boolean
  className?: string
  color?: 'gold' | 'blue' | 'green' | 'purple' | 'red'
}

export default function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  label,
  showValue = true,
  gradient = true,
  animated = true,
  className = '',
  color = 'gold'
}: ProgressRingProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value)
  const percentage = (displayValue / max) * 100
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setDisplayValue(value), 100)
      return () => clearTimeout(timer)
    } else {
      setDisplayValue(value)
    }
  }, [value, animated])

  const colors = {
    gold: ['#FFD700', '#FFA500'],
    blue: ['#3B82F6', '#1E40AF'],
    green: ['#10B981', '#059669'],
    purple: ['#A855F7', '#7C3AED'],
    red: ['#EF4444', '#DC2626']
  }

  const [startColor, endColor] = colors[color]

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          {gradient && (
            <linearGradient id={`progress-gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={startColor} />
              <stop offset="100%" stopColor={endColor} />
            </linearGradient>
          )}
        </defs>
        
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-navy-700/50"
        />
        
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={gradient ? `url(#progress-gradient-${color})` : startColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: animated ? 1.5 : 0,
            ease: 'easeInOut'
          }}
          style={{
            strokeDasharray: circumference
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute flex flex-col items-center justify-center">
        {showValue && (
          <motion.span
            className="text-2xl font-bold text-gold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {Math.round((displayValue / max) * 100)}%
          </motion.span>
        )}
        {label && (
          <span className="text-xs text-gold-300 mt-1">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

// Alternative Progress Ring with segments
export function SegmentedProgressRing({
  segments,
  size = 120,
  strokeWidth = 8,
  className = ''
}: {
  segments: { value: number; color: string; label?: string }[]
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const total = segments.reduce((sum, seg) => sum + seg.value, 0)
  
  let cumulativeOffset = 0

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-navy-700/50"
        />
        
        {/* Segments */}
        {segments.map((segment, index) => {
          const segmentLength = (segment.value / total) * circumference
          const offset = circumference - cumulativeOffset
          cumulativeOffset += segmentLength
          
          return (
            <motion.circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{
                duration: 1.5,
                delay: index * 0.2,
                ease: 'easeInOut'
              }}
              style={{
                strokeDasharray: `${segmentLength} ${circumference}`
              }}
            />
          )
        })}
      </svg>
      
      {/* Center total */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gold">
          {total}
        </span>
        <span className="text-xs text-gold-300">
          Total
        </span>
      </div>
    </div>
  )
}