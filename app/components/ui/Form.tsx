'use client'

import { forwardRef, useImperativeHandle } from 'react'
import { useForm, UseFormReturn, FieldValues, Path, PathValue, DefaultValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import Input from './Input'
import Select from './Select'

// Form context types
interface FormContextValue<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>
}

// Form component props
interface FormProps<TFieldValues extends FieldValues = FieldValues> {
  schema?: z.ZodType<TFieldValues, any, any>
  defaultValues?: DefaultValues<TFieldValues>
  onSubmit: (data: TFieldValues) => void | Promise<void>
  children: React.ReactNode | ((form: UseFormReturn<TFieldValues>) => React.ReactNode)
  className?: string
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all'
}

// Form component
export function Form<TFieldValues extends FieldValues = FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className = '',
  mode = 'onBlur',
}: FormProps<TFieldValues>) {
  const form = useForm<TFieldValues>({
    resolver: schema ? (zodResolver as any)(schema) : undefined,
    defaultValues,
    mode,
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  })

  return (
    <form onSubmit={handleSubmit} className={className}>
      {typeof children === 'function' ? children(form) : children}
    </form>
  )
}

// Form Field component
interface FormFieldProps {
  name: string
  label?: string
  required?: boolean
  hint?: string
  children: React.ReactElement
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(({
  name,
  label,
  required,
  hint,
  children,
}, ref) => {
  return (
    <div ref={ref} className="space-y-2">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-navy-700 dark:text-gold-300">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && (
        <p className="text-xs text-navy-600 dark:text-gold-600">{hint}</p>
      )}
    </div>
  )
})

FormField.displayName = 'FormField'

// Form Input component (integrates with react-hook-form)
interface FormInputProps {
  form: UseFormReturn<any>
  name: string
  label?: string
  type?: string
  placeholder?: string
  required?: boolean
  hint?: string
  variant?: 'outlined' | 'filled' | 'underlined'
  size?: 'sm' | 'md' | 'lg'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  disabled?: boolean
  autoComplete?: string
}

export function FormInput({
  form,
  name,
  label,
  type = 'text',
  placeholder,
  required,
  hint,
  variant = 'outlined',
  size = 'md',
  leftIcon,
  rightIcon,
  disabled,
  autoComplete,
}: FormInputProps) {
  const { register, formState: { errors } } = form
  const error = errors[name]

  return (
    <FormField name={name} label={label} required={required} hint={hint}>
      <div>
        <Input
          {...register(name)}
          id={name}
          type={type}
          placeholder={placeholder}
          variant={variant}
          size={size}
          error={typeof error?.message === 'string' ? error.message : undefined}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          disabled={disabled}
          autoComplete={autoComplete}
        />
      </div>
    </FormField>
  )
}

// Form Select component
interface FormSelectProps {
  form: UseFormReturn<any>
  name: string
  label?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
  required?: boolean
  hint?: string
  multiple?: boolean
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
}

export function FormSelect({
  form,
  name,
  label,
  options,
  placeholder,
  required,
  hint,
  multiple,
  searchable,
  clearable,
  disabled,
}: FormSelectProps) {
  const { setValue, watch, formState: { errors } } = form
  const value = watch(name)
  const error = errors[name]

  return (
    <FormField name={name} label={label} required={required} hint={hint}>
      <Select
        options={options}
        value={value}
        onChange={(val) => setValue(name, val as PathValue<any, Path<any>>)}
        placeholder={placeholder}
        error={typeof error?.message === 'string' ? error.message : undefined}
        multiple={multiple}
        searchable={searchable}
        clearable={clearable}
        disabled={disabled}
      />
    </FormField>
  )
}

