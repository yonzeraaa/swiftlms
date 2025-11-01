/**
 * Animation Presets - Biblioteca de Animações Reutilizáveis
 * Usando Framer Motion para animações consistentes
 */

import { Variants, Transition } from 'framer-motion'

// Transições Padrão
export const transitions = {
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30
  } as Transition,

  smooth: {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.3
  } as Transition,

  fast: {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.15
  } as Transition,

  slow: {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.5
  } as Transition,

  bounce: {
    type: 'spring',
    stiffness: 500,
    damping: 20
  } as Transition
}

// Fade Animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.smooth
  }
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth
  }
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth
  }
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.smooth
  }
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.smooth
  }
}

// Scale Animations
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.spring
  }
}

export const scaleInBounce: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.bounce
  }
}

// Slide Animations
export const slideInUp: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: transitions.smooth
  }
}

export const slideInDown: Variants = {
  hidden: { y: '-100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: transitions.smooth
  }
}

export const slideInLeft: Variants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.smooth
  }
}

export const slideInRight: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.smooth
  }
}

// Stagger Container
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
}

// Stagger Item
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth
  }
}

// Hover Animations
export const hoverScale = {
  scale: 1.05,
  transition: transitions.fast
}

export const hoverScaleLarge = {
  scale: 1.1,
  transition: transitions.fast
}

export const hoverLift = {
  y: -4,
  transition: transitions.fast
}

export const hoverGlow = {
  boxShadow: '0 10px 40px rgba(255, 215, 0, 0.3)',
  transition: transitions.smooth
}

// Tap Animations
export const tapScale = {
  scale: 0.95,
  transition: transitions.fast
}

export const tapScaleSmall = {
  scale: 0.98,
  transition: transitions.fast
}

// Shake Animation
export const shake: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 }
  }
}

// Success/Check Animation
export const successCheck: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: 'spring', duration: 0.6, bounce: 0 },
      opacity: { duration: 0.01 }
    }
  }
}

// Pulse Animation
export const pulse: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

// Rotate Animation
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

// Page Transitions
export const pageTransition: Variants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn'
    }
  }
}

// Modal Animations
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.fast
  },
  exit: {
    opacity: 0,
    transition: transitions.fast
  }
}

export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.spring
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: transitions.fast
  }
}

// Card Flip Animation
export const cardFlip: Variants = {
  front: {
    rotateY: 0,
    transition: transitions.smooth
  },
  back: {
    rotateY: 180,
    transition: transitions.smooth
  }
}

// Skeleton Loading
export const skeletonPulse: Variants = {
  pulse: {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

// Notification Slide
export const notificationSlide: Variants = {
  hidden: {
    x: '100%',
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.spring
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: transitions.smooth
  }
}

// Entrance with Delay (helper function)
export const entranceWithDelay = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...transitions.smooth,
      delay
    }
  }
})

// Parallax effect values
export const parallaxSlow = {
  y: [0, -50],
  transition: {
    ease: 'linear'
  }
}

export const parallaxMedium = {
  y: [0, -100],
  transition: {
    ease: 'linear'
  }
}

export const parallaxFast = {
  y: [0, -150],
  transition: {
    ease: 'linear'
  }
}
