import { describe, it, expect } from 'vitest'
import {
  TEMPLATE_FIELDS_BY_CATEGORY,
  getFieldsForCategory,
  getRequiredFields,
  getFieldLabel,
  isFieldRequired,
} from '@/lib/utils/template-fields'

describe('template-fields', () => {
  describe('TEMPLATE_FIELDS_BY_CATEGORY', () => {
    it('should define fields for users category', () => {
      const fields = TEMPLATE_FIELDS_BY_CATEGORY.users

      expect(fields).toBeDefined()
      expect(fields.length).toBeGreaterThan(0)
      expect(fields.some(f => f.key === 'full_name')).toBe(true)
      expect(fields.some(f => f.key === 'email')).toBe(true)
    })

    it('should define fields for grades category', () => {
      const fields = TEMPLATE_FIELDS_BY_CATEGORY.grades

      expect(fields).toBeDefined()
      expect(fields.length).toBeGreaterThan(0)
      expect(fields.some(f => f.key === 'full_name')).toBe(true)
      expect(fields.some(f => f.key === 'grade')).toBe(true)
    })

    it('should define fields for enrollments category', () => {
      const fields = TEMPLATE_FIELDS_BY_CATEGORY.enrollments

      expect(fields).toBeDefined()
      expect(fields.length).toBeGreaterThan(0)
      expect(fields.some(f => f.key === 'enrollment_date')).toBe(true)
    })

    it('should define fields for access category', () => {
      const fields = TEMPLATE_FIELDS_BY_CATEGORY.access

      expect(fields).toBeDefined()
      expect(fields.length).toBeGreaterThan(0)
      expect(fields.some(f => f.key === 'created_at')).toBe(true)
    })

    it('should define fields for student-history category', () => {
      const fields = TEMPLATE_FIELDS_BY_CATEGORY['student-history']

      expect(fields).toBeDefined()
      expect(fields.length).toBeGreaterThan(0)

      const staticFields = fields.filter(f => f.type === 'static')
      const tableFields = fields.filter(f => f.type === 'table')

      expect(staticFields.length).toBeGreaterThan(0)
      expect(tableFields.length).toBeGreaterThan(0)

      expect(fields.some(f => f.key === 'course_name')).toBe(true)
      expect(fields.some(f => f.key === 'code')).toBe(true)
    })

    it('should have required and optional fields for each category', () => {
      Object.entries(TEMPLATE_FIELDS_BY_CATEGORY).forEach(([category, fields]) => {
        const requiredFields = fields.filter(f => f.required)
        const optionalFields = fields.filter(f => !f.required)

        expect(requiredFields.length).toBeGreaterThan(0)
        // At least some categories should have optional fields
        if (category === 'users' || category === 'student-history') {
          expect(optionalFields.length).toBeGreaterThan(0)
        }
      })
    })

    it('should have valid field definitions', () => {
      Object.entries(TEMPLATE_FIELDS_BY_CATEGORY).forEach(([category, fields]) => {
        fields.forEach(field => {
          expect(field.key).toBeDefined()
          expect(field.key).not.toBe('')
          expect(field.label).toBeDefined()
          expect(field.label).not.toBe('')
          expect(typeof field.required).toBe('boolean')
        })
      })
    })
  })

  describe('getFieldsForCategory', () => {
    it('should return fields for valid category', () => {
      const fields = getFieldsForCategory('users')

      expect(fields).toBeDefined()
      expect(Array.isArray(fields)).toBe(true)
      expect(fields.length).toBeGreaterThan(0)
    })

    it('should return empty array for invalid category', () => {
      const fields = getFieldsForCategory('nonexistent')

      expect(fields).toBeDefined()
      expect(Array.isArray(fields)).toBe(true)
      expect(fields.length).toBe(0)
    })

    it('should return correct fields for each category', () => {
      const userFields = getFieldsForCategory('users')
      const gradeFields = getFieldsForCategory('grades')

      expect(userFields).not.toEqual(gradeFields)
      expect(userFields.some(f => f.key === 'cpf')).toBe(true)
      expect(gradeFields.some(f => f.key === 'cpf')).toBe(false)
    })
  })

  describe('getRequiredFields', () => {
    it('should return only required field keys', () => {
      const requiredFields = getRequiredFields('users')

      expect(requiredFields).toContain('full_name')
      expect(requiredFields).toContain('email')
      expect(requiredFields).not.toContain('phone')
      expect(requiredFields).not.toContain('cpf')
    })

    it('should return empty array for invalid category', () => {
      const requiredFields = getRequiredFields('nonexistent')

      expect(requiredFields).toEqual([])
    })

    it('should return correct required fields for grades', () => {
      const requiredFields = getRequiredFields('grades')

      expect(requiredFields).toContain('full_name')
      expect(requiredFields).toContain('course')
      expect(requiredFields).toContain('grade')
      expect(requiredFields).not.toContain('status')
    })

    it('should return correct required fields for enrollments', () => {
      const requiredFields = getRequiredFields('enrollments')

      expect(requiredFields).toContain('full_name')
      expect(requiredFields).toContain('course')
      expect(requiredFields).toContain('enrollment_date')
    })

    it('should return correct required fields for student-history', () => {
      const requiredFields = getRequiredFields('student-history')

      expect(requiredFields).toContain('course_name')
      expect(requiredFields).toContain('student_name')
      expect(requiredFields).toContain('code')
      expect(requiredFields).toContain('name')
      expect(requiredFields).not.toContain('last_access')
    })
  })

  describe('getFieldLabel', () => {
    it('should return correct label for existing field', () => {
      const label = getFieldLabel('users', 'full_name')

      expect(label).toBe('Nome Completo')
    })

    it('should return field key if field not found', () => {
      const label = getFieldLabel('users', 'nonexistent_field')

      expect(label).toBe('nonexistent_field')
    })

    it('should return field key for invalid category', () => {
      const label = getFieldLabel('nonexistent', 'full_name')

      expect(label).toBe('full_name')
    })

    it('should return correct labels for different fields', () => {
      expect(getFieldLabel('users', 'email')).toBe('Email')
      expect(getFieldLabel('users', 'phone')).toBe('Telefone/WhatsApp')
      expect(getFieldLabel('users', 'cpf')).toBe('CPF')
      expect(getFieldLabel('grades', 'grade')).toBe('Nota')
      expect(getFieldLabel('enrollments', 'enrollment_date')).toBe('Data de Matrícula')
    })

    it('should return correct labels for student-history fields', () => {
      expect(getFieldLabel('student-history', 'course_name')).toBe('Nome do Curso')
      expect(getFieldLabel('student-history', 'code')).toBe('Código')
      expect(getFieldLabel('student-history', 'workload')).toBe('Carga Horária')
    })
  })

  describe('isFieldRequired', () => {
    it('should return true for required fields', () => {
      expect(isFieldRequired('users', 'full_name')).toBe(true)
      expect(isFieldRequired('users', 'email')).toBe(true)
      expect(isFieldRequired('grades', 'grade')).toBe(true)
    })

    it('should return false for optional fields', () => {
      expect(isFieldRequired('users', 'phone')).toBe(false)
      expect(isFieldRequired('users', 'cpf')).toBe(false)
      expect(isFieldRequired('grades', 'status')).toBe(false)
    })

    it('should return false for nonexistent field', () => {
      expect(isFieldRequired('users', 'nonexistent')).toBe(false)
    })

    it('should return false for nonexistent category', () => {
      expect(isFieldRequired('nonexistent', 'full_name')).toBe(false)
    })

    it('should handle student-history required fields correctly', () => {
      expect(isFieldRequired('student-history', 'course_name')).toBe(true)
      expect(isFieldRequired('student-history', 'student_name')).toBe(true)
      expect(isFieldRequired('student-history', 'code')).toBe(true)
      expect(isFieldRequired('student-history', 'name')).toBe(true)
      expect(isFieldRequired('student-history', 'completion_date')).toBe(false)
      expect(isFieldRequired('student-history', 'score')).toBe(false)
    })
  })

  describe('field types', () => {
    it('should correctly identify static fields in student-history', () => {
      const fields = getFieldsForCategory('student-history')
      const staticFields = fields.filter(f => f.type === 'static')

      expect(staticFields.some(f => f.key === 'course_name')).toBe(true)
      expect(staticFields.some(f => f.key === 'student_name')).toBe(true)
      expect(staticFields.some(f => f.key === 'approval')).toBe(true)
    })

    it('should correctly identify table fields in student-history', () => {
      const fields = getFieldsForCategory('student-history')
      const tableFields = fields.filter(f => f.type === 'table')

      expect(tableFields.some(f => f.key === 'code')).toBe(true)
      expect(tableFields.some(f => f.key === 'name')).toBe(true)
      expect(tableFields.some(f => f.key === 'workload')).toBe(true)
      expect(tableFields.some(f => f.key === 'completion_date')).toBe(true)
      expect(tableFields.some(f => f.key === 'score')).toBe(true)
    })
  })

  describe('field descriptions', () => {
    it('should have descriptions for fields', () => {
      const userFields = getFieldsForCategory('users')

      const fullNameField = userFields.find(f => f.key === 'full_name')
      expect(fullNameField?.description).toBeDefined()
      expect(fullNameField?.description).not.toBe('')

      const emailField = userFields.find(f => f.key === 'email')
      expect(emailField?.description).toBeDefined()
      expect(emailField?.description).not.toBe('')
    })

    it('should have descriptions for all categories', () => {
      Object.entries(TEMPLATE_FIELDS_BY_CATEGORY).forEach(([category, fields]) => {
        fields.forEach(field => {
          if (field.description) {
            expect(typeof field.description).toBe('string')
            expect(field.description.length).toBeGreaterThan(0)
          }
        })
      })
    })
  })
})
