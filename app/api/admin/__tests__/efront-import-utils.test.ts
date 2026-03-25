import { describe, expect, it } from 'vitest'

import {
  buildImportedFullName,
  mapRole,
  mapStatus,
  parseAndValidateEfrontCsv,
} from '../efront-import/import-utils'

describe('eFront import utils', () => {
  it('parses quoted values and semicolon-delimited csv files', () => {
    const csv = [
      'users_login;users_email;users_name;users_surname;active;user_type',
      'joao;joao@example.com;"João, Jr.";Silva;1;Teacher',
    ].join('\r\n')

    const result = parseAndValidateEfrontCsv(csv)

    expect(result.errors).toEqual([])
    expect(result.users).toHaveLength(1)
    expect(result.users[0]).toMatchObject({
      users_login: 'joao',
      users_email: 'joao@example.com',
      users_name: 'João, Jr.',
      users_surname: 'Silva',
      active: '1',
      user_type: 'Teacher',
      rowNumber: 2,
    })
  })

  it('reports missing required headers', () => {
    const csv = [
      'users_login,users_name,users_surname,active,user_type',
      'joao,João,Silva,1,Student',
    ].join('\n')

    const result = parseAndValidateEfrontCsv(csv)

    expect(result.users).toEqual([])
    expect(result.errors).toEqual([
      'Cabeçalhos obrigatórios ausentes: users_email.',
    ])
  })

  it('ignores duplicate emails inside the same file and reports a warning', () => {
    const csv = [
      'users_login,users_email,users_name,users_surname,active,user_type',
      'joao,joao@example.com,João,Silva,1,Student',
      'joao2,joao@example.com,João,Silva,1,Student',
    ].join('\n')

    const result = parseAndValidateEfrontCsv(csv)

    expect(result.users).toHaveLength(1)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([
      'Linha 3: email duplicado ignorado (joao@example.com).',
    ])
  })

  it('normalizes derived fields consistently', () => {
    expect(
      buildImportedFullName({
        users_name: '',
        users_surname: '',
        users_login: 'login.user',
        users_email: 'Login.User@Example.com',
      } as any)
    ).toBe('login.user')
    expect(mapRole('administrator')).toBe('admin')
    expect(mapRole('teacher')).toBe('instructor')
    expect(mapStatus('true')).toBe('active')
    expect(mapStatus('0')).toBe('frozen')
  })
})
