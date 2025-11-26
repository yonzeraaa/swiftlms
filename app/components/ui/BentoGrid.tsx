'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import Card from '../Card'

interface BentoGridItem {
  id: string
  content: ReactNode
  className?: string
  span?: {
    cols?: number
    rows?: number
  }
  variant?: 'default' | 'gradient' | 'outlined' | 'elevated' | 'glass'
  hoverable?: boolean
  animate?: boolean
}

interface BentoGridProps {
  items: BentoGridItem[]
  columns?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  staggerAnimation?: boolean
}

export default function BentoGrid({
  items,
  columns = { default: 1, sm: 2, md: 3, lg: 4, xl: 4 },
  gap = 'md',
  className = '',
  staggerAnimation = true
}: BentoGridProps) {
  const gapSizes = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  }

  const gridColumns = {
    default: `grid-cols-${columns.default || 1}`,
    sm: columns.sm ? `sm:grid-cols-${columns.sm}` : '',
    md: columns.md ? `md:grid-cols-${columns.md}` : '',
    lg: columns.lg ? `lg:grid-cols-${columns.lg}` : '',
    xl: columns.xl ? `xl:grid-cols-${columns.xl}` : ''
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerAnimation ? 0.1 : 0
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const
      }
    }
  }

  return (
    <motion.div
      className={`grid ${gridColumns.default} ${gridColumns.sm} ${gridColumns.md} ${gridColumns.lg} ${gridColumns.xl} ${gapSizes[gap]} ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => {
        const colSpan = item.span?.cols ? `col-span-${item.span.cols}` : ''
        const rowSpan = item.span?.rows ? `row-span-${item.span.rows}` : ''

        return (
          <motion.div
            key={item.id}
            className={`${colSpan} ${rowSpan} ${item.className || ''}`}
            variants={itemVariants}
          >
            <Card
              variant={item.variant || 'default'}
              hoverable={item.hoverable}
              animate={item.animate}
              className="h-full"
            >
              {item.content}
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// Predefined Bento Grid Layouts
export function BentoGridHero({
  mainContent,
  sideContent,
  bottomContent,
  className = ''
}: {
  mainContent: ReactNode
  sideContent: ReactNode[]
  bottomContent?: ReactNode
  className?: string
}) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Main Hero Card */}
      <motion.div
        className="lg:col-span-2 lg:row-span-2"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card variant="elevated" hoverable className="h-full min-h-[400px]">
          {mainContent}
        </Card>
      </motion.div>

      {/* Side Cards */}
      <div className="space-y-6">
        {sideContent.map((content, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * (index + 1), duration: 0.5 }}
          >
            <Card variant="glass" hoverable>
              {content}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Bottom Full Width Card */}
      {bottomContent && (
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card variant="gradient" hoverable>
            {bottomContent}
          </Card>
        </motion.div>
      )}
    </div>
  )
}

// Dashboard Bento Grid Layout
export function DashboardBento({
  stats,
  chart,
  activity,
  quickActions,
  className = ''
}: {
  stats: ReactNode[]
  chart: ReactNode
  activity: ReactNode
  quickActions: ReactNode
  className?: string
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {/* Stats Cards */}
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.5 }}
        >
          <Card variant="glass" hoverable depth={3}>
            {stat}
          </Card>
        </motion.div>
      ))}

      {/* Chart Section */}
      <motion.div
        className="md:col-span-2 lg:col-span-2 lg:row-span-2"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card variant="elevated" className="h-full">
          {chart}
        </Card>
      </motion.div>

      {/* Activity Feed */}
      <motion.div
        className="lg:col-span-1 lg:row-span-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Card variant="gradient" className="h-full">
          {activity}
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="lg:col-span-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Card variant="glass" hoverable>
          {quickActions}
        </Card>
      </motion.div>
    </div>
  )
}

// Masonry-style Bento Grid
export function MasonryBento({
  items,
  columns = 3,
  gap = 'md',
  className = ''
}: {
  items: { id: string; content: ReactNode; height?: 'sm' | 'md' | 'lg' | 'xl' }[]
  columns?: number
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const gapSizes = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  }

  const heightSizes = {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
    xl: 'h-80'
  }

  // Distribute items across columns
  const columnItems: typeof items[] = Array.from({ length: columns }, () => [])
  items.forEach((item, index) => {
    columnItems[index % columns].push(item)
  })

  return (
    <div className={`grid grid-cols-${columns} ${gapSizes[gap]} ${className}`}>
      {columnItems.map((column, colIndex) => (
        <div key={colIndex} className={`space-y-${gap === 'sm' ? '3' : gap === 'md' ? '4' : gap === 'lg' ? '6' : '8'}`}>
          {column.map((item, itemIndex) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: (colIndex * 0.1) + (itemIndex * 0.05), 
                duration: 0.5 
              }}
              className={item.height ? heightSizes[item.height] : 'h-auto'}
            >
              <Card 
                variant={colIndex % 2 === 0 ? 'glass' : 'gradient'} 
                hoverable 
                className="h-full"
              >
                {item.content}
              </Card>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  )
}