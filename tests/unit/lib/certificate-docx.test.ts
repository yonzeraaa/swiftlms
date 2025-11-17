import { describe, it, expect, vi } from 'vitest'
import { buildTemplateData, certificateToDocxData } from '@/lib/services/certificate-docx'
import { FieldMapping, CertificateDocxData } from '@/types/certificate-docx'

describe('Certificate DOCX Service', () => {
  describe('buildTemplateData', () => {
    it('deve construir dados com mapeamento de campos simples', () => {
      const certificateData: CertificateDocxData = {
        student: {
          full_name: 'João Silva',
          cpf: '123.456.789-00',
          rg: '12.345.678-9',
          email: 'joao@example.com',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 120,
          start_date: '2024-01-01',
          end_date: '2024-06-01',
        },
        certificate: {
          number: 'CERT-2024-001',
          issue_date: '2024-06-15',
          verification_code: 'ABC123XYZ',
          grade: 95,
          certificate_type: 'technical',
        },
        institution: {
          name: 'SwiftEDU',
          cnpj: '12.345.678/0001-90',
          address: 'Rua Exemplo, 123',
        },
        signatures: {
          director_name: 'Maria Santos',
          director_title: 'Diretora',
          coordinator_name: 'Pedro Costa',
          coordinator_title: 'Coordenador',
        },
      }

      const mappings: FieldMapping[] = [
        { placeholder: 'student_name', source: 'student.full_name' },
        { placeholder: 'course_title', source: 'course.title' },
        { placeholder: 'certificate_number', source: 'certificate.number' },
      ]

      const result = buildTemplateData(certificateData, mappings)

      expect(result).toEqual({
        student_name: 'João Silva',
        course_title: 'Desenvolvimento Web',
        certificate_number: 'CERT-2024-001',
      })
    })

    it('deve aplicar transformação uppercase', () => {
      const certificateData: CertificateDocxData = {
        student: {
          full_name: 'João Silva',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 120,
        },
        certificate: {
          number: 'CERT-001',
          issue_date: '2024-01-01',
          verification_code: 'ABC123',
          certificate_type: 'technical',
        },
        institution: {
          name: 'SwiftEDU',
        },
        signatures: {},
      }

      const mappings: FieldMapping[] = [
        {
          placeholder: 'student_name',
          source: 'student.full_name',
          transform: 'uppercase',
        },
      ]

      const result = buildTemplateData(certificateData, mappings)

      expect(result.student_name).toBe('JOÃO SILVA')
    })

    it('deve aplicar transformação lowercase', () => {
      const certificateData: CertificateDocxData = {
        student: {
          full_name: 'JOÃO SILVA',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 120,
        },
        certificate: {
          number: 'CERT-001',
          issue_date: '2024-01-01',
          verification_code: 'ABC123',
          certificate_type: 'technical',
        },
        institution: {
          name: 'SwiftEDU',
        },
        signatures: {},
      }

      const mappings: FieldMapping[] = [
        {
          placeholder: 'student_name',
          source: 'student.full_name',
          transform: 'lowercase',
        },
      ]

      const result = buildTemplateData(certificateData, mappings)

      expect(result.student_name).toBe('joão silva')
    })

    it('deve aplicar transformação capitalize', () => {
      const certificateData: CertificateDocxData = {
        student: {
          full_name: 'joão silva',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 120,
        },
        certificate: {
          number: 'CERT-001',
          issue_date: '2024-01-01',
          verification_code: 'ABC123',
          certificate_type: 'technical',
        },
        institution: {
          name: 'SwiftEDU',
        },
        signatures: {},
      }

      const mappings: FieldMapping[] = [
        {
          placeholder: 'student_name',
          source: 'student.full_name',
          transform: 'capitalize',
        },
      ]

      const result = buildTemplateData(certificateData, mappings)

      expect(result.student_name).toBe('João silva')
    })

    it('deve aplicar transformação date-short', () => {
      const certificateData: CertificateDocxData = {
        student: {
          full_name: 'João Silva',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 120,
        },
        certificate: {
          number: 'CERT-001',
          issue_date: '2024-01-15T12:00:00Z',
          verification_code: 'ABC123',
          certificate_type: 'technical',
        },
        institution: {
          name: 'SwiftEDU',
        },
        signatures: {},
      }

      const mappings: FieldMapping[] = [
        {
          placeholder: 'issue_date',
          source: 'certificate.issue_date',
          transform: 'date-short',
        },
      ]

      const result = buildTemplateData(certificateData, mappings)

      // Date formatting pode variar por locale e timezone
      // Vamos verificar se é uma data válida no formato DD/MM/YYYY
      expect(result.issue_date).toMatch(/\d{2}\/\d{2}\/\d{4}/)
      expect(result.issue_date).toContain('2024')
      expect(result.issue_date).toContain('01')
    })

    it('deve usar valor fixo quando fornecido', () => {
      const certificateData: CertificateDocxData = {
        student: {
          full_name: 'João Silva',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 120,
        },
        certificate: {
          number: 'CERT-001',
          issue_date: '2024-01-01',
          verification_code: 'ABC123',
          certificate_type: 'technical',
        },
        institution: {
          name: 'SwiftEDU',
        },
        signatures: {},
      }

      const mappings: FieldMapping[] = [
        {
          placeholder: 'institution_name',
          source: '',
          fixedValue: 'Instituição de Ensino XYZ',
        },
      ]

      const result = buildTemplateData(certificateData, mappings)

      expect(result.institution_name).toBe('Instituição de Ensino XYZ')
    })

    it('deve criar estrutura aninhada para placeholders com ponto', () => {
      const certificateData: CertificateDocxData = {
        student: {
          full_name: 'João Silva',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 120,
        },
        certificate: {
          number: 'CERT-001',
          issue_date: '2024-01-01',
          verification_code: 'ABC123',
          certificate_type: 'technical',
        },
        institution: {
          name: 'SwiftEDU',
        },
        signatures: {},
      }

      const mappings: FieldMapping[] = [
        {
          placeholder: 'student.full_name',
          source: 'student.full_name',
        },
        {
          placeholder: 'course.title',
          source: 'course.title',
        },
      ]

      const result = buildTemplateData(certificateData, mappings)

      expect(result.student).toBeDefined()
      expect((result.student as any).full_name).toBe('João Silva')
      expect(result.course).toBeDefined()
      expect((result.course as any).title).toBe('Desenvolvimento Web')
    })

    it('deve retornar string vazia para campos não encontrados', () => {
      const certificateData: CertificateDocxData = {
        student: {
          full_name: 'João Silva',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 120,
        },
        certificate: {
          number: 'CERT-001',
          issue_date: '2024-01-01',
          verification_code: 'ABC123',
          certificate_type: 'technical',
        },
        institution: {
          name: 'SwiftEDU',
        },
        signatures: {},
      }

      const mappings: FieldMapping[] = [
        {
          placeholder: 'unknown_field',
          source: 'student.unknown',
        },
      ]

      const result = buildTemplateData(certificateData, mappings)

      expect(result.unknown_field).toBe('')
    })
  })

  describe('certificateToDocxData', () => {
    it('deve converter dados de certificado do banco', () => {
      const certificate = {
        certificate_number: 'CERT-2024-001',
        issued_at: '2024-06-15T10:00:00Z',
        verification_code: 'ABC123XYZ',
        grade: 95,
        final_grade: 90,
        certificate_type: 'technical',
        course_hours: 120,
        completed_at: '2024-06-01',
        director_name: 'Maria Santos',
        director_title: 'Diretora',
        instructor_name: 'Pedro Costa',
        user: {
          full_name: 'João Silva',
          cpf: '123.456.789-00',
          rg: '12.345.678-9',
          email: 'joao@example.com',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 100,
          start_date: '2024-01-01',
          end_date: '2024-05-31',
        },
      }

      const result = certificateToDocxData(certificate)

      expect(result).toEqual({
        student: {
          full_name: 'João Silva',
          cpf: '123.456.789-00',
          rg: '12.345.678-9',
          email: 'joao@example.com',
        },
        course: {
          title: 'Desenvolvimento Web',
          duration_hours: 120, // Prioriza course_hours
          start_date: '2024-01-01',
          end_date: '2024-06-01', // Prioriza completed_at
        },
        certificate: {
          number: 'CERT-2024-001',
          issue_date: '2024-06-15T10:00:00Z',
          verification_code: 'ABC123XYZ',
          grade: 95,
          certificate_type: 'technical',
        },
        institution: {
          name: 'SwiftEDU',
          cnpj: '',
          address: '',
        },
        signatures: {
          director_name: 'Maria Santos',
          director_title: 'Diretora',
          coordinator_name: 'Pedro Costa',
          coordinator_title: 'Coordenador',
        },
      })
    })

    it('deve usar valores padrão quando dados estão ausentes', () => {
      const certificate = {
        certificate_number: 'CERT-001',
        verification_code: 'ABC123',
      }

      const result = certificateToDocxData(certificate)

      expect(result.student.full_name).toBe('Aluno')
      expect(result.course.title).toBe('Curso')
      expect(result.course.duration_hours).toBe(0)
      expect(result.signatures.director_title).toBe('Diretor')
    })
  })
})
