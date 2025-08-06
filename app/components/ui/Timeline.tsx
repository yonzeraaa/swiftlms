'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { CheckCircle, Circle, Clock, Lock, Play, Star, Trophy } from 'lucide-react'

interface TimelineItem {
  id: string
  title: string
  description?: string
  date?: string
  status: 'completed' | 'current' | 'upcoming' | 'locked'
  icon?: ReactNode
  metadata?: {
    duration?: string
    points?: number
    difficulty?: 'easy' | 'medium' | 'hard'
  }
}

interface TimelineProps {
  items: TimelineItem[]
  orientation?: 'vertical' | 'horizontal'
  animated?: boolean
  showConnectors?: boolean
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

export default function Timeline({
  items,
  orientation = 'vertical',
  animated = true,
  showConnectors = true,
  variant = 'default',
  className = ''
}: TimelineProps) {
  const statusConfig = {
    completed: {
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/50'
    },
    current: {
      icon: <Play className="w-5 h-5" />,
      color: 'text-gold-400',
      bgColor: 'bg-gold-500/20',
      borderColor: 'border-gold-500/50'
    },
    upcoming: {
      icon: <Circle className="w-5 h-5" />,
      color: 'text-gold-300/50',
      bgColor: 'bg-navy-700/50',
      borderColor: 'border-gold-500/20'
    },
    locked: {
      icon: <Lock className="w-5 h-5" />,
      color: 'text-gold-300/30',
      bgColor: 'bg-navy-800/50',
      borderColor: 'border-gold-500/10'
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: orientation === 'vertical' ? -20 : 0, y: orientation === 'horizontal' ? 20 : 0 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const
      }
    }
  }

