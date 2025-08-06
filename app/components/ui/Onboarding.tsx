'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Info,
  HelpCircle,
  Lightbulb,
  Target,
  Award,
  Sparkles,
} from 'lucide-react'

// Onboarding Step Interface
export interface OnboardingStep {
  id: string
  title: string
  content: string
  target?: string // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  icon?: React.ReactNode
  image?: string
  video?: string
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'ghost'
  }>
  canSkip?: boolean
  validation?: () => boolean | Promise<boolean>
}

// Onboarding Context
interface OnboardingContextValue {
  currentTour: string | null
  currentStep: number
  isActive: boolean
  startTour: (tourId: string, steps: OnboardingStep[]) => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  skipTour: () => void
  completedTours: string[]
  markTourCompleted: (tourId: string) => void
  resetTours: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined)

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}

// Onboarding Provider
interface OnboardingProviderProps {
  children: React.ReactNode
  autoStart?: boolean
  tourId?: string
  steps?: OnboardingStep[]
}

export function OnboardingProvider({
  children,
  autoStart = false,
  tourId,
  steps = [],
}: OnboardingProviderProps) {
  const [currentTour, setCurrentTour] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [tourSteps, setTourSteps] = useState<OnboardingStep[]>([])
  const [completedTours, setCompletedTours] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('completed-tours')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  useEffect(() => {
    if (autoStart && tourId && steps.length > 0 && !completedTours.includes(tourId)) {
      startTour(tourId, steps)
    }
  }, [autoStart, tourId, steps])

  useEffect(() => {
    localStorage.setItem('completed-tours', JSON.stringify(completedTours))
  }, [completedTours])

  const startTour = (tourId: string, steps: OnboardingStep[]) => {
    setCurrentTour(tourId)
    setTourSteps(steps)
    setCurrentStep(0)
    setIsActive(true)
  }

  const endTour = () => {
    if (currentTour) {
      markTourCompleted(currentTour)
    }
    setCurrentTour(null)
    setTourSteps([])
    setCurrentStep(0)
    setIsActive(false)
  }

  const nextStep = async () => {
    const step = tourSteps[currentStep]
    
    if (step?.validation) {
      const isValid = await step.validation()
      if (!isValid) return
    }

    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      endTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (index: number) => {
    if (index >= 0 && index < tourSteps.length) {
      setCurrentStep(index)
    }
  }

  const skipTour = () => {
    endTour()
  }

  const markTourCompleted = (tourId: string) => {
    setCompletedTours((prev) => [...new Set([...prev, tourId])])
  }

  const resetTours = () => {
    setCompletedTours([])
    localStorage.removeItem('completed-tours')
  }

  return (
    <OnboardingContext.Provider
      value={{
        currentTour,
        currentStep,
        isActive,
        startTour,
        endTour,
        nextStep,
        prevStep,
        goToStep,
        skipTour,
        completedTours,
        markTourCompleted,
        resetTours,
      }}
    >
      {children}
      {isActive && tourSteps.length > 0 && (
        <OnboardingOverlay steps={tourSteps} />
      )}
    </OnboardingContext.Provider>
  )
}

// Onboarding Overlay Component
interface OnboardingOverlayProps {
  steps: OnboardingStep[]
}

function OnboardingOverlay({ steps }: OnboardingOverlayProps) {
  const { currentStep, nextStep, prevStep, skipTour } = useOnboarding()
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const step = steps[currentStep]

  useEffect(() => {
    if (step?.target) {
      const element = document.querySelector(step.target) as HTMLElement
      if (element) {
        setTargetElement(element)
        setTargetRect(element.getBoundingClientRect())
        
        // Scroll element into view
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        })

        // Add highlight class
        element.classList.add('onboarding-highlight')

        return () => {
          element.classList.remove('onboarding-highlight')
        }
      }
    } else {
      setTargetElement(null)
      setTargetRect(null)
    }
  }, [step])

  // Update rect on resize
  useEffect(() => {
    if (!targetElement) return

    const updateRect = () => {
      setTargetRect(targetElement.getBoundingClientRect())
    }

    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect)

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect)
    }
  }, [targetElement])

  const getTooltipPosition = () => {
    if (!targetRect || !step.position) return {}

    const tooltipWidth = 400
    const tooltipHeight = 300
    const padding = 20

    switch (step.position) {
      case 'top':
        return {
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          bottom: window.innerHeight - targetRect.top + padding,
        }
      case 'bottom':
        return {
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          top: targetRect.bottom + padding,
        }
      case 'left':
        return {
          right: window.innerWidth - targetRect.left + padding,
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        }
      case 'right':
        return {
          left: targetRect.right + padding,
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        }
      case 'center':
        return {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }
      default:
        return {}
    }
  }

  const icons = {
    info: <Info className="w-6 h-6" />,
    help: <HelpCircle className="w-6 h-6" />,
    lightbulb: <Lightbulb className="w-6 h-6" />,
    target: <Target className="w-6 h-6" />,
    award: <Award className="w-6 h-6" />,
    sparkles: <Sparkles className="w-6 h-6" />,
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] pointer-events-none"
      >
        {/* Backdrop with cutout */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-auto"
          style={{ cursor: step.canSkip ? 'pointer' : 'default' }}
          onClick={step.canSkip ? skipTour : undefined}
        >
          <defs>
            <mask id="cutout-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask={targetRect ? 'url(#cutout-mask)' : undefined}
          />
        </svg>

        {/* Highlight border */}
        {targetRect && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute border-4 border-gold-500 rounded-lg pointer-events-none"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          >
            {/* Pulsing effect */}
            <motion.div
              className="absolute inset-0 border-4 border-gold-500 rounded-lg"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.div>
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed w-96 max-w-[90vw] bg-white dark:bg-navy-900 rounded-lg shadow-elevation-5 border-2 border-gold-500/20 pointer-events-auto"
          style={step.position === 'center' ? {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          } : getTooltipPosition()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gold-500/10">
            <div className="flex items-center gap-3">
              <div className="text-gold-500">
                {step.icon || icons.lightbulb}
              </div>
              <h3 className="text-lg font-semibold text-navy-900 dark:text-gold-100">
                {step.title}
              </h3>
            </div>
            {step.canSkip && (
              <button
                onClick={skipTour}
                className="p-1 rounded hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
              >
                <X className="w-5 h-5 text-navy-600 dark:text-gold-400" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {step.image && (
              <img
                src={step.image}
                alt={step.title}
                className="w-full h-40 object-cover rounded-lg mb-4"
              />
            )}
            
            {step.video && (
              <video
                src={step.video}
                controls
                className="w-full h-40 rounded-lg mb-4"
              />
            )}

            <p className="text-sm text-navy-700 dark:text-gold-300">
              {step.content}
            </p>

            {step.actions && step.actions.length > 0 && (
              <div className="flex gap-2 mt-4">
                {step.actions.map((action, index) => {
                  const variants = {
                    primary: 'bg-gold-500 hover:bg-gold-600 text-navy-900',
                    secondary: 'bg-navy-600 hover:bg-navy-700 text-gold-100',
                    ghost: 'hover:bg-navy-100 dark:hover:bg-navy-800 text-navy-700 dark:text-gold-300',
                  }

                  return (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className={`
                        px-4 py-2 text-sm font-medium rounded-lg
                        transition-colors duration-200
                        ${variants[action.variant || 'ghost']}
                      `}
                    >
                      {action.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gold-500/10">
            <div className="flex items-center gap-2">
              {/* Progress dots */}
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => index <= currentStep && goToStep(index)}
                  disabled={index > currentStep}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-200
                    ${index === currentStep
                      ? 'w-8 bg-gold-500'
                      : index < currentStep
                      ? 'bg-gold-500'
                      : 'bg-navy-300 dark:bg-navy-700'
                    }
                    ${index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-sm font-medium text-navy-700 dark:text-gold-300 hover:bg-navy-100 dark:hover:bg-navy-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 inline mr-1" />
                  Anterior
                </button>
              )}
              
              <button
                onClick={nextStep}
                className="px-4 py-2 text-sm font-medium bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-lg transition-colors"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Concluir
                    <Check className="w-4 h-4 inline ml-1" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-4 h-4 inline ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Tour Trigger Component
interface TourTriggerProps {
  tourId: string
  steps: OnboardingStep[]
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function TourTrigger({
  tourId,
  steps,
  children,
  icon,
  className = '',
}: TourTriggerProps) {
  const { startTour, completedTours } = useOnboarding()
  const isCompleted = completedTours.includes(tourId)

  return (
    <button
      onClick={() => startTour(tourId, steps)}
      className={`
        inline-flex items-center gap-2
        ${isCompleted ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {icon || <HelpCircle className="w-4 h-4" />}
      {children}
      {isCompleted && <Check className="w-4 h-4 text-success-500" />}
    </button>
  )
}

// Progress Tracker Component
export function OnboardingProgress() {
  const { completedTours } = useOnboarding()
  const totalTours = 5 // This should be dynamic based on your tours
  const progress = (completedTours.length / totalTours) * 100

  return (
    <div className="bg-white dark:bg-navy-900 rounded-lg p-4 border-2 border-gold-500/20">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-navy-700 dark:text-gold-300">
          Progresso do Tour
        </h4>
        <span className="text-sm text-navy-600 dark:text-gold-600">
          {completedTours.length}/{totalTours}
        </span>
      </div>
      
      <div className="w-full h-2 bg-navy-200 dark:bg-navy-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gold-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {progress === 100 && (
        <div className="mt-2 text-sm text-success-500 flex items-center gap-1">
          <Award className="w-4 h-4" />
          Tour completo!
        </div>
      )}
    </div>
  )
}