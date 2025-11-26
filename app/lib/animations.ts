import { Variants, TargetAndTransition } from 'framer-motion'

// ===== Fade Animations =====
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

// ===== Scale Animations =====
export const scaleIn: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.5, ease: [0.43, 0.195, 0.02, 1.37] }
  }
}

export const scalePulse: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

// ===== Rotate Animations =====
export const rotate360: Variants = {
  rotate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
}

// ===== Stagger Children =====
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
}

// ===== Slide Animations =====
export const slideInLeft: Variants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  exit: { 
    x: '-100%', 
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' }
  }
}

export const slideInRight: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  exit: { 
    x: '100%', 
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' }
  }
}

export const slideInUp: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  exit: { 
    y: '100%', 
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' }
  }
}

// ===== Hover Animations =====
export const hoverScale: TargetAndTransition = {
  scale: 1.05,
  transition: { duration: 0.3, ease: 'easeOut' }
}

export const hoverLift: TargetAndTransition = {
  y: -5,
  transition: { duration: 0.3, ease: 'easeOut' }
}

export const hoverGlow: TargetAndTransition = {
  boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)',
  transition: { duration: 0.3, ease: 'easeOut' }
}

// ===== Tap Animations =====
export const tapScale: TargetAndTransition = {
  scale: 0.95,
  transition: { duration: 0.1 }
}

// ===== Page Transitions =====
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3, ease: 'easeIn' }
  }
}

// ===== Card 3D Flip =====
export const card3DFlip: Variants = {
  front: {
    rotateY: 0,
    transition: { duration: 0.6, ease: 'easeInOut' }
  },
  back: {
    rotateY: 180,
    transition: { duration: 0.6, ease: 'easeInOut' }
  }
}

// ===== Blob Animation =====
export const blobAnimation: Variants = {
  animate: {
    borderRadius: [
      '60% 40% 30% 70% / 60% 30% 70% 40%',
      '30% 60% 70% 40% / 50% 60% 30% 60%',
      '60% 40% 30% 70% / 60% 30% 70% 40%'
    ],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

// ===== Parallax Effect =====
export const parallaxY = (offset: number = 100): Variants => ({
  hidden: { y: -offset },
  visible: { 
    y: offset,
    transition: {
      duration: 0,
      ease: 'linear'
    }
  }
})

// ===== Text Reveal =====
export const textReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)'
  },
  visible: {
    opacity: 1,
    y: 0,
    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)',
    transition: {
      duration: 0.8,
      ease: [0.43, 0.195, 0.02, 1]
    }
  }
}

// ===== Shimmer Effect =====
export const shimmer: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'linear'
    }
  }
}

// ===== Spring Animations =====
export const springIn = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20
    }
  }
}

// ===== Magnetic Effect (for hover) =====
export const magneticHover = (strength: number = 0.5) => ({
  rest: { x: 0, y: 0 },
  hover: (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    return {
      x: x * strength,
      y: y * strength,
      transition: { type: 'spring', stiffness: 150, damping: 15 }
    }
  }
})

// ===== Confetti Animation =====
export const confettiAnimation = {
  initial: { y: -100, opacity: 0, scale: 0 },
  animate: {
    y: [null, -10, 100],
    opacity: [0, 1, 0],
    scale: [0, 1, 0.5],
    rotate: [0, 180, 360],
    transition: {
      duration: 2,
      times: [0, 0.2, 1],
      ease: 'easeOut'
    }
  }
}

// ===== Progress Bar Animation =====
export const progressBar: Variants = {
  initial: { width: '0%' },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 1,
      ease: 'easeInOut'
    }
  })
}

// ===== Number Counter Animation =====
export const numberCounter = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
}

// ===== Utility Functions =====
export const createStaggerDelay = (index: number, baseDelay: number = 0.1) => ({
  transition: { delay: index * baseDelay }
})

export const createCustomSpring = (stiffness = 100, damping = 10) => ({
  type: 'spring',
  stiffness,
  damping
})

// ===== Preset Animation Configs =====
export const animationPresets = {
  // Smooth and elegant
  smooth: {
    duration: 0.6,
    ease: [0.43, 0.13, 0.23, 0.96]
  },
  // Snappy and responsive
  snappy: {
    duration: 0.3,
    ease: [0.25, 0.46, 0.45, 0.94]
  },
  // Slow and dramatic
  dramatic: {
    duration: 1.2,
    ease: [0.83, 0, 0.17, 1]
  },
  // Bouncy and playful
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 15
  },
  // Elastic
  elastic: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 10
  }
}

// ===== Complex Animations =====
export const morphingCard: Variants = {
  initial: {
    borderRadius: '20px',
    scale: 1
  },
  hover: {
    borderRadius: '30px',
    scale: 1.05,
    transition: {
      duration: 0.3,
      ease: 'easeInOut'
    }
  },
  tap: {
    borderRadius: '15px',
    scale: 0.95
  }
}

export const glowPulse: Variants = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(255, 215, 0, 0.3)',
      '0 0 30px rgba(255, 215, 0, 0.5), 0 0 50px rgba(255, 215, 0, 0.3)',
      '0 0 20px rgba(255, 215, 0, 0.3)'
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}