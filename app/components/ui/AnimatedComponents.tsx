'use client'

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ReactNode } from 'react'

// Animation variants
const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 }
}

const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
}

const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}

const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
}

const rotateIn: Variants = {
  initial: { opacity: 0, rotate: -10, scale: 0.9 },
  animate: { opacity: 1, rotate: 0, scale: 1 },
  exit: { opacity: 0, rotate: 10, scale: 0.9 }
}

const slideInFromTop: Variants = {
  initial: { y: '-100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '-100%', opacity: 0 }
}

const slideInFromBottom: Variants = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0 }
}

const bounceIn: Variants = {
  initial: { opacity: 0, scale: 0.3 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 500
    }
  },
  exit: { opacity: 0, scale: 0.3 }
}

// Animated Card Component
interface AnimatedCardProps {
  children: ReactNode
  animation?: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'rotateIn' | 'bounceIn'
  delay?: number
  duration?: number
  className?: string
  hover?: boolean
  tap?: boolean
  layoutId?: string
}

export function AnimatedCard({
  children,
  animation = 'fadeInUp',
  delay = 0,
  duration = 0.5,
  className = '',
  hover = true,
  tap = true,
  layoutId
}: AnimatedCardProps) {
  const animations = {
    fadeInUp,
    fadeInDown,
    fadeInLeft,
    fadeInRight,
    scaleIn,
    rotateIn,
    bounceIn
  }

  const selectedAnimation = animations[animation]

  return (
    <motion.div
      layoutId={layoutId}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={selectedAnimation}
      transition={{ duration, delay }}
      whileHover={hover ? { scale: 1.02, transition: { duration: 0.2 } } : undefined}
      whileTap={tap ? { scale: 0.98 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated Modal Component
interface AnimatedModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  animation?: 'fade' | 'scale' | 'slideUp' | 'slideDown' | 'bounce'
  overlayAnimation?: boolean
  className?: string
}

export function AnimatedModal({
  isOpen,
  onClose,
  children,
  animation = 'scale',
  overlayAnimation = true,
  className = ''
}: AnimatedModalProps) {
  const modalAnimations = {
    fade: fadeInUp,
    scale: scaleIn,
    slideUp: slideInFromBottom,
    slideDown: slideInFromTop,
    bounce: bounceIn
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={modalAnimations[animation]}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none ${className}`}
          >
            <div className="pointer-events-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Stagger Children Animation
interface StaggerContainerProps {
  children: ReactNode
  staggerDelay?: number
  animation?: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn'
  className?: string
}

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  animation = 'fadeInUp',
  className = ''
}: StaggerContainerProps) {
  const animations = {
    fadeInUp,
    fadeInDown,
    fadeInLeft,
    fadeInRight,
    scaleIn
  }

  const containerVariants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay
      }
    }
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated List Item
interface AnimatedListItemProps {
  children: ReactNode
  animation?: 'fadeInUp' | 'fadeInLeft' | 'scaleIn'
  index?: number
  className?: string
}

export function AnimatedListItem({
  children,
  animation = 'fadeInUp',
  index = 0,
  className = ''
}: AnimatedListItemProps) {
  const animations = {
    fadeInUp,
    fadeInLeft,
    scaleIn
  }

  return (
    <motion.div
      variants={animations[animation]}
      custom={index}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated Presence Wrapper for Page Transitions
interface AnimatedPageProps {
  children: ReactNode
  animation?: 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown'
  className?: string
}

export function AnimatedPage({
  children,
  animation = 'fade',
  className = ''
}: AnimatedPageProps) {
  const pageAnimations = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slideLeft: {
      initial: { x: '100%', opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: '-100%', opacity: 0 }
    },
    slideRight: {
      initial: { x: '-100%', opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: '100%', opacity: 0 }
    },
    slideUp: {
      initial: { y: '100%', opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: '-100%', opacity: 0 }
    },
    slideDown: {
      initial: { y: '-100%', opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: '100%', opacity: 0 }
    }
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageAnimations[animation]}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated Counter
interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({
  value,
  duration = 2,
  className = '',
  prefix = '',
  suffix = ''
}: AnimatedCounterProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration }}
      >
        {value}
      </motion.span>
      {suffix}
    </motion.span>
  )
}

// Floating Animation Component
interface FloatingElementProps {
  children: ReactNode
  duration?: number
  distance?: number
  className?: string
}

export function FloatingElement({
  children,
  duration = 3,
  distance = 10,
  className = ''
}: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [0, -distance, 0]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Parallax Scroll Effect
interface ParallaxElementProps {
  children: ReactNode
  offset?: number
  className?: string
}

export function ParallaxElement({
  children,
  offset = 50,
  className = ''
}: ParallaxElementProps) {
  return (
    <motion.div
      initial={{ y: offset }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Reveal on Scroll
interface RevealOnScrollProps {
  children: ReactNode
  animation?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale'
  threshold?: number
  className?: string
}

export function RevealOnScroll({
  children,
  animation = 'fadeIn',
  threshold = 0.1,
  className = ''
}: RevealOnScrollProps) {
  const animations = {
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 }
    },
    slideUp: {
      hidden: { opacity: 0, y: 50 },
      visible: { opacity: 1, y: 0 }
    },
    slideLeft: {
      hidden: { opacity: 0, x: -50 },
      visible: { opacity: 1, x: 0 }
    },
    slideRight: {
      hidden: { opacity: 0, x: 50 },
      visible: { opacity: 1, x: 0 }
    },
    scale: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 }
    }
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold }}
      variants={animations[animation]}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated Text with typewriter effect
interface TypewriterTextProps {
  text: string
  duration?: number
  className?: string
}

export function TypewriterText({
  text,
  duration = 0.05,
  className = ''
}: TypewriterTextProps) {
  const letters = Array.from(text)

  return (
    <motion.span className={className}>
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1, delay: index * duration }}
        >
          {letter}
        </motion.span>
      ))}
    </motion.span>
  )
}