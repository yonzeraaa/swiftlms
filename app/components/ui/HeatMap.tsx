'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface HeatMapData {
  date: string
  value: number
  label?: string
}

interface HeatMapProps {
  data: HeatMapData[]
  startDate?: Date
  endDate?: Date
  colorScale?: string[]
  showMonthLabels?: boolean
  showLegend?: boolean
  tooltipEnabled?: boolean
  className?: string
  cellSize?: number
  cellGap?: number
}

export default function HeatMap({
  data,
  startDate = new Date(new Date().getFullYear(), 0, 1),
  endDate = new Date(),
  colorScale = ['#1e3a5f', '#2d4a7f', '#3b5a9f', '#FFD700', '#FFA500'],
  showMonthLabels = true,
  showLegend = true,
  tooltipEnabled = true,
  className = '',
  cellSize = 12,
  cellGap = 3
}: HeatMapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatMapData | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Create a map of dates to values
  const dataMap = new Map(data.map(d => [d.date, d]))

  // Generate all dates in range
  const dates: Date[] = []
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Group dates by week
  const weeks: Date[][] = []
  let currentWeek: Date[] = []
  
  // Start from the first Sunday
  const firstDate = new Date(dates[0])
  const startDay = firstDate.getDay()
  
  // Add empty cells for days before the first date
  for (let i = 0; i < startDay; i++) {
    currentWeek.push(null as any)
  }

  dates.forEach(date => {
    currentWeek.push(date)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  if (currentWeek.length > 0) {
    // Fill the rest of the week with empty cells
    while (currentWeek.length < 7) {
      currentWeek.push(null as any)
    }
    weeks.push(currentWeek)
  }

  // Get max value for color scaling
  const maxValue = Math.max(...data.map(d => d.value), 1)

  // Get color for a value
  const getColor = (value: number) => {
    if (value === 0) return 'bg-navy-800/50'
    const index = Math.floor((value / maxValue) * (colorScale.length - 1))
    return colorScale[Math.min(index, colorScale.length - 1)]
  }

  // Month labels
  const monthLabels: { month: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, weekIndex) => {
    week.forEach(date => {
      if (date && date.getMonth() !== lastMonth) {
        lastMonth = date.getMonth()
        monthLabels.push({
          month: date.toLocaleDateString('pt-BR', { month: 'short' }),
          col: weekIndex
        })
      }
    })
  })

  // Day labels
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className={`relative ${className}`}>
      {/* Month Labels */}
      {showMonthLabels && (
        <div 
          className="flex gap-1 mb-2"
          style={{ 
            paddingLeft: `${cellSize + cellGap}px`,
            marginLeft: '30px'
          }}
        >
          {monthLabels.map((label, index) => (
            <div
              key={index}
              className="text-xs text-gold-300/70"
              style={{
                position: 'absolute',
                left: `${30 + label.col * (cellSize + cellGap)}px`
              }}
            >
              {label.month}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {/* Day Labels */}
        <div className="flex flex-col justify-between" style={{ marginTop: showMonthLabels ? '20px' : '0' }}>
          {dayLabels.map((day, index) => (
            <div
              key={index}
              className="text-xs text-gold-300/50"
              style={{ 
                height: `${cellSize}px`,
                marginBottom: `${cellGap}px`,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {index % 2 === 1 ? day : ''}
            </div>
          ))}
        </div>

        {/* Heat Map Grid */}
        <div 
          className="flex gap-1"
          style={{ marginTop: showMonthLabels ? '20px' : '0' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          }}
        >
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((date, dayIndex) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${weekIndex}-${dayIndex}`}
                      style={{ width: `${cellSize}px`, height: `${cellSize}px`, marginBottom: `${cellGap - 1}px` }}
                    />
                  )
                }

                const dateStr = date.toISOString().split('T')[0]
                const cellData = dataMap.get(dateStr)
                const value = cellData?.value || 0
                const color = getColor(value)

                return (
                  <motion.div
                    key={dateStr}
                    className={`rounded-sm cursor-pointer transition-all ${
                      typeof color === 'string' && color.startsWith('bg-') ? color : ''
                    }`}
                    style={{ 
                      width: `${cellSize}px`, 
                      height: `${cellSize}px`,
                      marginBottom: `${cellGap - 1}px`,
                      backgroundColor: typeof color === 'string' && !color.startsWith('bg-') ? color : undefined
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      delay: (weekIndex * 7 + dayIndex) * 0.005,
                      duration: 0.3 
                    }}
                    whileHover={{ scale: 1.2 }}
                    onMouseEnter={() => {
                      if (tooltipEnabled && cellData) {
                        setHoveredCell(cellData)
                      }
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-gold-300/70">Menos</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-navy-800/50" />
            {colorScale.map((color, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-sm ${
                  color.startsWith('bg-') ? color : ''
                }`}
                style={{
                  backgroundColor: !color.startsWith('bg-') ? color : undefined
                }}
              />
            ))}
          </div>
          <span className="text-xs text-gold-300/70">Mais</span>
        </div>
      )}

      {/* Tooltip */}
      {tooltipEnabled && hoveredCell && (
        <motion.div
          className="absolute z-50 px-3 py-2 bg-navy-700 border border-gold-500/30 rounded-lg shadow-xl pointer-events-none"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y - 40
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.1 }}
        >
          <div className="text-xs text-gold-200">
            {new Date(hoveredCell.date).toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>
          <div className="text-sm font-semibold text-gold">
            {hoveredCell.value} {hoveredCell.label || 'atividades'}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Activity Streak Component
export function ActivityStreak({
  currentStreak,
  longestStreak,
  totalDays,
  className = ''
}: {
  currentStreak: number
  longestStreak: number
  totalDays: number
  className?: string
}) {
  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-2xl font-bold text-gold flex items-center justify-center gap-1">
          {currentStreak}
          {currentStreak >= 7 && <span className="text-lg">🔥</span>}
        </div>
        <div className="text-xs text-gold-300/70">Sequência Atual</div>
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-2xl font-bold text-gold flex items-center justify-center gap-1">
          {longestStreak}
          {longestStreak >= 30 && <span className="text-lg">🏆</span>}
        </div>
        <div className="text-xs text-gold-300/70">Maior Sequência</div>
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-2xl font-bold text-gold flex items-center justify-center gap-1">
          {totalDays}
          {totalDays >= 100 && <span className="text-lg">⭐</span>}
        </div>
        <div className="text-xs text-gold-300/70">Total de Dias</div>
      </motion.div>
    </div>
  )
}