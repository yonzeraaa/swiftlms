/**
 * Testes de transição de estado de certificados.
 *
 * Documenta e valida o modelo de estado:
 *   pending → approved (status='issued')
 *   pending → rejected  (status permanece null)
 *
 * O campo `status` DEVE ser 'issued' sempre que approval_status='approved'.
 * O trigger sync_certificate_state no banco garante isso, mas estas funções
 * de escrita também devem definir status explicitamente como belt-and-suspenders.
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// Modelo puro — sem I/O. Testa as regras de estado independentemente do banco.
// ============================================================================

type ApprovalStatus = 'pending' | 'approved' | 'rejected'
type CertificateStatus = 'issued' | null

interface CertificateState {
  approval_status: ApprovalStatus
  status: CertificateStatus
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  issued_at: string | null
}

function applyApproval(current: CertificateState, adminId: string): CertificateState {
  return {
    ...current,
    approval_status: 'approved',
    status: 'issued',
    approved_at: new Date().toISOString(),
    approved_by: adminId,
    issued_at: current.issued_at ?? new Date().toISOString(),
  }
}

function applyRejection(current: CertificateState, adminId: string, reason: string): CertificateState {
  return {
    ...current,
    approval_status: 'rejected',
    approved_at: new Date().toISOString(),
    approved_by: adminId,
    rejection_reason: reason,
  }
}

function isConsistentState(state: CertificateState): boolean {
  if (state.approval_status === 'approved' && state.status !== 'issued') return false
  if (state.status === 'issued' && state.approval_status !== 'approved') return false
  if (state.approval_status === 'rejected' && !state.rejection_reason) return false
  if (state.approval_status !== 'pending' && (!state.approved_at || !state.approved_by)) return false
  return true
}

const PENDING_STATE: CertificateState = {
  approval_status: 'pending',
  status: null,
  approved_at: null,
  approved_by: null,
  rejection_reason: null,
  issued_at: null,
}

const ADMIN_ID = 'admin-uuid-123'

describe('Certificate state transitions', () => {
  describe('pending → approved', () => {
    it('define status=issued e approval_status=approved', () => {
      const result = applyApproval(PENDING_STATE, ADMIN_ID)
      expect(result.approval_status).toBe('approved')
      expect(result.status).toBe('issued')
    })

    it('preenche campos de auditoria', () => {
      const result = applyApproval(PENDING_STATE, ADMIN_ID)
      expect(result.approved_at).not.toBeNull()
      expect(result.approved_by).toBe(ADMIN_ID)
    })

    it('preenche issued_at', () => {
      const result = applyApproval(PENDING_STATE, ADMIN_ID)
      expect(result.issued_at).not.toBeNull()
    })

    it('preserva issued_at existente (idempotência)', () => {
      const existingDate = '2025-01-01T00:00:00.000Z'
      const withDate = { ...PENDING_STATE, issued_at: existingDate }
      const result = applyApproval(withDate, ADMIN_ID)
      expect(result.issued_at).toBe(existingDate)
    })

    it('estado resultante é consistente', () => {
      const result = applyApproval(PENDING_STATE, ADMIN_ID)
      expect(isConsistentState(result)).toBe(true)
    })
  })

  describe('pending → rejected', () => {
    it('define approval_status=rejected e mantém status=null', () => {
      const result = applyRejection(PENDING_STATE, ADMIN_ID, 'Documentação incompleta')
      expect(result.approval_status).toBe('rejected')
      expect(result.status).toBeNull()
    })

    it('preenche rejection_reason', () => {
      const result = applyRejection(PENDING_STATE, ADMIN_ID, 'Motivo X')
      expect(result.rejection_reason).toBe('Motivo X')
    })

    it('preenche campos de auditoria', () => {
      const result = applyRejection(PENDING_STATE, ADMIN_ID, 'Motivo X')
      expect(result.approved_at).not.toBeNull()
      expect(result.approved_by).toBe(ADMIN_ID)
    })

    it('estado resultante é consistente', () => {
      const result = applyRejection(PENDING_STATE, ADMIN_ID, 'Motivo X')
      expect(isConsistentState(result)).toBe(true)
    })
  })

  describe('isConsistentState — invariantes', () => {
    it('rejeita approved sem issued', () => {
      const bad: CertificateState = { ...PENDING_STATE, approval_status: 'approved', approved_at: 'x', approved_by: 'y' }
      expect(isConsistentState(bad)).toBe(false)
    })

    it('rejeita issued sem approved', () => {
      const bad: CertificateState = { ...PENDING_STATE, status: 'issued', approved_at: 'x', approved_by: 'y' }
      expect(isConsistentState(bad)).toBe(false)
    })

    it('rejeita rejected sem rejection_reason', () => {
      const bad: CertificateState = { ...PENDING_STATE, approval_status: 'rejected', approved_at: 'x', approved_by: 'y', rejection_reason: null }
      expect(isConsistentState(bad)).toBe(false)
    })

    it('rejeita approved sem audit fields', () => {
      const bad: CertificateState = { ...PENDING_STATE, approval_status: 'approved', status: 'issued', approved_at: null, approved_by: null }
      expect(isConsistentState(bad)).toBe(false)
    })

    it('aceita pending sem campos preenchidos', () => {
      expect(isConsistentState(PENDING_STATE)).toBe(true)
    })

    it('aceita approved completo', () => {
      const good = applyApproval(PENDING_STATE, ADMIN_ID)
      expect(isConsistentState(good)).toBe(true)
    })

    it('aceita rejected completo', () => {
      const good = applyRejection(PENDING_STATE, ADMIN_ID, 'Motivo')
      expect(isConsistentState(good)).toBe(true)
    })
  })
})
