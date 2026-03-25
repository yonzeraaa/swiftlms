import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { POST } from '../efront-import/route'

const createClientMock = vi.mocked(createClient)
const createAdminClientMock = vi.mocked(createAdminClient)

const validCsv = [
  'users_login,users_email,language,users_name,users_surname,active,user_type,registration_date',
  'joao,joao@example.com,brazilian,João,Silva,1,student,05/04/2017',
].join('\n')

describe('POST /api/admin/efront-import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new auth user and profile from a valid csv', async () => {
    const adminClient = makeAdminClient({
      authUsers: [],
      existingProfiles: [],
      createdAuthUser: { id: 'auth-user-1', email: 'joao@example.com' },
    })

    createClientMock.mockResolvedValue(makeServerClient('admin') as any)
    createAdminClientMock.mockReturnValue(adminClient as any)

    const response = await POST(makeRequest(validCsv))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toMatchObject({
      imported: 1,
      created: 1,
      updated: 0,
      ignored: 0,
      failed: 0,
      warnings: [],
    })
    expect(adminClient.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'joao@example.com',
      password: 'Mudar123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'João Silva',
        role: 'student',
        phone: null,
      },
    })
    expect(adminClient.fromProfilesUpsert).toHaveBeenCalled()
  })

  it('updates an existing user instead of failing on duplicated email in auth', async () => {
    const adminClient = makeAdminClient({
      authUsers: [
        {
          id: 'auth-user-1',
          email: 'joao@example.com',
          user_metadata: {
            full_name: 'Nome Antigo',
            role: 'student',
            phone: null,
          },
        },
      ],
      existingProfiles: [
        {
          id: 'auth-user-1',
          email: 'joao@example.com',
          full_name: 'Nome Antigo',
          role: 'student',
          status: 'frozen',
        },
      ],
    })

    createClientMock.mockResolvedValue(makeServerClient('admin') as any)
    createAdminClientMock.mockReturnValue(adminClient as any)

    const response = await POST(makeRequest(validCsv))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toMatchObject({
      imported: 1,
      created: 0,
      updated: 1,
      ignored: 0,
      failed: 0,
    })
    expect(adminClient.auth.admin.createUser).not.toHaveBeenCalled()
    expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledWith('auth-user-1', {
      email: 'joao@example.com',
      user_metadata: {
        full_name: 'João Silva',
        role: 'student',
        phone: null,
      },
    })
  })

  it('rolls back the auth user when profile creation fails', async () => {
    const adminClient = makeAdminClient({
      authUsers: [],
      existingProfiles: [],
      createdAuthUser: { id: 'auth-user-rollback', email: 'joao@example.com' },
      profileUpsertErrorMessage: 'profile insert failed',
    })

    createClientMock.mockResolvedValue(makeServerClient('admin') as any)
    createAdminClientMock.mockReturnValue(adminClient as any)

    const response = await POST(makeRequest(validCsv))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toMatchObject({
      imported: 0,
      created: 0,
      updated: 0,
      failed: 1,
    })
    expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith('auth-user-rollback')
    expect(data.results.errors[0]).toContain('profile insert failed')
  })

  it('returns validation errors when the csv headers are invalid', async () => {
    createClientMock.mockResolvedValue(makeServerClient('admin') as any)
    createAdminClientMock.mockReturnValue(makeAdminClient({ authUsers: [], existingProfiles: [] }) as any)

    const response = await POST(
      makeRequest([
        'users_login,users_name,users_surname,active,user_type',
        'joao,João,Silva,1,student',
      ].join('\n'))
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Arquivo CSV inválido para importação.')
    expect(data.errors).toEqual(['Cabeçalhos obrigatórios ausentes: users_email.'])
  })
})

function makeRequest(csvText: string, fileName = 'efront.csv') {
  const file = {
    name: fileName,
    size: Buffer.byteLength(csvText, 'utf8'),
    text: vi.fn().mockResolvedValue(csvText),
  }

  return {
    formData: vi.fn().mockResolvedValue({
      get: vi.fn((key: string) => (key === 'file' ? file : null)),
    }),
  } as unknown as Request
}

function makeServerClient(role: 'admin' | 'student') {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-user-1' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role },
            error: null,
          }),
        })),
      })),
    })),
  }
}

function makeAdminClient(params: {
  authUsers: Array<{
    id: string
    email: string | null
    user_metadata?: {
      full_name?: string | null
      role?: string | null
      phone?: string | null
    } | null
  }>
  existingProfiles: Array<{
    id: string
    email: string | null
    full_name: string | null
    role: 'student' | 'instructor' | 'admin' | null
    status: 'active' | 'frozen' | null
  }>
  createdAuthUser?: { id: string; email: string }
  profileUpsertErrorMessage?: string
}) {
  const listUsers = vi.fn().mockResolvedValue({
    data: { users: params.authUsers },
    error: null,
  })

  const createUser = params.createdAuthUser
    ? vi.fn().mockResolvedValue({
        data: {
          user: params.createdAuthUser,
        },
        error: null,
      })
    : vi.fn().mockResolvedValue({
        data: {
          user: null,
        },
        error: { message: 'User already registered' },
      })

  const updateUserById = vi.fn().mockResolvedValue({
    data: { user: { id: params.authUsers[0]?.id || 'auth-user-1' } },
    error: null,
  })

  const deleteUser = vi.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  })

  const fromProfilesSelectIn = vi.fn().mockResolvedValue({
    data: params.existingProfiles,
    error: null,
  })

  const fromProfilesUpsert = vi.fn().mockResolvedValue({
    error: params.profileUpsertErrorMessage
      ? { message: params.profileUpsertErrorMessage }
      : null,
  })

  return {
    auth: {
      admin: {
        listUsers,
        createUser,
        updateUserById,
        deleteUser,
      },
    },
    fromProfilesUpsert,
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: fromProfilesSelectIn,
          })),
          upsert: fromProfilesUpsert,
        }
      }

      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
    }),
  }
}
