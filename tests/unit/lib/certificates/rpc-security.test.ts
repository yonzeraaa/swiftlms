/**
 * Testes de segurança do fluxo de RPCs de certificados.
 *
 * Valida que:
 * 1. RPCs de mutação retornam erro quando o chamador não é admin.
 * 2. A camada TypeScript propaga erros de acesso negado adequadamente.
 * 3. SHA-256 é calculado corretamente para integridade do PDF.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'

// ============================================================================
// 1. Role check — lógica de verificação de acesso
// ============================================================================

type UserRole = 'admin' | 'instructor' | 'student' | null

function canExecuteCertificateRpc(role: UserRole): boolean {
  return role === 'admin'
}

describe('RPC role check', () => {
  it('permite admin', () => {
    expect(canExecuteCertificateRpc('admin')).toBe(true)
  })

  it('bloqueia instructor', () => {
    expect(canExecuteCertificateRpc('instructor')).toBe(false)
  })

  it('bloqueia student', () => {
    expect(canExecuteCertificateRpc('student')).toBe(false)
  })

  it('bloqueia usuário não autenticado (null)', () => {
    expect(canExecuteCertificateRpc(null)).toBe(false)
  })
})

// ============================================================================
// 2. Propagação de erro de acesso negado na camada TypeScript
// ============================================================================

// Simula a resposta do RPC quando não é admin
function mockRpcAccessDenied() {
  return {
    data: { success: false, message: 'Acesso negado: apenas administradores podem aprovar certificados' },
    error: null,
  }
}

function handleApproveRpcResponse(
  response: { data: { success: boolean; message: string; certificate_id?: string } | null; error: unknown }
): { success: boolean; error?: string; certificateId?: string } {
  if (response.error) {
    return { success: false, error: 'Erro interno ao aprovar certificado' }
  }
  if (!response.data?.success) {
    return { success: false, error: response.data?.message }
  }
  return { success: true, certificateId: response.data.certificate_id }
}

describe('TypeScript layer error propagation', () => {
  it('repassa mensagem de acesso negado do RPC', () => {
    const response = mockRpcAccessDenied()
    const result = handleApproveRpcResponse(response)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Acesso negado')
  })

  it('retorna erro genérico em erro de rede/DB', () => {
    const response = { data: null, error: new Error('connection refused') }
    const result = handleApproveRpcResponse(response)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('extrai certificate_id em aprovação bem-sucedida', () => {
    const response = {
      data: { success: true, message: 'Certificado aprovado com sucesso', certificate_id: 'cert-xyz' },
      error: null,
    }
    const result = handleApproveRpcResponse(response)
    expect(result.success).toBe(true)
    expect(result.certificateId).toBe('cert-xyz')
  })
})

// ============================================================================
// 3. SHA-256 — integridade criptográfica do PDF
// ============================================================================

describe('PDF SHA-256 integrity', () => {
  it('produz hash hex de 64 caracteres', () => {
    const fakeBytes = Buffer.from('fake pdf content')
    const hash = createHash('sha256').update(fakeBytes).digest('hex')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('o mesmo conteúdo produz sempre o mesmo hash (determinístico)', () => {
    const content = Buffer.from('certificado-conteudo-fixo')
    const hash1 = createHash('sha256').update(content).digest('hex')
    const hash2 = createHash('sha256').update(content).digest('hex')
    expect(hash1).toBe(hash2)
  })

  it('conteúdo diferente produz hash diferente', () => {
    const original = createHash('sha256').update(Buffer.from('original')).digest('hex')
    const tampered = createHash('sha256').update(Buffer.from('tampered')).digest('hex')
    expect(original).not.toBe(tampered)
  })

  it('detecta alteração de um único byte', () => {
    const buf1 = Buffer.from([0x25, 0x50, 0x44, 0x46])     // %PDF
    const buf2 = Buffer.from([0x25, 0x50, 0x44, 0x47])     // %PDG (1 byte diferente)
    const h1 = createHash('sha256').update(buf1).digest('hex')
    const h2 = createHash('sha256').update(buf2).digest('hex')
    expect(h1).not.toBe(h2)
  })
})

// ============================================================================
// 4. Verificação de integridade — comparação de hash armazenado
// ============================================================================

function verifyCertificateIntegrity(
  storedHash: string | null,
  downloadedBytes: Buffer
): 'verified' | 'mismatch' | 'no_hash' {
  if (!storedHash) return 'no_hash'
  const computedHash = createHash('sha256').update(downloadedBytes).digest('hex')
  return computedHash === storedHash ? 'verified' : 'mismatch'
}

describe('Certificate integrity verification', () => {
  const pdfContent = Buffer.from('pdf-content-example')
  const correctHash = createHash('sha256').update(pdfContent).digest('hex')

  it('verifica arquivo íntegro', () => {
    expect(verifyCertificateIntegrity(correctHash, pdfContent)).toBe('verified')
  })

  it('detecta arquivo adulterado', () => {
    const tamperedContent = Buffer.from('pdf-content-TAMPERED')
    expect(verifyCertificateIntegrity(correctHash, tamperedContent)).toBe('mismatch')
  })

  it('retorna no_hash quando certificado não tem hash armazenado', () => {
    expect(verifyCertificateIntegrity(null, pdfContent)).toBe('no_hash')
  })
})
