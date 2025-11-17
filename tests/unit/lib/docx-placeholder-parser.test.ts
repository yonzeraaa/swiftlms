import { describe, it, expect } from 'vitest'
import { CERTIFICATE_DOCX_FIELDS } from '@/types/certificate-docx'

describe('DOCX Placeholder Parser', () => {
  describe('CERTIFICATE_DOCX_FIELDS', () => {
    it('deve conter todos os campos obrigatórios', () => {
      const requiredFields = [
        'student.full_name',
        'course.title',
        'course.duration_hours',
        'certificate.number',
        'certificate.issue_date',
        'certificate.verification_code',
        'certificate.type',
        'institution.name',
      ]

      requiredFields.forEach((field) => {
        expect(CERTIFICATE_DOCX_FIELDS).toHaveProperty(field)
      })
    })

    it('deve marcar campos obrigatórios corretamente', () => {
      const requiredFieldNames = [
        'student.full_name',
        'course.title',
        'course.duration_hours',
        'certificate.number',
        'certificate.issue_date',
        'certificate.verification_code',
        'certificate.type',
        'institution.name',
      ]

      requiredFieldNames.forEach((fieldName) => {
        const field = CERTIFICATE_DOCX_FIELDS[fieldName as keyof typeof CERTIFICATE_DOCX_FIELDS]
        expect(field?.required).toBe(true)
      })
    })

    it('deve ter descrições para todos os campos', () => {
      Object.entries(CERTIFICATE_DOCX_FIELDS).forEach(([key, field]) => {
        expect(field.description).toBeDefined()
        expect(field.description.length).toBeGreaterThan(0)
      })
    })

    it('deve ter tipos válidos para todos os campos', () => {
      const validTypes = ['string', 'number', 'date']

      Object.entries(CERTIFICATE_DOCX_FIELDS).forEach(([key, field]) => {
        expect(validTypes).toContain(field.type)
      })
    })

    it('deve agrupar campos por categoria', () => {
      const fields = Object.keys(CERTIFICATE_DOCX_FIELDS)

      const studentFields = fields.filter((f) => f.startsWith('student.'))
      const courseFields = fields.filter((f) => f.startsWith('course.'))
      const certificateFields = fields.filter((f) => f.startsWith('certificate.'))
      const institutionFields = fields.filter((f) => f.startsWith('institution.'))
      const signatureFields = fields.filter((f) => f.startsWith('signatures.'))

      expect(studentFields.length).toBeGreaterThan(0)
      expect(courseFields.length).toBeGreaterThan(0)
      expect(certificateFields.length).toBeGreaterThan(0)
      expect(institutionFields.length).toBeGreaterThan(0)
      expect(signatureFields.length).toBeGreaterThan(0)
    })
  })

  describe('Placeholder Pattern Matching', () => {
    it('deve extrair placeholders simples', () => {
      const text = 'Certificamos que {{student.full_name}} concluiu o curso {{course.title}}'
      const pattern = /\{\{[^}]+\}\}/g
      const matches = text.match(pattern)

      expect(matches).toHaveLength(2)
      expect(matches).toContain('{{student.full_name}}')
      expect(matches).toContain('{{course.title}}')
    })

    it('deve extrair placeholders com transformação', () => {
      const text = 'Nome: {{uppercase student.full_name}}'
      const pattern = /\{\{[^}]+\}\}/g
      const matches = text.match(pattern)

      expect(matches).toHaveLength(1)
      expect(matches![0]).toBe('{{uppercase student.full_name}}')
    })

    it('deve ignorar condicionais do Handlebars', () => {
      const text = '{{#if grade}}Nota: {{grade}}{{/if}}'
      const pattern = /\{\{[^}]+\}\}/g
      const matches = text.match(pattern) || []

      // Deve encontrar todos, mas filtraremos os que começam com # ou /
      const validMatches = matches.filter(
        (m) => !m.match(/^\{\{[#/]/)
      )

      expect(validMatches).toHaveLength(1)
      expect(validMatches[0]).toBe('{{grade}}')
    })

    it('deve extrair múltiplos placeholders na mesma linha', () => {
      const text = '{{student.full_name}}, CPF {{student.cpf}}, concluiu {{course.title}}'
      const pattern = /\{\{[^}]+\}\}/g
      const matches = text.match(pattern)

      expect(matches).toHaveLength(3)
    })

    it('deve detectar formato de transformação', () => {
      const placeholder = 'uppercase student.full_name'
      const formatMatch = placeholder.match(/^(uppercase|lowercase|capitalize|date-short|date-long)\s+(.+)$/)

      expect(formatMatch).toBeTruthy()
      expect(formatMatch![1]).toBe('uppercase')
      expect(formatMatch![2]).toBe('student.full_name')
    })

    it('deve retornar null para placeholder sem transformação', () => {
      const placeholder = 'student.full_name'
      const formatMatch = placeholder.match(/^(uppercase|lowercase|capitalize|date-short|date-long)\s+(.+)$/)

      expect(formatMatch).toBeNull()
    })

    it('deve limpar tags dos placeholders', () => {
      const tag = '{{student.full_name}}'
      const cleaned = tag.replace(/^\{\{|\}\}$/g, '').trim()

      expect(cleaned).toBe('student.full_name')
    })

    it('deve limpar tags com transformação', () => {
      const tag = '{{uppercase student.full_name}}'
      const cleaned = tag.replace(/^\{\{|\}\}$/g, '').trim()

      expect(cleaned).toBe('uppercase student.full_name')
    })
  })

  describe('Field Validation', () => {
    it('deve identificar campo conhecido', () => {
      const fieldName = 'student.full_name'
      const knownField = CERTIFICATE_DOCX_FIELDS[fieldName as keyof typeof CERTIFICATE_DOCX_FIELDS]

      expect(knownField).toBeDefined()
      expect(knownField.description).toBe('Nome completo do aluno')
    })

    it('deve retornar undefined para campo desconhecido', () => {
      const fieldName = 'unknown.field'
      const knownField = CERTIFICATE_DOCX_FIELDS[fieldName as keyof typeof CERTIFICATE_DOCX_FIELDS]

      expect(knownField).toBeUndefined()
    })

    it('deve validar campos obrigatórios ausentes', () => {
      const requiredFields = Object.entries(CERTIFICATE_DOCX_FIELDS)
        .filter(([, field]) => field.required)
        .map(([name]) => name)

      const extractedFields = ['student.full_name', 'course.title']

      const missingRequired = requiredFields.filter(
        (field) => !extractedFields.includes(field)
      )

      expect(missingRequired.length).toBeGreaterThan(0)
      expect(missingRequired).toContain('course.duration_hours')
      expect(missingRequired).toContain('certificate.number')
    })

    it('deve aceitar todos os campos obrigatórios presentes', () => {
      const requiredFields = Object.entries(CERTIFICATE_DOCX_FIELDS)
        .filter(([, field]) => field.required)
        .map(([name]) => name)

      const extractedFields = [
        'student.full_name',
        'course.title',
        'course.duration_hours',
        'certificate.number',
        'certificate.issue_date',
        'certificate.verification_code',
        'certificate.type',
        'institution.name',
      ]

      const missingRequired = requiredFields.filter(
        (field) => !extractedFields.includes(field)
      )

      expect(missingRequired).toHaveLength(0)
    })
  })

  describe('Mapping Suggestions', () => {
    it('deve sugerir mapeamento automático para campos conhecidos', () => {
      const placeholders = [
        { name: 'student.full_name', type: 'string' as const, required: true },
        { name: 'course.title', type: 'string' as const, required: true },
      ]

      const suggestions = placeholders.map((p) => {
        const knownField = CERTIFICATE_DOCX_FIELDS[p.name as keyof typeof CERTIFICATE_DOCX_FIELDS]

        if (knownField) {
          return {
            placeholder: p.name,
            source: p.name,
            transform: undefined,
          }
        }

        return {
          placeholder: p.name,
          source: '',
          fixedValue: '',
        }
      })

      expect(suggestions[0].source).toBe('student.full_name')
      expect(suggestions[1].source).toBe('course.title')
    })

    it('deve sugerir mapeamento manual para campos desconhecidos', () => {
      const placeholders = [
        { name: 'custom_field', type: 'string' as const, required: false },
      ]

      const suggestions = placeholders.map((p) => {
        const knownField = CERTIFICATE_DOCX_FIELDS[p.name as keyof typeof CERTIFICATE_DOCX_FIELDS]

        if (knownField) {
          return {
            placeholder: p.name,
            source: p.name,
            transform: undefined,
          }
        }

        return {
          placeholder: p.name,
          source: '',
          fixedValue: '',
        }
      })

      expect(suggestions[0].source).toBe('')
      expect(suggestions[0].fixedValue).toBe('')
    })

    it('deve preservar formato detectado na sugestão', () => {
      const placeholder = {
        name: 'student.full_name',
        type: 'string' as const,
        required: true,
        format: 'uppercase',
      }

      const suggestion = {
        placeholder: placeholder.name,
        source: placeholder.name,
        transform: placeholder.format,
      }

      expect(suggestion.transform).toBe('uppercase')
    })
  })
})