// Form Textarea component
interface FormTextareaProps {
  form: UseFormReturn<any>
  name: string
  label?: string
  placeholder?: string
  required?: boolean
  hint?: string
  rows?: number
  maxLength?: number
  disabled?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export function FormTextarea({
  form,
  name,
  label,
  placeholder,
  required,
  hint,
  rows = 4,
  maxLength,
  disabled,
  resize = 'vertical',
}: FormTextareaProps) {
  const { register, watch, formState: { errors } } = form
  const value = watch(name) || ''
  const error = errors[name]

  return (
    <FormField name={name} label={label} required={required} hint={hint}>
      <div className="relative">
        <textarea
          {...register(name)}
          id={name}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-lg border-2 transition-all duration-200
            ${error 
              ? 'border-error-500 focus:border-error-600' 
              : 'border-navy-700/30 dark:border-gold-500/20 focus:border-gold-500 dark:focus:border-gold-400'
            }
            bg-white dark:bg-navy-900
            text-navy-900 dark:text-gold-100
            placeholder-navy-400 dark:placeholder-gold-600
            focus:outline-none focus:ring-2 focus:ring-gold-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-${resize}
          `}
        />
        {maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-navy-600 dark:text-gold-600">
            {value.length}/{maxLength}
          </div>
        )}
        {error && typeof error.message === 'string' && (
          <p className="mt-1 text-sm text-error-500">{error.message}</p>
        )}
      </div>
    </FormField>
  )
}

// Form Checkbox component
interface FormCheckboxProps {
  form: UseFormReturn<any>
  name: string
  label: string
  hint?: string
  disabled?: boolean
}

export function FormCheckbox({
  form,
  name,
  label,
  hint,
  disabled,
}: FormCheckboxProps) {
  const { register, formState: { errors } } = form
  const error = errors[name]

  return (
    <div className="space-y-1">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          {...register(name)}
          type="checkbox"
          disabled={disabled}
          className="
            mt-1 w-5 h-5 rounded border-2 
            border-navy-700/30 dark:border-gold-500/20
            text-gold-500 
            focus:ring-2 focus:ring-gold-500/20 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        />
        <div className="flex-1">
          <span className="text-sm font-medium text-navy-900 dark:text-gold-100">
            {label}
          </span>
          {hint && (
            <p className="text-xs text-navy-600 dark:text-gold-600 mt-1">{hint}</p>
          )}
        </div>
      </label>
      {error && typeof error.message === 'string' && (
        <p className="text-sm text-error-500">{error.message}</p>
      )}
    </div>
  )
}

// Form Radio Group component
interface FormRadioGroupProps {
  form: UseFormReturn<any>
  name: string
  label?: string
  options: Array<{ value: string; label: string; hint?: string }>
  required?: boolean
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
}

export function FormRadioGroup({
  form,
  name,
  label,
  options,
  required,
  disabled,
  orientation = 'vertical',
}: FormRadioGroupProps) {
  const { register, formState: { errors } } = form
  const error = errors[name]

  return (
    <FormField name={name} label={label} required={required}>
      <div className={`
        ${orientation === 'horizontal' ? 'flex flex-wrap gap-6' : 'space-y-3'}
      `}>
        {options.map((option) => (
          <label key={option.value} className="flex items-start gap-3 cursor-pointer">
            <input
              {...register(name)}
              type="radio"
              value={option.value}
              disabled={disabled}
              className="
                mt-1 w-5 h-5 border-2 
                border-navy-700/30 dark:border-gold-500/20
                text-gold-500 
                focus:ring-2 focus:ring-gold-500/20 focus:ring-offset-0
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-navy-900 dark:text-gold-100">
                {option.label}
              </span>
              {option.hint && (
                <p className="text-xs text-navy-600 dark:text-gold-600 mt-1">{option.hint}</p>
              )}
            </div>
          </label>
        ))}
        {error && typeof error.message === 'string' && (
          <p className="text-sm text-error-500">{error.message}</p>
        )}
      </div>
    </FormField>
  )
}

// Form Submit Button
interface FormSubmitProps {
  form: UseFormReturn<any>
  children: React.ReactNode
  loadingText?: string
  className?: string
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function FormSubmit({
  form,
  children,
  loadingText = 'Enviando...',
  className = '',
  disabled,
  variant = 'primary',
  size = 'md',
}: FormSubmitProps) {
  const { formState: { isSubmitting, isValid } } = form

  const variants = {
    primary: 'bg-gold-500 hover:bg-gold-600 text-navy-900',
    secondary: 'bg-navy-600 hover:bg-navy-700 text-gold-100',
    outline: 'border-2 border-gold-500 hover:bg-gold-500/10 text-gold-500',
    ghost: 'hover:bg-gold-500/10 text-gold-500',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <motion.button
      type="submit"
      disabled={disabled || isSubmitting || !isValid}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        font-medium rounded-lg
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-gold-500/20
        ${className}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <AnimatePresence mode="wait">
        {isSubmitting ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {loadingText}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// Form Error Summary
interface FormErrorSummaryProps {
  form: UseFormReturn<any>
}

export function FormErrorSummary({ form }: FormErrorSummaryProps) {
  const { formState: { errors } } = form
  const errorKeys = Object.keys(errors)

  if (errorKeys.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-error-50 dark:bg-error-900/20 border-2 border-error-500/20 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-error-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-error-900 dark:text-error-400">
            Erros encontrados
          </h3>
          <ul className="mt-2 space-y-1">
            {errorKeys.map((key) => (
              <li key={key} className="text-sm text-error-700 dark:text-error-300">
                • {typeof errors[key]?.message === 'string' ? errors[key]?.message : `Erro no campo ${key}`}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}

// Form Success Message
interface FormSuccessProps {
  message: string
  onClose?: () => void
}

export function FormSuccess({ message, onClose }: FormSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-success-50 dark:bg-success-900/20 border-2 border-success-500/20 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-success-500 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-success-900 dark:text-success-400">
            {message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-success-700 dark:text-success-500 hover:text-success-900 dark:hover:text-success-300"
          >
            ×
          </button>
        )}
      </div>
    </motion.div>
  )
}

// Form Info Message
interface FormInfoProps {
  message: string
  icon?: React.ReactNode
}

export function FormInfo({ message, icon }: FormInfoProps) {
  return (
    <div className="bg-info-50 dark:bg-info-900/20 border-2 border-info-500/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        {icon || <Info className="w-5 h-5 text-info-500 mt-0.5" />}
        <p className="text-sm text-info-900 dark:text-info-400">
          {message}
        </p>
      </div>
    </div>
  )
}