  if (orientation === 'horizontal') {
    return (
      <motion.div
        className={`flex items-center gap-4 overflow-x-auto pb-4 ${className}`}
        variants={containerVariants}
        initial={animated ? 'hidden' : false}
        animate={animated ? 'visible' : false}
      >
        {items.map((item, index) => {
          const config = statusConfig[item.status]
          return (
            <motion.div
              key={item.id}
              className="flex items-center flex-shrink-0"
              variants={itemVariants}
            >
              {/* Connector Line */}
              {showConnectors && index > 0 && (
                <div className={`h-0.5 w-12 ${
                  items[index - 1].status === 'completed' ? 'bg-green-500/50' : 'bg-gold-500/20'
                }`} />
              )}

              {/* Timeline Item */}
              <div className="flex flex-col items-center gap-2">
                {/* Icon */}
                <div className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full
                  ${config.bgColor} ${config.borderColor} border-2
                  ${item.status === 'current' ? 'animate-pulse' : ''}
                `}>
                  <span className={config.color}>
                    {item.icon || config.icon}
                  </span>
                  {item.status === 'current' && (
                    <div className="absolute inset-0 rounded-full border-2 border-gold-500/50 animate-ping" />
                  )}
                </div>

                {/* Content */}
                <div className="text-center max-w-[150px]">
                  <h4 className={`text-sm font-medium ${
                    item.status === 'locked' ? 'text-gold-300/50' : 'text-gold-200'
                  }`}>
                    {item.title}
                  </h4>
                  {item.date && (
                    <p className="text-xs text-gold-300/50 mt-1">
                      {item.date}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    )
  }

  // Vertical Timeline
  return (
    <motion.div
      className={`relative ${className}`}
      variants={containerVariants}
      initial={animated ? 'hidden' : false}
      animate={animated ? 'visible' : false}
    >
      {/* Connector Line */}
      {showConnectors && (
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gold-500/20" />
      )}

      {items.map((item, index) => {
        const config = statusConfig[item.status]
        
        return (
          <motion.div
            key={item.id}
            className="relative flex gap-4 mb-8 last:mb-0"
            variants={itemVariants}
          >
            {/* Icon */}
            <div className={`
              relative flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0
              ${config.bgColor} ${config.borderColor} border-2 z-10
              ${item.status === 'current' ? 'animate-pulse' : ''}
            `}>
              <span className={config.color}>
                {item.icon || config.icon}
              </span>
              {item.status === 'current' && (
                <div className="absolute inset-0 rounded-full border-2 border-gold-500/50 animate-ping" />
              )}
            </div>

            {/* Content */}
            <div className={`
              flex-1 pb-4
              ${variant === 'compact' ? 'pt-2' : 'pt-0'}
            `}>
              {variant === 'detailed' ? (
                <div className={`
                  p-4 rounded-lg border
                  ${item.status === 'locked' 
                    ? 'bg-navy-800/30 border-gold-500/10' 
                    : 'bg-navy-800/50 border-gold-500/20'
                  }
                `}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-semibold ${
                      item.status === 'locked' ? 'text-gold-300/50' : 'text-gold-200'
                    }`}>
                      {item.title}
                    </h3>
                    {item.metadata?.points && (
                      <span className="flex items-center gap-1 text-sm text-gold-400">
                        <Star className="w-4 h-4" />
                        {item.metadata.points}
                      </span>
                    )}
                  </div>
                  
                  {item.description && (
                    <p className={`text-sm mb-2 ${
                      item.status === 'locked' ? 'text-gold-300/30' : 'text-gold-300/70'
                    }`}>
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs">
                    {item.date && (
                      <span className="text-gold-300/50">
                        {item.date}
                      </span>
                    )}
                    {item.metadata?.duration && (
                      <span className="flex items-center gap-1 text-gold-300/50">
                        <Clock className="w-3 h-3" />
                        {item.metadata.duration}
                      </span>
                    )}
                    {item.metadata?.difficulty && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        item.metadata.difficulty === 'easy' 
                          ? 'bg-green-500/20 text-green-400'
                          : item.metadata.difficulty === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {item.metadata.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <h3 className={`font-semibold mb-1 ${
                    item.status === 'locked' ? 'text-gold-300/50' : 'text-gold-200'
                  }`}>
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className={`text-sm ${
                      item.status === 'locked' ? 'text-gold-300/30' : 'text-gold-300/70'
                    }`}>
                      {item.description}
                    </p>
                  )}
                  {item.date && (
                    <p className="text-xs text-gold-300/50 mt-1">
                      {item.date}
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// Milestone Timeline Component
export function MilestoneTimeline({
  milestones,
  currentIndex = 0,
  className = ''
}: {
  milestones: { title: string; description?: string; icon?: ReactNode }[]
  currentIndex?: number
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {milestones.map((milestone, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isUpcoming = index > currentIndex

        return (
          <div key={index} className="flex-1 flex items-center">
            {/* Connector */}
            {index > 0 && (
              <div className={`flex-1 h-0.5 ${
                isCompleted || isCurrent ? 'bg-gold-500/50' : 'bg-gold-500/10'
              }`} />
            )}

            {/* Milestone */}
            <motion.div
              className="flex flex-col items-center gap-2 px-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <div className={`
                relative flex items-center justify-center w-12 h-12 rounded-full
                ${isCompleted ? 'bg-green-500/20 border-green-500/50' : 
                  isCurrent ? 'bg-gold-500/20 border-gold-500/50' : 
                  'bg-navy-700/50 border-gold-500/20'} 
                border-2
              `}>
                {milestone.icon || (
                  isCompleted ? <Trophy className="w-5 h-5 text-green-400" /> :
                  isCurrent ? <Star className="w-5 h-5 text-gold-400" /> :
                  <Circle className="w-5 h-5 text-gold-300/50" />
                )}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full border-2 border-gold-500/50 animate-ping" />
                )}
              </div>
              <div className="text-center">
                <p className={`text-xs font-medium ${
                  isUpcoming ? 'text-gold-300/50' : 'text-gold-200'
                }`}>
                  {milestone.title}
                </p>
              </div>
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}