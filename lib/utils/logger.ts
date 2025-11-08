/**
 * Secure logger utility that filters PII and sensitive data
 * Only logs in development environment by default
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogOptions {
  level?: LogLevel
  forceProduction?: boolean
  context?: string
}

/**
 * Sanitizes data by removing sensitive fields
 */
function sanitizeData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData)
  }

  const sanitized: any = {}
  const sensitiveFields = [
    'password',
    'token',
    'access_token',
    'refresh_token',
    'email',
    'phone',
    'ssn',
    'credit_card',
    'api_key',
    'secret',
    'private_key',
  ]

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()

    // Check if key contains sensitive terms
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field))

    if (isSensitive) {
      // Mask sensitive data
      if (key.toLowerCase().includes('email')) {
        const emailStr = String(value)
        const atIndex = emailStr.indexOf('@')
        if (atIndex > 0) {
          sanitized[key] = `${emailStr.substring(0, 2)}***@${emailStr.split('@')[1]}`
        } else {
          sanitized[key] = '[REDACTED]'
        }
      } else if (key.toLowerCase().includes('token')) {
        const tokenStr = String(value)
        sanitized[key] = tokenStr.length > 10
          ? `${tokenStr.substring(0, 6)}...${tokenStr.substring(tokenStr.length - 4)}`
          : '[REDACTED]'
      } else {
        sanitized[key] = '[REDACTED]'
      }
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeData(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Secure logger class
 */
class SecureLogger {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production'
  }

  private shouldLog(forceProduction?: boolean): boolean {
    return this.isDevelopment || forceProduction === true
  }

  private formatMessage(context: string | undefined, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = context ? `[${context}]` : ''
    const dataStr = data ? ` ${JSON.stringify(sanitizeData(data), null, 2)}` : ''
    return `${timestamp} ${prefix} ${message}${dataStr}`
  }

  debug(message: string, data?: any, options: LogOptions = {}): void {
    if (!this.shouldLog(options.forceProduction)) return
    console.debug(this.formatMessage(options.context, message, data))
  }

  info(message: string, data?: any, options: LogOptions = {}): void {
    if (!this.shouldLog(options.forceProduction)) return
    console.info(this.formatMessage(options.context, message, data))
  }

  warn(message: string, data?: any, options: LogOptions = {}): void {
    if (!this.shouldLog(options.forceProduction)) return
    console.warn(this.formatMessage(options.context, message, data))
  }

  error(message: string, error?: Error | any, options: LogOptions = {}): void {
    // Always log errors, even in production
    const sanitizedError = error instanceof Error
      ? {
          message: error.message,
          name: error.name,
          stack: this.isDevelopment ? error.stack : '[REDACTED]',
        }
      : sanitizeData(error)

    console.error(this.formatMessage(options.context, message, sanitizedError))
  }
}

// Export singleton instance
export const logger = new SecureLogger()

// Export types
export type { LogLevel, LogOptions }
