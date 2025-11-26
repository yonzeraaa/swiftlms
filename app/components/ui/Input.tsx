'use client'

import { forwardRef, useState, useEffect, InputHTMLAttributes, ReactNode } from 'react'
import { Eye, EyeOff, Check, X, AlertCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  success?: string
  hint?: string
  variant?: 'outlined' | 'filled' | 'underlined'
  size?: 'sm' | 'md' | 'lg'
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  showPasswordToggle?: boolean
  loading?: boolean
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    validate?: (value: string) => boolean | string
  }
  onValidChange?: (isValid: boolean) => void
  animated?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  success,
  hint,
  variant = 'outlined',
  size = 'md',
  leftIcon,
  rightIcon,
  showPasswordToggle = false,
  loading = false,
  validation,
  onValidChange,
  animated = true,
  className = '',
  type = 'text',
  disabled = false,
  value,
  onChange,
  onBlur,
  onFocus,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [internalValue, setInternalValue] = useState(value || '')
  const [internalError, setInternalError] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [touched, setTouched] = useState(false)

  // Validate input
  useEffect(() => {
    if (!validation || !touched) return

    const val = String(internalValue)
    let errorMsg = ''
    let valid = true

    if (validation.required && !val) {
      errorMsg = 'Este campo é obrigatório'
      valid = false
    } else if (validation.minLength && val.length < validation.minLength) {
      errorMsg = `Mínimo de ${validation.minLength} caracteres`
      valid = false
    } else if (validation.maxLength && val.length > validation.maxLength) {
      errorMsg = `Máximo de ${validation.maxLength} caracteres`
      valid = false
    } else if (validation.pattern && !validation.pattern.test(val)) {
      errorMsg = 'Formato inválido'
      valid = false
    } else if (validation.validate) {
      const result = validation.validate(val)
      if (typeof result === 'string') {
        errorMsg = result
        valid = false
      } else {
        valid = result
      }
    }

    setInternalError(errorMsg)
    setIsValid(valid && !!val)
    onValidChange?.(valid && !!val)
  }, [internalValue, validation, touched, onValidChange])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value)
    if (!touched) setTouched(true)
    onChange?.(e)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    if (!touched) setTouched(true)
    onBlur?.(e)
  }

  const sizes = {
    sm: {
      input: 'px-3 py-1.5 text-sm',
      label: 'text-xs',
      icon: 'w-4 h-4',
    },
    md: {
      input: 'px-4 py-2.5 text-base',
      label: 'text-sm',
      icon: 'w-5 h-5',
    },
    lg: {
      input: 'px-5 py-3.5 text-lg',
      label: 'text-base',
      icon: 'w-6 h-6',
    },
  }

  const variants = {
    outlined: {
      base: 'border-2 rounded-lg bg-transparent',
      normal: 'border-navy-700/30 dark:border-gold-500/20',
      focus: 'border-gold-500 dark:border-gold-400',
      error: 'border-error-500 dark:border-error-400',
      success: 'border-success-500 dark:border-success-400',
      disabled: 'bg-navy-100/50 dark:bg-navy-900/50 cursor-not-allowed opacity-60',
    },
    filled: {
      base: 'border-b-2 rounded-t-lg bg-navy-100/50 dark:bg-navy-900/50',
      normal: 'border-navy-700/30 dark:border-gold-500/20',
      focus: 'border-gold-500 dark:border-gold-400 bg-navy-100 dark:bg-navy-900',
      error: 'border-error-500 dark:border-error-400',
      success: 'border-success-500 dark:border-success-400',
      disabled: 'cursor-not-allowed opacity-60',
    },
    underlined: {
      base: 'border-b-2 bg-transparent pb-1',
      normal: 'border-navy-700/30 dark:border-gold-500/20',
      focus: 'border-gold-500 dark:border-gold-400',
      error: 'border-error-500 dark:border-error-400',
      success: 'border-success-500 dark:border-success-400',
      disabled: 'cursor-not-allowed opacity-60',
    },
  }

  const getVariantClass = () => {
    const v = variants[variant]
    let state = v.normal
    
    if (disabled) state = v.disabled
    else if (error || internalError) state = v.error
    else if (success || (isValid && touched)) state = v.success
    else if (isFocused) state = v.focus

    return `${v.base} ${state}`
  }

  const showError = error || (internalError && touched)
  const showSuccess = success || (isValid && touched && !showError)

  const inputType = showPasswordToggle && showPassword ? 'text' : type

  return (
    <div className={`relative ${className}`}>
      {label && (
        <motion.label
          initial={false}
          animate={animated ? {
            fontSize: isFocused || internalValue ? '0.75rem' : '1rem',
            top: isFocused || internalValue ? '-0.5rem' : '0.875rem',
            color: isFocused ? '#FFD700' : '#B39700',
          } : {}}
          className={`
            absolute left-3 px-1 
            bg-white dark:bg-navy-950 
            pointer-events-none z-10
            transition-all duration-200
            ${sizes[size].label}
            ${variant === 'underlined' ? 'left-0' : ''}
          `}
        >
          {label}
        </motion.label>
      )}

      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-navy-600 dark:text-gold-400 ${sizes[size].icon}`}>
            {leftIcon}
          </div>
        )}

        {/* Input Field */}
        <input
          ref={ref}
          type={inputType}
          value={internalValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={`
            w-full
            ${sizes[size].input}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon || showPasswordToggle || loading || showError || showSuccess ? 'pr-10' : ''}
            ${getVariantClass()}
            text-navy-900 dark:text-gold-100
            placeholder-navy-400 dark:placeholder-gold-600
            focus:outline-none
            transition-all duration-200
            ${animated ? 'transform hover:scale-[1.01]' : ''}
          `}
          {...props}
        />

        {/* Right Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold-500 border-t-transparent" />
          )}
          
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-navy-600 dark:text-gold-400 hover:text-navy-800 dark:hover:text-gold-200 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className={sizes[size].icon} />
              ) : (
                <Eye className={sizes[size].icon} />
              )}
            </button>
          )}

          {showSuccess && !loading && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-success-500"
            >
              <Check className={sizes[size].icon} />
            </motion.div>
          )}

          {showError && !loading && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-error-500"
            >
              <AlertCircle className={sizes[size].icon} />
            </motion.div>
          )}

          {rightIcon && !showPasswordToggle && !loading && !showError && !showSuccess && (
            <div className="text-navy-600 dark:text-gold-400">
              {rightIcon}
            </div>
          )}
        </div>
      </div>

      {/* Helper Text */}
      <AnimatePresence mode="wait">
        {showError && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-1 text-sm text-error-500 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {error || internalError}
          </motion.p>
        )}

        {showSuccess && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-1 text-sm text-success-500 flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            {success}
          </motion.p>
        )}

        {hint && !showError && !showSuccess && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-1 text-sm text-navy-600 dark:text-gold-600 flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            {hint}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Progress Bar for MaxLength */}
      {validation?.maxLength && touched && (
        <div className="mt-2">
          <div className="h-1 bg-navy-200 dark:bg-navy-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ 
                width: `${(String(internalValue).length / validation.maxLength) * 100}%`,
                backgroundColor: String(internalValue).length > validation.maxLength * 0.9 
                  ? '#EF4444' 
                  : String(internalValue).length > validation.maxLength * 0.7 
                  ? '#F59E0B' 
                  : '#22C55E'
              }}
              className="h-full transition-all duration-300"
            />
          </div>
          <p className="text-xs text-navy-600 dark:text-gold-600 mt-1 text-right">
            {String(internalValue).length} / {validation.maxLength}
          </p>
        </div>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input