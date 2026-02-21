/**
 * Testes de idempotência do fluxo de aprovação.
 *
 * "Idempotente" significa: chamar approve duas vezes produz o mesmo resultado
 * sem efeitos colaterais na segunda chamada.
 *
 * A implementação no RPC detecta status='approved' e retorna o certificado
 * existente sem reprocessar. Estes testes validam o comportamento esperado
 * que o RPC deve implementar.
 */

import { describe, it, expect } from 'vitest'

// Simula a lógica de decisão do RPC approve_certificate_request
interface ApprovalResult {
  success: boolean
  message: string
  certificate_id: string | null
  idempotent?: boolean
}

interface MockRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  enrollment_id: string
  certificate_type: string
}

interface MockCertificate {
  id: string
  enrollment_id: string
  certificate_type: string
}

function simulateApprove(
  request: MockRequest,
  existingCert: MockCertificate | null
): ApprovalResult {
  // Lógica que o RPC implementa
  if (request.status === 'approved') {
    // Idempotência: já foi aprovado — retornar cert existente
    return {
      success: true,
      message: 'Certificado já havia sido aprovado anteriormente',
      certificate_id: existingCert?.id ?? null,
      idempotent: true,
    }
  }

  if (request.status === 'rejected') {
    return { success: false, message: 'Esta solicitação já foi processada', certificate_id: null }
  }

  // pending → aprovação normal
  return {
    success: true,
    message: 'Certificado aprovado com sucesso',
    certificate_id: existingCert?.id ?? 'new-cert-id',
  }
}

const PENDING_REQUEST: MockRequest = {
  id: 'req-1',
  status: 'pending',
  enrollment_id: 'enroll-1',
  certificate_type: 'technical',
}

const APPROVED_REQUEST: MockRequest = { ...PENDING_REQUEST, status: 'approved' }

const EXISTING_CERT: MockCertificate = {
  id: 'cert-abc',
  enrollment_id: 'enroll-1',
  certificate_type: 'technical',
}

describe('Certificate approval idempotency', () => {
  it('aprovação de pending retorna sucesso', () => {
    const result = simulateApprove(PENDING_REQUEST, null)
    expect(result.success).toBe(true)
    expect(result.idempotent).toBeUndefined()
  })

  it('segunda aprovação (já approved) retorna sucesso idempotente', () => {
    const result = simulateApprove(APPROVED_REQUEST, EXISTING_CERT)
    expect(result.success).toBe(true)
    expect(result.idempotent).toBe(true)
  })

  it('segunda aprovação retorna o mesmo certificate_id', () => {
    const first = simulateApprove(PENDING_REQUEST, EXISTING_CERT)
    const second = simulateApprove(APPROVED_REQUEST, EXISTING_CERT)
    expect(second.certificate_id).toBe(first.certificate_id)
  })

  it('aprovação de rejected retorna erro', () => {
    const rejected: MockRequest = { ...PENDING_REQUEST, status: 'rejected' }
    const result = simulateApprove(rejected, null)
    expect(result.success).toBe(false)
  })

  it('segunda aprovação não altera message de sucesso original', () => {
    const firstMessage = simulateApprove(PENDING_REQUEST, null).message
    const secondMessage = simulateApprove(APPROVED_REQUEST, EXISTING_CERT).message
    // Ambas retornam mensagem de sucesso, mas diferenciadas
    expect(firstMessage).toContain('sucesso')
    expect(secondMessage).toContain('aprovado')
  })
})

describe('Certificate rejection idempotency', () => {
  function simulateReject(request: MockRequest): { success: boolean; message: string; idempotent?: boolean } {
    if (request.status === 'rejected') {
      return { success: true, message: 'Solicitação já havia sido rejeitada', idempotent: true }
    }
    if (request.status === 'approved') {
      return { success: false, message: 'Esta solicitação já foi processada' }
    }
    return { success: true, message: 'Solicitação rejeitada com sucesso' }
  }

  it('rejeição de pending retorna sucesso', () => {
    expect(simulateReject(PENDING_REQUEST).success).toBe(true)
  })

  it('segunda rejeição retorna sucesso idempotente', () => {
    const rejected: MockRequest = { ...PENDING_REQUEST, status: 'rejected' }
    const result = simulateReject(rejected)
    expect(result.success).toBe(true)
    expect(result.idempotent).toBe(true)
  })

  it('rejeição de approved retorna erro', () => {
    expect(simulateReject(APPROVED_REQUEST).success).toBe(false)
  })
})
