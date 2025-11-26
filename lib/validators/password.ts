export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = []

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Senha é obrigatória'] }
  }

  if (password.length < 8) {
    errors.push('Senha deve ter no mínimo 8 caracteres')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const isPasswordStrong = (password: string): boolean => {
  return validatePassword(password).isValid
}
