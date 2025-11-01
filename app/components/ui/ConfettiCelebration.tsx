'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiCelebrationProps {
  trigger?: boolean
  colors?: string[]
  duration?: number
}

export default function ConfettiCelebration({
  trigger = false,
  colors = ['#FFD700', '#FFC700', '#FFB700', '#FFA700'],
  duration = 3000
}: ConfettiCelebrationProps) {
  useEffect(() => {
    if (!trigger) return

    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors
      })

      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }, [trigger, colors, duration])

  return null
}

// Helper function to trigger confetti programmatically
export const celebrateSuccess = (options?: {
  duration?: number
  colors?: string[]
}) => {
  const colors = options?.colors || ['#FFD700', '#FFC700', '#FFB700', '#22c55e']
  const duration = options?.duration || 3000
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
      zIndex: 9999
    })

    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
      zIndex: 9999
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

// Fireworks effect
export const celebrateFireworks = () => {
  const duration = 2000
  const animationEnd = Date.now() + duration
  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 9999,
    colors: ['#FFD700', '#FFC700', '#FFB700', '#22c55e', '#3b82f6']
  }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval: NodeJS.Timeout = setInterval(function() {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    })
  }, 250)
}

// Single burst
export const celebrateBurst = (origin?: { x: number; y: number }) => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: origin || { x: 0.5, y: 0.5 },
    colors: ['#FFD700', '#FFC700', '#FFB700', '#22c55e'],
    zIndex: 9999
  })
}
