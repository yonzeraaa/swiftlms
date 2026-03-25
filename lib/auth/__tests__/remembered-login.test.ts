import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearRememberedLoginPreference,
  getRememberedBrowserCredential,
  getRememberedEmail,
  rememberLoginPreference,
  shouldRememberLogin,
  storeRememberedBrowserCredential,
} from '../remembered-login'

class PasswordCredentialMock {
  id: string
  password: string
  type = 'password'

  constructor({ id, password }: { id: string; password: string }) {
    this.id = id
    this.password = password
  }
}

describe('remembered-login', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    })

    Object.defineProperty(window, 'PasswordCredential', {
      configurable: true,
      value: PasswordCredentialMock,
    })
  })

  it('persists and clears the remember-login preference', () => {
    rememberLoginPreference('student@example.com')

    expect(shouldRememberLogin()).toBe(true)
    expect(getRememberedEmail()).toBe('student@example.com')

    clearRememberedLoginPreference()

    expect(shouldRememberLogin()).toBe(false)
    expect(getRememberedEmail()).toBe('')
  })

  it('stores browser credentials when the api is available', async () => {
    const store = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        store,
      },
    })

    const stored = await storeRememberedBrowserCredential('student@example.com', 'super-secret')

    expect(stored).toBe(true)
    expect(store).toHaveBeenCalledTimes(1)
    expect(store).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'student@example.com',
        password: 'super-secret',
        type: 'password',
      })
    )
  })

  it('retrieves the remembered browser credential only when the preference is enabled', async () => {
    const get = vi.fn().mockResolvedValue({
      id: 'student@example.com',
      password: 'super-secret',
      type: 'password',
    })

    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        get,
      },
    })

    rememberLoginPreference('student@example.com')

    await expect(getRememberedBrowserCredential()).resolves.toEqual({
      email: 'student@example.com',
      password: 'super-secret',
    })

    expect(get).toHaveBeenCalledTimes(1)
  })
})
