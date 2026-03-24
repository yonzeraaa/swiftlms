import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createNewUser } from '../users-management'

const createClientMock = vi.mocked(createClient)
const createAdminClientMock = vi.mocked(createAdminClient)

describe('createNewUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new user with the admin client without calling signUp on the active session', async () => {
    const signUp = vi.fn()
    const serverClient = makeServerClient({ currentUserId: 'admin-1', role: 'admin', signUp })
    const adminClient = makeAdminClient({ createdUserId: 'student-1' })

    createClientMock.mockResolvedValue(serverClient as any)
    createAdminClientMock.mockReturnValue(adminClient as any)

    const result = await createNewUser({
      email: 'student@example.com',
      password: 'Student123!',
      full_name: 'Aluno Teste',
      phone: '(11) 99999-9999',
      role: 'student',
    })

    expect(result).toEqual({ success: true })
    expect(signUp).not.toHaveBeenCalled()
    expect(adminClient.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'Student123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Aluno Teste',
        role: 'student',
        phone: '(11) 99999-9999',
      },
    })
    expect(adminClient.profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'student-1',
        email: 'student@example.com',
        full_name: 'Aluno Teste',
        phone: '(11) 99999-9999',
        role: 'student',
        status: 'active',
      })
    )
  })

  it('rejects non-admin users before attempting administrative creation', async () => {
    const signUp = vi.fn()
    const serverClient = makeServerClient({ currentUserId: 'teacher-1', role: 'instructor', signUp })

    createClientMock.mockResolvedValue(serverClient as any)

    const result = await createNewUser({
      email: 'student@example.com',
      password: 'Student123!',
      full_name: 'Aluno Teste',
      phone: '',
      role: 'student',
    })

    expect(result).toEqual({ success: false, error: 'Sem permissão para criar usuários' })
    expect(signUp).not.toHaveBeenCalled()
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})

function makeServerClient(params: {
  currentUserId: string
  role: string
  signUp: ReturnType<typeof vi.fn>
}) {
  const { currentUserId, role, signUp } = params

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: currentUserId } },
        error: null,
      }),
      signUp,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role },
            error: null,
          }),
        })),
      })),
    })),
  }
}

function makeAdminClient(params: { createdUserId: string }) {
  const { createdUserId } = params
  const profileUpsert = vi.fn().mockResolvedValue({ error: null })

  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: createdUserId,
            },
          },
          error: null,
        }),
      },
    },
    from: vi.fn(() => ({
      upsert: profileUpsert,
    })),
    profileUpsert,
  }
}
