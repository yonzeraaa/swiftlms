import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import {
  buildImportedFullName,
  EFRONT_IMPORT_MAX_FILE_SIZE_BYTES,
  getDefaultEfrontImportPassword,
  mapRole,
  mapStatus,
  normalizeEmail,
  parseAndValidateEfrontImport,
  type EFrontUser,
} from './import-utils'

type ExistingProfile = {
  id: string
  email: string | null
  full_name: string | null
  role: 'student' | 'instructor' | 'admin' | null
  status: 'active' | 'frozen' | null
}

type AuthUserRecord = {
  id: string
  email: string | null
  user_metadata?: {
    full_name?: string | null
    role?: string | null
    phone?: string | null
  } | null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (
      file.size <= 0 ||
      file.size > EFRONT_IMPORT_MAX_FILE_SIZE_BYTES
    ) {
      return NextResponse.json(
        {
          error: 'Arquivo inválido para importação.',
          errors: [
            `O arquivo deve ter entre 1 byte e ${Math.floor(EFRONT_IMPORT_MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`,
          ],
        },
        { status: 400 }
      )
    }

    const supportedExtensions = ['.csv', '.txt', '.1']
    const hasSupportedExtension = supportedExtensions.some(extension =>
      file.name.toLowerCase().endsWith(extension)
    )

    if (!hasSupportedExtension) {
      return NextResponse.json(
        {
          error: 'Formato de arquivo inválido.',
          errors: ['Envie um arquivo `.csv`, `.txt` ou `.1` exportado do eFront.'],
        },
        { status: 400 }
      )
    }

    const csvText = await file.text()
    const {
      users: efrontUsers,
      errors: validationErrors,
      warnings: validationWarnings,
      format: detectedFormat,
    } = parseAndValidateEfrontImport(csvText)

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Arquivo CSV inválido para importação.',
          errors: validationErrors,
        },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()
    const defaultPassword = getDefaultEfrontImportPassword()
    const existingAuthUsers = await listAllAuthUsers(adminClient as any)
    const existingAuthUsersByEmail = new Map(
      existingAuthUsers
        .filter(authUser => authUser.email)
        .map(authUser => [normalizeEmail(authUser.email || ''), authUser])
    )
    const existingAuthUsersById = new Map(existingAuthUsers.map(authUser => [authUser.id, authUser]))

    const importEmails = Array.from(new Set(efrontUsers.map(importUser => importUser.users_email)))

    const { data: profilesData, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, role, status')
      .in('email', importEmails)

    if (profilesError) {
      return NextResponse.json(
        { error: `Erro ao consultar perfis existentes: ${profilesError.message}` },
        { status: 500 }
      )
    }

    const existingProfilesByEmail = new Map(
      ((profilesData || []) as ExistingProfile[])
        .filter(profileRecord => profileRecord.email)
        .map(profileRecord => [normalizeEmail(profileRecord.email || ''), profileRecord])
    )

    const results = {
      imported: 0,
      created: 0,
      updated: 0,
      ignored: validationWarnings.length,
      failed: 0,
      errors: [] as string[],
      warnings: [...validationWarnings] as string[],
    }

    for (const efrontUser of efrontUsers) {
      try {
        const email = normalizeEmail(efrontUser.users_email)
        const fullName = buildImportedFullName(efrontUser)
        const role = mapRole(efrontUser.user_type)
        const status = mapStatus(efrontUser.active)
        const existingProfile = existingProfilesByEmail.get(email) || null
        const existingAuthUser =
          existingAuthUsersByEmail.get(email) ||
          (existingProfile ? existingAuthUsersById.get(existingProfile.id) || null : null)

        const desiredUserMetadata = {
          full_name: fullName,
          role,
          phone: null,
        }

        if (existingProfile || existingAuthUser) {
          const authUserId = existingAuthUser?.id || existingProfile?.id

          if (!authUserId) {
            results.failed++
            results.errors.push(`${email}: usuário existente sem identificador de auth.`)
            continue
          }

          const authIsUpToDate = !!existingAuthUser &&
            normalizeEmail(existingAuthUser.email || '') === email &&
            (existingAuthUser.user_metadata?.full_name || '') === fullName &&
            (existingAuthUser.user_metadata?.role || '') === role &&
            (existingAuthUser.user_metadata?.phone || null) === null

          const profileIsUpToDate = !!existingProfile &&
            normalizeEmail(existingProfile.email || '') === email &&
            (existingProfile.full_name || '') === fullName &&
            (existingProfile.role || '') === role &&
            (existingProfile.status || '') === status

          if (authIsUpToDate && profileIsUpToDate) {
            results.ignored++
            continue
          }

          if (!authIsUpToDate) {
            const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(authUserId, {
              email,
              user_metadata: desiredUserMetadata,
            })

            if (authUpdateError) {
              results.failed++
              results.errors.push(`${email}: ${authUpdateError.message}`)
              continue
            }
          }

          const { error: profileUpdateError } = await adminClient
            .from('profiles')
            .upsert({
              id: authUserId,
              email,
              full_name: fullName,
              phone: null,
              role,
              status,
              updated_at: now,
              ...(existingProfile ? {} : { created_at: now }),
            })

          if (profileUpdateError) {
            results.failed++
            results.errors.push(`${email}: ${profileUpdateError.message}`)
            continue
          }

          const updatedProfile: ExistingProfile = {
            id: authUserId,
            email,
            full_name: fullName,
            role,
            status,
          }
          const updatedAuthUser: AuthUserRecord = {
            id: authUserId,
            email,
            user_metadata: desiredUserMetadata,
          }
          existingProfilesByEmail.set(email, updatedProfile)
          existingAuthUsersByEmail.set(email, updatedAuthUser)
          existingAuthUsersById.set(authUserId, updatedAuthUser)

          results.updated++
          continue
        }

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: desiredUserMetadata,
        })

        if (authError || !authData.user?.id) {
          results.failed++
          results.errors.push(`${email}: ${authError?.message || 'Falha ao criar usuário no Auth'}`)
          continue
        }

        const { error: profileCreateError } = await adminClient
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email,
            full_name: fullName,
            phone: null,
            role,
            status,
            created_at: now,
            updated_at: now,
          })

        if (profileCreateError) {
          const { error: rollbackError } = await adminClient.auth.admin.deleteUser(authData.user.id)
          const rollbackSuffix = rollbackError
            ? ` Não foi possível reverter o usuário no Auth: ${rollbackError.message}`
            : ''

          results.failed++
          results.errors.push(`${email}: ${profileCreateError.message}.${rollbackSuffix}`)
          continue
        }

        existingProfilesByEmail.set(email, {
          id: authData.user.id,
          email,
          full_name: fullName,
          role,
          status,
        })
        existingAuthUsersByEmail.set(email, {
          id: authData.user.id,
          email,
          user_metadata: desiredUserMetadata,
        })
        existingAuthUsersById.set(authData.user.id, {
          id: authData.user.id,
          email,
          user_metadata: desiredUserMetadata,
        })

        results.created++
      } catch (err: any) {
        results.failed++
        results.errors.push(`${efrontUser.users_email}: ${err.message}`)
      }
    }

    results.imported = results.created + results.updated

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${results.created} criados, ${results.updated} atualizados, ${results.ignored} inalterados e ${results.failed} falharam.`,
      initialPassword: defaultPassword,
      format: detectedFormat,
      results,
    })
  } catch (error: any) {
    console.error('eFront import error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao processar importação' }, { status: 500 })
  }
}

async function listAllAuthUsers(adminClient: any): Promise<AuthUserRecord[]> {
  const users: AuthUserRecord[] = []
  let page = 1

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    })

    if (error) {
      throw new Error(`Erro ao listar usuários do Auth: ${error.message}`)
    }

    const pageUsers = data?.users || []
    users.push(
      ...pageUsers.map((authUser: any) => ({
        id: authUser.id,
        email: authUser.email || null,
        user_metadata: authUser.user_metadata || null,
      }))
    )

    if (pageUsers.length < 1000) {
      return users
    }

    page += 1
  }
}
