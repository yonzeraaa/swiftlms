'use client'

const REMEMBER_LOGIN_STORAGE_KEY = 'swiftedu.remember_login'
const REMEMBERED_EMAIL_STORAGE_KEY = 'swiftedu.remembered_email'

type PasswordCredentialLike = Credential & {
  id: string
  password: string
}

type PasswordCredentialConstructor = new (data: {
  id: string
  password: string
  name?: string
}) => PasswordCredentialLike

function getCredentialsContainer(): CredentialsContainer | null {
  if (typeof navigator === 'undefined') {
    return null
  }

  return navigator.credentials ?? null
}

function getPasswordCredentialConstructor(): PasswordCredentialConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }

  const passwordCredential = (window as Window & {
    PasswordCredential?: PasswordCredentialConstructor
  }).PasswordCredential

  return typeof passwordCredential === 'function' ? passwordCredential : null
}

function isSecureCredentialContext() {
  return typeof window !== 'undefined' && window.isSecureContext
}

export function shouldRememberLogin() {
  if (typeof window === 'undefined') {
    return false
  }

  return localStorage.getItem(REMEMBER_LOGIN_STORAGE_KEY) === 'true'
}

export function getRememberedEmail() {
  if (typeof window === 'undefined') {
    return ''
  }

  return localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY) ?? ''
}

export function rememberLoginPreference(email: string) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(REMEMBER_LOGIN_STORAGE_KEY, 'true')
  localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, email)
}

export function clearRememberedLoginPreference() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(REMEMBER_LOGIN_STORAGE_KEY)
  localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY)
}

export async function storeRememberedBrowserCredential(email: string, password: string) {
  const credentials = getCredentialsContainer()
  const PasswordCredential = getPasswordCredentialConstructor()

  if (!credentials || !PasswordCredential || !isSecureCredentialContext()) {
    return false
  }

  try {
    const credential = new PasswordCredential({
      id: email,
      password,
      name: email,
    })

    await credentials.store(credential)
    return true
  } catch {
    return false
  }
}

export async function getRememberedBrowserCredential() {
  const credentials = getCredentialsContainer()

  if (!credentials || !isSecureCredentialContext() || !shouldRememberLogin()) {
    return null
  }

  try {
    const credential = await credentials.get({
      password: true,
      mediation: 'optional',
    } as CredentialRequestOptions)

    const passwordCredential = credential as PasswordCredentialLike | null

    if (
      passwordCredential?.type === 'password' &&
      typeof passwordCredential.id === 'string' &&
      typeof passwordCredential.password === 'string'
    ) {
      return {
        email: passwordCredential.id,
        password: passwordCredential.password,
      }
    }
  } catch {
    return null
  }

  return null
}
