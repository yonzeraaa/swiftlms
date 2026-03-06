import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { POST } from '../dummy-student/route'

const createClientMock = vi.mocked(createClient)
const createAdminClientMock = vi.mocked(createAdminClient)

describe('POST /api/admin/dummy-student', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any)

    const response = await POST()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Não autenticado' })
  })

  it('returns 403 when user is not admin', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { role: 'student' },
              error: null,
            }),
          })),
        })),
      })),
    } as any)

    const response = await POST()

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Acesso negado. Apenas administradores.' })
  })

  it('creates a fresh dummy student when no courses exist', async () => {
    createClientMock.mockResolvedValue(makeServerClient('admin-1') as any)
    createAdminClientMock.mockReturnValue(
      makeAdminClient({
        authUsers: [],
        courses: [],
        createdAuthUser: {
          id: 'dummy-auth-1',
          email: 'dummy.student+new@swiftlms.test',
        },
      }) as any
    )

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.userId).toBe('dummy-auth-1')
    expect(data.password).toBe('DummyStudent123!')
    expect(data.email).toMatch(/^dummy\.student\+.+@swiftlms\.test$/)
    expect(data.message).toContain('não há cursos')
  })

  it('falls back to rpc auth creation when admin createUser fails', async () => {
    createClientMock.mockResolvedValue(makeServerClient('admin-1') as any)
    createAdminClientMock.mockReturnValue(
      makeAdminClient({
        authUsers: [],
        courses: [],
        createUserError: 'Database error checking email',
        fallbackAuthUserId: 'dummy-auth-fallback',
      }) as any
    )

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.userId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(data.password).toBe('DummyStudent123!')
    expect(data.email).toMatch(/^dummy\.student\+.+@swiftlms\.test$/)
  })
})

function makeServerClient(adminUserId: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: adminUserId } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        })),
      })),
    })),
  }
}

function makeAdminClient(params: {
  authUsers: Array<{ id: string; email?: string | null }>
  courses: Array<{ id: string; title: string; duration_hours: number | null }>
  createdAuthUser?: { id: string; email: string }
  createUserError?: string
  fallbackAuthUserId?: string
}) {
  const {
    authUsers,
    courses,
    createdAuthUser,
    createUserError,
    fallbackAuthUserId,
  } = params

  return {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: authUsers },
          error: null,
        }),
        deleteUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        createUser: createUserError
          ? vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: createUserError },
            })
          : vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: createdAuthUser?.id,
                  email: createdAuthUser?.email,
                },
              },
              error: null,
            }),
        updateUserById: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: fallbackAuthUserId,
            },
          },
          error: null,
        }),
      },
    },
    rpc: vi.fn((fn: string) => {
      if (fn === 'ensure_restore_auth_users') {
        return Promise.resolve({ data: { success: true }, error: null })
      }

      if (fn === 'delete_user_completely') {
        return Promise.resolve({ data: { success: true }, error: null })
      }

      return Promise.resolve({ data: null, error: null })
    }),
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            like: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }
      }

      if (table === 'courses') {
        return {
          select: vi.fn().mockResolvedValue({ data: courses, error: null }),
        }
      }

      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
    }),
  }
}
