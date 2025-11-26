'use client'

import { useEffect, useRef } from 'react'

interface ProgressChartProps {
  progress: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  labelSize?: 'sm' | 'md' | 'lg'
  color?: 'gold' | 'green' | 'blue'
}

export default function ProgressChart({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  showLabel = true,
  labelSize = 'md',
  color = 'gold'
}: ProgressChartProps) {
  const progressRef = useRef<SVGCircleElement>(null)
  
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.strokeDashoffset = `${offset}`
    }
  }, [offset])

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return {
          bg: 'stroke-green-900/30',
          progress: 'stroke-green-500',
          text: 'text-green-400'
        }
      case 'blue':
        return {
          bg: 'stroke-blue-900/30',
          progress: 'stroke-blue-500',
          text: 'text-blue-400'
        }
      default:
        return {
          bg: 'stroke-gold-900/30',
          progress: 'stroke-gold-500',
          text: 'text-gold-400'
        }
    }
  }

  const getLabelSize = () => {
    switch (labelSize) {
      case 'sm':
        return 'text-lg'
      case 'lg':
        return 'text-3xl'
      default:
        return 'text-2xl'
    }
  }

  const colors = getColorClasses()

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          className={colors.bg}
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          ref={progressRef}
          className={`${colors.progress} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${colors.text} ${getLabelSize()}`}>
            {progress}%
          </span>
        </div>
      )}
    </div>
  )
}