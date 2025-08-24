import { useState, useCallback } from 'react'

interface UseFormSubmissionOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
  successMessage?: string
  errorMessage?: string
}

interface UseFormSubmissionResult<T> {
  submit: (data: T) => Promise<void>
  loading: boolean
  error: Error | null
  success: boolean
  reset: () => void
}

export function useFormSubmission<T>(
  submitFn: (data: T) => Promise<void>,
  options?: UseFormSubmissionOptions
): UseFormSubmissionResult<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [success, setSuccess] = useState(false)

  const submit = useCallback(async (data: T) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)
      
      await submitFn(data)
      
      setSuccess(true)
      
      if (options?.successMessage) {
        // You could integrate with a toast notification system here
        console.log(options.successMessage)
      }
      
      if (options?.onSuccess) {
        options.onSuccess()
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Submission failed')
      setError(error)
      
      if (options?.errorMessage) {
        console.error(options.errorMessage, error)
      }
      
      if (options?.onError) {
        options.onError(error)
      }
    } finally {
      setLoading(false)
    }
  }, [submitFn, options])

  const reset = useCallback(() => {
    setError(null)
    setSuccess(false)
    setLoading(false)
  }, [])

  return {
    submit,
    loading,
    error,
    success,
    reset
  }
}