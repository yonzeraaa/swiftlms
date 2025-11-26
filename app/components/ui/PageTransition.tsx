'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.2,
    },
  },
}

export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Section animation wrapper
export function SectionTransition({ 
  children, 
  delay = 0,
  className = '',
}: { 
  children: ReactNode
  delay?: number
  className?: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// List item animation wrapper
export function ListTransition({ 
  children,
  className = '',
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ 
        duration: 0.3,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Fade animation wrapper
export function FadeTransition({ 
  children,
  delay = 0,
  duration = 0.5,
  className = '',
}: { 
  children: ReactNode
  delay?: number
  duration?: number
  className?: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Scale animation wrapper
export function ScaleTransition({ 
  children,
  delay = 0,
  hover = true,
  tap = true,
  className = '',
}: { 
  children: ReactNode
  delay?: number
  hover?: boolean
  tap?: boolean
  className?: string 
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: 'easeOut',
      }}
      whileHover={hover ? { scale: 1.02 } : {}}
      whileTap={tap ? { scale: 0.98 } : {}}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger children animation
export function StaggerTransition({ 
  children,
  staggerDelay = 0.1,
  className = '',
}: { 
  children: ReactNode
  staggerDelay?: number
  className?: string 
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger item for use with StaggerTransition
export function StaggerItem({ 
  children,
  className = '',
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.5,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}