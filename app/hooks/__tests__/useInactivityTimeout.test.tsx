import React from 'react'
import { render, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInactivityTimeout } from '../useInactivityTimeout'

const pushMock = vi.fn()
const signOutActionMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/lib/actions/auth', () => ({
  signOutAction: (...args: unknown[]) => signOutActionMock(...args),
}))

const STORAGE_KEY = 'last_activity_timestamp'
const SESSION_STORAGE_KEY = 'last_activity_session_key'
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000

function HookHarness({
  enabled = true,
  sessionKey,
}: {
  enabled?: boolean
  sessionKey?: string | null
}) {
  useInactivityTimeout(enabled, sessionKey)
  return null
}

describe('useInactivityTimeout', () => {
  const now = new Date('2026-03-23T12:00:00.000Z')

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(now.getTime())
    localStorage.clear()
    pushMock.mockReset()
    signOutActionMock.mockReset()
    signOutActionMock.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('resets stored inactivity state when a new authenticated session starts', async () => {
    localStorage.setItem(STORAGE_KEY, String(now.getTime() - INACTIVITY_TIMEOUT_MS - 1))
    localStorage.setItem(SESSION_STORAGE_KEY, 'student-1:old-expiry')

    render(<HookHarness sessionKey="student-1:new-expiry" />)

    await waitFor(() => {
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBe('student-1:new-expiry')
    })

    expect(localStorage.getItem(STORAGE_KEY)).toBe(String(now.getTime()))
    expect(signOutActionMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('keeps logging out when the inactivity timestamp belongs to the current session', async () => {
    localStorage.setItem(STORAGE_KEY, String(now.getTime() - INACTIVITY_TIMEOUT_MS - 1))
    localStorage.setItem(SESSION_STORAGE_KEY, 'student-1:same-expiry')

    render(<HookHarness sessionKey="student-1:same-expiry" />)

    await waitFor(() => {
      expect(signOutActionMock).toHaveBeenCalledTimes(1)
    })

    expect(pushMock).toHaveBeenCalledWith('/')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})
