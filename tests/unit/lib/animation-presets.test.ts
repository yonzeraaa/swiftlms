import { describe, it, expect } from 'vitest'
import {
  transitions,
  fadeIn,
  fadeInUp,
  fadeInDown,
  scaleIn,
  scaleInBounce,
  slideInUp,
  slideInLeft,
  staggerContainer,
  staggerItem,
  hoverScale,
  hoverLift,
  tapScale,
  shake,
  successCheck,
  pulse,
  rotate360,
  pageTransition,
  modalBackdrop,
  modalContent,
  cardFlip,
  entranceWithDelay,
  parallaxSlow,
} from '@/lib/animation-presets'

describe('animation-presets', () => {
  describe('transitions', () => {
    it('should have spring transition', () => {
      expect(transitions.spring.type).toBe('spring')
      expect(transitions.spring.stiffness).toBe(300)
      expect(transitions.spring.damping).toBe(30)
    })

    it('should have smooth transition', () => {
      expect(transitions.smooth.type).toBe('tween')
      expect(transitions.smooth.ease).toBe('easeInOut')
      expect(transitions.smooth.duration).toBe(0.3)
    })

    it('should have fast transition', () => {
      expect(transitions.fast.type).toBe('tween')
      expect(transitions.fast.duration).toBe(0.15)
    })

    it('should have slow transition', () => {
      expect(transitions.slow.duration).toBe(0.5)
    })

    it('should have bounce transition', () => {
      expect(transitions.bounce.type).toBe('spring')
      expect(transitions.bounce.stiffness).toBe(500)
      expect(transitions.bounce.damping).toBe(20)
    })
  })

  describe('fade animations', () => {
    it('should have fadeIn with hidden and visible states', () => {
      expect(fadeIn.hidden).toEqual({ opacity: 0 })
      expect(fadeIn.visible).toHaveProperty('opacity', 1)
    })

    it('should have fadeInUp with vertical movement', () => {
      expect(fadeInUp.hidden).toEqual({ opacity: 0, y: 20 })
      expect(fadeInUp.visible).toHaveProperty('opacity', 1)
      expect(fadeInUp.visible).toHaveProperty('y', 0)
    })

    it('should have fadeInDown with negative y', () => {
      expect(fadeInDown.hidden).toHaveProperty('y', -20)
      expect(fadeInDown.visible).toHaveProperty('y', 0)
    })
  })

  describe('scale animations', () => {
    it('should have scaleIn animation', () => {
      expect(scaleIn.hidden).toEqual({ opacity: 0, scale: 0.8 })
      expect(scaleIn.visible).toHaveProperty('scale', 1)
    })

    it('should use spring transition for scaleIn', () => {
      expect(scaleIn.visible?.transition).toEqual(transitions.spring)
    })

    it('should have scaleInBounce starting from scale 0', () => {
      expect(scaleInBounce.hidden).toHaveProperty('scale', 0)
      expect(scaleInBounce.visible).toHaveProperty('scale', 1)
    })

    it('should use bounce transition for scaleInBounce', () => {
      expect(scaleInBounce.visible?.transition).toEqual(transitions.bounce)
    })
  })

  describe('slide animations', () => {
    it('should have slideInUp from bottom', () => {
      expect(slideInUp.hidden).toHaveProperty('y', '100%')
      expect(slideInUp.visible).toHaveProperty('y', 0)
    })

    it('should have slideInLeft from left', () => {
      expect(slideInLeft.hidden).toHaveProperty('x', '-100%')
      expect(slideInLeft.visible).toHaveProperty('x', 0)
    })
  })

  describe('stagger animations', () => {
    it('should have staggerContainer with stagger config', () => {
      expect(staggerContainer.visible).toHaveProperty('transition')
      expect(staggerContainer.visible?.transition).toHaveProperty('staggerChildren', 0.1)
      expect(staggerContainer.visible?.transition).toHaveProperty('delayChildren', 0.1)
    })

    it('should have staggerItem animation', () => {
      expect(staggerItem.hidden).toEqual({ opacity: 0, y: 20 })
      expect(staggerItem.visible).toHaveProperty('opacity', 1)
      expect(staggerItem.visible).toHaveProperty('y', 0)
    })
  })

  describe('hover animations', () => {
    it('should have hoverScale', () => {
      expect(hoverScale).toHaveProperty('scale', 1.05)
      expect(hoverScale).toHaveProperty('transition')
    })

    it('should have hoverLift with negative y', () => {
      expect(hoverLift).toHaveProperty('y', -4)
    })

    it('should use fast transition', () => {
      expect(hoverScale.transition).toEqual(transitions.fast)
    })
  })

  describe('tap animations', () => {
    it('should have tapScale that reduces size', () => {
      expect(tapScale).toHaveProperty('scale', 0.95)
      expect(tapScale.transition).toEqual(transitions.fast)
    })
  })

  describe('special animations', () => {
    it('should have shake with x movement array', () => {
      expect(shake.shake).toHaveProperty('x')
      expect(Array.isArray(shake.shake?.x)).toBe(true)
      expect(shake.shake?.x).toHaveLength(6)
    })

    it('should have successCheck with pathLength', () => {
      expect(successCheck.hidden).toHaveProperty('pathLength', 0)
      expect(successCheck.visible).toHaveProperty('pathLength', 1)
    })

    it('should have pulse with infinite repeat', () => {
      expect(pulse.pulse).toHaveProperty('scale')
      expect(pulse.pulse?.transition).toHaveProperty('repeat', Infinity)
    })

    it('should have rotate360 with infinite rotation', () => {
      expect(rotate360.rotate).toHaveProperty('rotate', 360)
      expect(rotate360.rotate?.transition).toHaveProperty('repeat', Infinity)
    })
  })

  describe('page transitions', () => {
    it('should have hidden, visible, and exit states', () => {
      expect(pageTransition).toHaveProperty('hidden')
      expect(pageTransition).toHaveProperty('visible')
      expect(pageTransition).toHaveProperty('exit')
    })

    it('should have proper transitions for each state', () => {
      expect(pageTransition.visible).toHaveProperty('transition')
      expect(pageTransition.exit).toHaveProperty('transition')
    })
  })

  describe('modal animations', () => {
    it('should have modalBackdrop with opacity transition', () => {
      expect(modalBackdrop.hidden).toHaveProperty('opacity', 0)
      expect(modalBackdrop.visible).toHaveProperty('opacity', 1)
      expect(modalBackdrop).toHaveProperty('exit')
    })

    it('should have modalContent with scale and y movement', () => {
      expect(modalContent.hidden).toEqual({
        opacity: 0,
        scale: 0.8,
        y: 50,
      })
      expect(modalContent.visible).toHaveProperty('scale', 1)
      expect(modalContent.visible).toHaveProperty('y', 0)
    })

    it('should use spring transition for modalContent', () => {
      expect(modalContent.visible?.transition).toEqual(transitions.spring)
    })
  })

  describe('cardFlip', () => {
    it('should have front and back states', () => {
      expect(cardFlip).toHaveProperty('front')
      expect(cardFlip).toHaveProperty('back')
    })

    it('should rotate 180 degrees for back', () => {
      expect(cardFlip.front).toHaveProperty('rotateY', 0)
      expect(cardFlip.back).toHaveProperty('rotateY', 180)
    })
  })

  describe('helper functions', () => {
    it('should create entranceWithDelay with custom delay', () => {
      const delayed = entranceWithDelay(0.5)

      expect(delayed.hidden).toEqual({ opacity: 0, y: 20 })
      expect(delayed.visible).toHaveProperty('opacity', 1)
      expect(delayed.visible?.transition).toHaveProperty('delay', 0.5)
    })

    it('should maintain smooth transition properties in delayed entrance', () => {
      const delayed = entranceWithDelay(0.3)

      expect(delayed.visible?.transition).toMatchObject({
        ...transitions.smooth,
        delay: 0.3,
      })
    })
  })

  describe('parallax effects', () => {
    it('should have parallaxSlow with y movement', () => {
      expect(parallaxSlow).toHaveProperty('y')
      expect(parallaxSlow.y).toEqual([0, -50])
    })

    it('should use linear easing', () => {
      expect(parallaxSlow.transition).toHaveProperty('ease', 'linear')
    })
  })

  describe('consistency checks', () => {
    it('should have consistent opacity values', () => {
      const fadeAnimations = [fadeIn, fadeInUp, fadeInDown, scaleIn]

      fadeAnimations.forEach(anim => {
        expect(anim.hidden).toHaveProperty('opacity', 0)
        expect(anim.visible).toHaveProperty('opacity', 1)
      })
    })

    it('should have smooth transitions for slide animations', () => {
      const slideAnimations = [slideInUp, slideInLeft]

      slideAnimations.forEach(anim => {
        expect(anim.visible?.transition).toEqual(transitions.smooth)
      })
    })
  })
})
