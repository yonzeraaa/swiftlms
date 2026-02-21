/**
 * Testes de segurança de GRANT/REVOKE em RPCs de certificados.
 *
 * Estes testes simulam o comportamento esperado dos grants no banco.
 * O teste de integração real (has_function_privilege no banco) deve ser
 * executado como smoke test pós-deploy via Supabase MCP ou script SQL.
 *
 * SQL equivalente para validar em produção:
 *   SELECT has_function_privilege('anon', 'approve_certificate_request(uuid,uuid)', 'EXECUTE');
 *   -- deve retornar false
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// Modelo: mapeamento de função → roles autorizadas
// ============================================================================

type DbRole = 'anon' | 'authenticated' | 'service_role'

interface FunctionGrant {
  fn: string
  allowedRoles: DbRole[]
}

const CERTIFICATE_RPC_GRANTS: FunctionGrant[] = [
  {
    fn: 'approve_certificate_request(uuid,uuid)',
    allowedRoles: ['authenticated', 'service_role'],
  },
  {
    fn: 'reject_certificate_request(uuid,uuid,text)',
    allowedRoles: ['authenticated', 'service_role'],
  },
  {
    fn: 'manually_generate_certificate(uuid)',
    allowedRoles: ['authenticated', 'service_role'],
  },
  {
    fn: 'certificate_anomaly_report()',
    allowedRoles: ['authenticated', 'service_role'],
  },
  {
    fn: 'create_certificate_request(uuid)',
    allowedRoles: ['authenticated', 'service_role'],
  },
]

function isGranted(fn: FunctionGrant, role: DbRole): boolean {
  return fn.allowedRoles.includes(role)
}

// ============================================================================
// Testes
// ============================================================================

describe('RPC grant model — anon never has EXECUTE', () => {
  for (const fn of CERTIFICATE_RPC_GRANTS) {
    it(`anon não deve ter EXECUTE em ${fn.fn}`, () => {
      expect(isGranted(fn, 'anon')).toBe(false)
    })
  }
})

describe('RPC grant model — authenticated has EXECUTE', () => {
  for (const fn of CERTIFICATE_RPC_GRANTS) {
    it(`authenticated deve ter EXECUTE em ${fn.fn}`, () => {
      expect(isGranted(fn, 'authenticated')).toBe(true)
    })
  }
})

describe('RPC grant model — PUBLIC subset não amplia anon', () => {
  it('nenhuma função tem PUBLIC como role autorizada', () => {
    // Garantir que o modelo não lista PUBLIC (que incluiria anon)
    const haPublic = CERTIFICATE_RPC_GRANTS.some(
      fn => (fn.allowedRoles as string[]).includes('public')
    )
    expect(haPublic).toBe(false)
  })

  it('todas as funções sensíveis bloqueiam anon explicitamente', () => {
    const sensitiveFns = CERTIFICATE_RPC_GRANTS.filter(fn =>
      fn.fn.startsWith('approve_') ||
      fn.fn.startsWith('reject_') ||
      fn.fn.startsWith('manually_') ||
      fn.fn.startsWith('certificate_anomaly')
    )
    for (const fn of sensitiveFns) {
      expect(isGranted(fn, 'anon')).toBe(false)
    }
  })
})
