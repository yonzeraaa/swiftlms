import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '@/lib/utils/logger'

describe('SecureLogger', () => {
  let consoleDebugSpy: any
  let consoleInfoSpy: any
  let consoleWarnSpy: any
  let consoleErrorSpy: any
  let originalEnv: string | undefined

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    originalEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env.NODE_ENV = originalEnv
  })

  describe('sanitization', () => {
    it('should redact password fields', () => {
      process.env.NODE_ENV = 'development'

      logger.info('User data', { username: 'john', password: 'secret123' })

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('[REDACTED]')
      expect(logCall).not.toContain('secret123')
      expect(logCall).toContain('john')
    })

    it('should mask email addresses', () => {
      process.env.NODE_ENV = 'development'

      logger.info('User data', { email: 'john.doe@example.com' })

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('jo***@example.com')
      expect(logCall).not.toContain('john.doe@example.com')
    })

    it('should mask tokens partially', () => {
      process.env.NODE_ENV = 'development'

      logger.info('Auth data', { access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' })

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('eyJhbG')
      expect(logCall).toContain('VCJ9')
      expect(logCall).toContain('...')
      expect(logCall).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    })

    it('should redact short tokens completely', () => {
      process.env.NODE_ENV = 'development'

      logger.info('Auth data', { token: 'short' })

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('[REDACTED]')
      expect(logCall).not.toContain('short')
    })

    it('should redact all sensitive fields', () => {
      process.env.NODE_ENV = 'development'

      const sensitiveData = {
        username: 'john',
        password: 'mypassword123',
        refresh_token: 'token123',
        phone: '555-1234',
        ssn: '123-45-6789',
        credit_card: '4111-1111-1111-1111',
        api_key: 'key123',
        secret: 'secret_value',
        private_key: 'private123',
      }

      logger.info('Sensitive data', sensitiveData)

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('[REDACTED]')
      expect(logCall).not.toContain('mypassword123')
      expect(logCall).not.toContain('token123')
      expect(logCall).not.toContain('555-1234')
      expect(logCall).not.toContain('secret_value')
      expect(logCall).toContain('john') // username is not sensitive
    })

    it('should sanitize nested objects', () => {
      process.env.NODE_ENV = 'development'

      logger.info('Nested data', {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
          },
        },
      })

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('John')
      expect(logCall).toContain('[REDACTED]')
      expect(logCall).not.toContain('secret')
    })

    it('should sanitize arrays', () => {
      process.env.NODE_ENV = 'development'

      logger.info('Array data', {
        users: [
          { name: 'John', password: 'secret1' },
          { name: 'Jane', password: 'secret2' },
        ],
      })

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('John')
      expect(logCall).toContain('Jane')
      expect(logCall).toContain('[REDACTED]')
      expect(logCall).not.toContain('secret1')
      expect(logCall).not.toContain('secret2')
    })
  })

  describe('log levels', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should log debug messages in development', () => {
      logger.debug('Debug message', { data: 'value' })

      expect(consoleDebugSpy).toHaveBeenCalledOnce()
      const logCall = consoleDebugSpy.mock.calls[0][0]
      expect(logCall).toContain('Debug message')
      expect(logCall).toContain('value')
    })

    it('should log info messages in development', () => {
      logger.info('Info message')

      expect(consoleInfoSpy).toHaveBeenCalledOnce()
      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('Info message')
    })

    it('should log warn messages in development', () => {
      logger.warn('Warning message')

      expect(consoleWarnSpy).toHaveBeenCalledOnce()
      const logCall = consoleWarnSpy.mock.calls[0][0]
      expect(logCall).toContain('Warning message')
    })

    it('should always log error messages', () => {
      process.env.NODE_ENV = 'production'

      const error = new Error('Test error')
      logger.error('Error occurred', error)

      expect(consoleErrorSpy).toHaveBeenCalledOnce()
      const logCall = consoleErrorSpy.mock.calls[0][0]
      expect(logCall).toContain('Error occurred')
      expect(logCall).toContain('Test error')
    })
  })

  describe('environment handling', () => {
    it('should log in development mode', () => {
      process.env.NODE_ENV = 'development'

      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')

      expect(consoleDebugSpy).toHaveBeenCalledOnce()
      expect(consoleInfoSpy).toHaveBeenCalledOnce()
      expect(consoleWarnSpy).toHaveBeenCalledOnce()
    })

    it('should allow forcing logs with forceProduction flag', () => {
      process.env.NODE_ENV = 'development'

      logger.info('Forced message', null, { forceProduction: true })

      expect(consoleInfoSpy).toHaveBeenCalledOnce()
    })
  })

  describe('context handling', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should include context in log message', () => {
      logger.info('Message', null, { context: 'TestContext' })

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('[TestContext]')
      expect(logCall).toContain('Message')
    })

    it('should format messages with timestamp', () => {
      logger.info('Message')

      const logCall = consoleInfoSpy.mock.calls[0][0]
      // Should contain ISO timestamp
      expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should format error objects with stack trace', () => {
      const error = new Error('Test error')
      error.name = 'TestError'

      logger.error('Error message', error)

      const logCall = consoleErrorSpy.mock.calls[0][0]
      expect(logCall).toContain('Test error')
      expect(logCall).toContain('TestError')
      expect(logCall).toContain('stack')
    })

    it('should sanitize non-Error error objects', () => {
      process.env.NODE_ENV = 'development'

      logger.error('Error message', { password: 'secret', message: 'Failed' })

      const logCall = consoleErrorSpy.mock.calls[0][0]
      expect(logCall).toContain('[REDACTED]')
      expect(logCall).toContain('Failed')
      expect(logCall).not.toContain('secret')
    })
  })

  describe('data formatting', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should format data as JSON', () => {
      logger.info('Message', { key: 'value', nested: { prop: 123 } })

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('"key"')
      expect(logCall).toContain('"value"')
      expect(logCall).toContain('"nested"')
      expect(logCall).toContain('"prop"')
      expect(logCall).toContain('123')
    })

    it('should handle null data', () => {
      logger.info('Message', null)

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('Message')
      expect(logCall).not.toContain('null')
    })

    it('should handle undefined data', () => {
      logger.info('Message', undefined)

      const logCall = consoleInfoSpy.mock.calls[0][0]
      expect(logCall).toContain('Message')
      expect(logCall).not.toContain('undefined')
    })

    it('should handle primitive data types', () => {
      logger.info('String', 'test')
      logger.info('Number', 123)
      logger.info('Boolean', true)

      expect(consoleInfoSpy).toHaveBeenCalledTimes(3)
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('"test"')
      expect(consoleInfoSpy.mock.calls[1][0]).toContain('123')
      expect(consoleInfoSpy.mock.calls[2][0]).toContain('true')
    })
  })
})
