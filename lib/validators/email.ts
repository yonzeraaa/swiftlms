export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase()
}
