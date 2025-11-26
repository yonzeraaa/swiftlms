import { describe, it, expect } from 'vitest'
import {
  mapUsersDataForTemplate,
  type UserReportData,
  type UserRowData,
} from '@/lib/excel-template-mappers/users-mapper'

describe('users-mapper', () => {
  describe('mapUsersDataForTemplate', () => {
    it('should map users data correctly', () => {
      const data: UserReportData = {
        institution: 'IPETEC',
        users: [
          {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '(11) 98765-4321',
            course_code: 'js-basic',
            role: 'Aluno',
            grade: 85,
            progress: 75,
            enrollment_date: '01/01/2024',
            completed_at: '-',
            time_in_system: 120,
            status: 'Ativo',
          },
        ],
      }

      const result = mapUsersDataForTemplate(data)

      expect(result.institution).toBe('IPETEC')
      expect(result.users).toHaveLength(1)
      expect(result.users[0].full_name).toBe('John Doe')
      expect(result.users[0].grade).toBe(85)
    })

    it('should preserve all user fields', () => {
      const user: UserRowData = {
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '(21) 99999-8888',
        course_code: 'python-adv',
        role: 'Instrutor',
        grade: 95.5,
        progress: 100,
        enrollment_date: '15/01/2024',
        completed_at: '30/01/2024',
        time_in_system: 360,
        status: 'Concluído',
      }

      const data: UserReportData = {
        institution: 'Test Institution',
        users: [user],
      }

      const result = mapUsersDataForTemplate(data)

      expect(result.users[0]).toEqual(user)
    })

    it('should handle multiple users', () => {
      const data: UserReportData = {
        institution: 'IPETEC',
        users: [
          {
            full_name: 'User 1',
            email: 'user1@example.com',
            phone: '111111111',
            course_code: 'course-1',
            role: 'Aluno',
            grade: 70,
            progress: 50,
            enrollment_date: '01/01/2024',
            completed_at: '-',
            time_in_system: 100,
            status: 'Ativo',
          },
          {
            full_name: 'User 2',
            email: 'user2@example.com',
            phone: '222222222',
            course_code: 'course-2',
            role: 'Aluno',
            grade: 90,
            progress: 100,
            enrollment_date: '05/01/2024',
            completed_at: '30/01/2024',
            time_in_system: 600,
            status: 'Concluído',
          },
        ],
      }

      const result = mapUsersDataForTemplate(data)

      expect(result.users).toHaveLength(2)
      expect(result.users[0].full_name).toBe('User 1')
      expect(result.users[1].full_name).toBe('User 2')
    })

    it('should handle empty users array', () => {
      const data: UserReportData = {
        institution: 'IPETEC',
        users: [],
      }

      const result = mapUsersDataForTemplate(data)

      expect(result.users).toEqual([])
      expect(result.institution).toBe('IPETEC')
    })

    it('should handle users without phone', () => {
      const data: UserReportData = {
        institution: 'IPETEC',
        users: [
          {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '',
            course_code: 'js-basic',
            role: 'Aluno',
            grade: 85,
            progress: 75,
            enrollment_date: '01/01/2024',
            completed_at: '-',
            time_in_system: 120,
            status: 'Ativo',
          },
        ],
      }

      const result = mapUsersDataForTemplate(data)

      expect(result.users[0].phone).toBe('')
    })

    it('should handle decimal grades and progress', () => {
      const data: UserReportData = {
        institution: 'IPETEC',
        users: [
          {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '111111111',
            course_code: 'math',
            role: 'Aluno',
            grade: 87.3,
            progress: 75.5,
            enrollment_date: '01/01/2024',
            completed_at: '-',
            time_in_system: 150,
            status: 'Ativo',
          },
        ],
      }

      const result = mapUsersDataForTemplate(data)

      expect(result.users[0].grade).toBe(87.3)
      expect(result.users[0].progress).toBe(75.5)
    })

    it('should preserve data structure', () => {
      const data: UserReportData = {
        institution: 'IPETEC',
        users: [],
      }

      const result = mapUsersDataForTemplate(data)

      expect(Object.keys(result)).toEqual(['institution', 'users'])
    })

    it('should handle different role values', () => {
      const data: UserReportData = {
        institution: 'IPETEC',
        users: [
          {
            full_name: 'Student',
            email: 'student@example.com',
            phone: '',
            course_code: 'course',
            role: 'Aluno',
            grade: 80,
            progress: 60,
            enrollment_date: '01/01/2024',
            completed_at: '-',
            time_in_system: 100,
            status: 'Ativo',
          },
          {
            full_name: 'Instructor',
            email: 'instructor@example.com',
            phone: '',
            course_code: 'course',
            role: 'Instrutor',
            grade: 0,
            progress: 0,
            enrollment_date: '',
            completed_at: '',
            time_in_system: 0,
            status: 'Ativo',
          },
        ],
      }

      const result = mapUsersDataForTemplate(data)

      expect(result.users[0].role).toBe('Aluno')
      expect(result.users[1].role).toBe('Instrutor')
    })

    it('should handle different status values', () => {
      const data: UserReportData = {
        institution: 'IPETEC',
        users: [
          {
            full_name: 'Active User',
            email: 'active@example.com',
            phone: '',
            course_code: 'course',
            role: 'Aluno',
            grade: 80,
            progress: 60,
            enrollment_date: '01/01/2024',
            completed_at: '-',
            time_in_system: 100,
            status: 'Ativo',
          },
          {
            full_name: 'Completed User',
            email: 'completed@example.com',
            phone: '',
            course_code: 'course',
            role: 'Aluno',
            grade: 90,
            progress: 100,
            enrollment_date: '01/01/2024',
            completed_at: '30/01/2024',
            time_in_system: 700,
            status: 'Concluído',
          },
        ],
      }

      const result = mapUsersDataForTemplate(data)

      expect(result.users[0].status).toBe('Ativo')
      expect(result.users[1].status).toBe('Concluído')
    })
  })
})
