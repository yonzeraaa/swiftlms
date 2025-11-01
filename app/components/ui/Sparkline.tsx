'use client'

import { motion } from 'framer-motion'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  showDots?: boolean
  animated?: boolean
}

export default function Sparkline({
  data,
  width = 60,
  height = 20,
  color = '#FFD700',
  showDots = false,
  animated = true
}: SparklineProps) {
  if (!data || data.length === 0) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  // Normalize data to height
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return { x, y }
  })

  // Create SVG path
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
    .join(' ')

  // Determine trend (positive, negative, neutral)
  const trend = data[data.length - 1] > data[0] ? 'up' : data[data.length - 1] < data[0] ? 'down' : 'neutral'
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : color

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Gradient definition */}
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {animated ? (
        <motion.path
          d={`${pathData} L ${width},${height} L 0,${height} Z`}
          fill={`url(#sparkline-gradient-${color})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      ) : (
        <path
          d={`${pathData} L ${width},${height} L 0,${height} Z`}
          fill={`url(#sparkline-gradient-${color})`}
        />
      )}

      {/* Line */}
      {animated ? (
        <motion.path
          d={pathData}
          fill="none"
          stroke={trendColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      ) : (
        <path
          d={pathData}
          fill="none"
          stroke={trendColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Dots on data points */}
      {showDots && points.map((point, index) => (
        animated ? (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill={trendColor}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          />
        ) : (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill={trendColor}
          />
        )
      ))}

      {/* Highlight last point */}
      {animated ? (
        <motion.circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={trendColor}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5, delay: 0.5 }}
        />
      ) : (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={trendColor}
        />
      )}
    </svg>
  )
}
