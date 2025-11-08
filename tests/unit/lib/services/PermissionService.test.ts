import { describe, it, expect, beforeEach } from 'vitest'
import {
  PermissionService,
  type User,
  type Resource,
  type UserRole,
} from '@/lib/services/PermissionService'

describe('PermissionService', () => {
  let service: PermissionService

  beforeEach(() => {
    service = new PermissionService()
  })

  const createUser = (role: UserRole, id: string = 'user-1', organization_id?: string): User => ({
    id,
    role,
    organization_id,
  })

  const createResource = (
    type: Resource['type'],
    overrides?: Partial<Resource>
  ): Resource => ({
    id: 'resource-1',
    type,
    ...overrides,
  })

  describe('Role Checks', () => {
    it('hasRole should return true for matching role', () => {
      const admin = createUser('admin')
      expect(service.hasRole(admin, 'admin')).toBe(true)
    })

    it('hasRole should return false for non-matching role', () => {
      const student = createUser('student')
      expect(service.hasRole(student, 'admin')).toBe(false)
    })

    it('hasAnyRole should return true if user has one of the roles', () => {
      const instructor = createUser('instructor')
      expect(service.hasAnyRole(instructor, ['admin', 'instructor'])).toBe(true)
    })

    it('hasAnyRole should return false if user has none of the roles', () => {
      const student = createUser('student')
      expect(service.hasAnyRole(student, ['admin', 'instructor'])).toBe(false)
    })

    it('isAdmin should identify admin users', () => {
      expect(service.isAdmin(createUser('admin'))).toBe(true)
      expect(service.isAdmin(createUser('instructor'))).toBe(false)
    })

    it('isInstructor should identify instructor users', () => {
      expect(service.isInstructor(createUser('instructor'))).toBe(true)
      expect(service.isInstructor(createUser('student'))).toBe(false)
    })

    it('isStudent should identify student users', () => {
      expect(service.isStudent(createUser('student'))).toBe(true)
      expect(service.isStudent(createUser('admin'))).toBe(false)
    })
  })

  describe('canAccess', () => {
    it('admin can access any resource', () => {
      const admin = createUser('admin')
      const resource = createResource('course')

      expect(service.canAccess(admin, resource)).toBe(true)
    })

    it('owner can access their own resource', () => {
      const user = createUser('student', 'user-1')
      const resource = createResource('enrollment', { owner_id: 'user-1' })

      expect(service.canAccess(user, resource)).toBe(true)
    })

    it('instructor can access courses they created', () => {
      const instructor = createUser('instructor', 'inst-1')
      const course = createResource('course', { instructor_id: 'inst-1' })

      expect(service.canAccess(instructor, course)).toBe(true)
    })

    it('student can access their own enrollment', () => {
      const student = createUser('student', 'student-1')
      const enrollment = createResource('enrollment', { student_id: 'student-1' })

      expect(service.canAccess(student, enrollment)).toBe(true)
    })

    it('instructor can access enrollments of their courses', () => {
      const instructor = createUser('instructor', 'inst-1')
      const enrollment = createResource('enrollment', {
        student_id: 'student-1',
        instructor_id: 'inst-1',
      })

      expect(service.canAccess(instructor, enrollment)).toBe(true)
    })

    it('student can access their own test', () => {
      const student = createUser('student', 'student-1')
      const test = createResource('test', { student_id: 'student-1' })

      expect(service.canAccess(student, test)).toBe(true)
    })

    it('instructor can access reports', () => {
      const instructor = createUser('instructor')
      const report = createResource('report')

      expect(service.canAccess(instructor, report)).toBe(true)
    })

    it('student cannot access reports', () => {
      const student = createUser('student')
      const report = createResource('report')

      expect(service.canAccess(student, report)).toBe(false)
    })

    it('user can access their own user profile', () => {
      const user = createUser('student', 'user-1')
      const userResource = createResource('user', { id: 'user-1' })

      expect(service.canAccess(user, userResource)).toBe(true)
    })

    it('student cannot access another student enrollment', () => {
      const student = createUser('student', 'student-1')
      const enrollment = createResource('enrollment', { student_id: 'student-2' })

      expect(service.canAccess(student, enrollment)).toBe(false)
    })
  })

  describe('canEdit', () => {
    it('admin can edit any resource', () => {
      const admin = createUser('admin')
      const resource = createResource('course')

      expect(service.canEdit(admin, resource)).toBe(true)
    })

    it('owner can edit their resource', () => {
      const user = createUser('instructor', 'user-1')
      const resource = createResource('course', { owner_id: 'user-1' })

      expect(service.canEdit(user, resource)).toBe(true)
    })

    it('instructor can edit their courses', () => {
      const instructor = createUser('instructor', 'inst-1')
      const course = createResource('course', { instructor_id: 'inst-1' })

      expect(service.canEdit(instructor, course)).toBe(true)
    })

    it('instructor can edit tests of their courses', () => {
      const instructor = createUser('instructor', 'inst-1')
      const test = createResource('test', { instructor_id: 'inst-1' })

      expect(service.canEdit(instructor, test)).toBe(true)
    })

    it('student cannot edit courses', () => {
      const student = createUser('student')
      const course = createResource('course')

      expect(service.canEdit(student, course)).toBe(false)
    })

    it('instructor cannot edit another instructor course', () => {
      const instructor = createUser('instructor', 'inst-1')
      const course = createResource('course', { instructor_id: 'inst-2' })

      expect(service.canEdit(instructor, course)).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('admin can delete any resource', () => {
      const admin = createUser('admin')
      const resource = createResource('course')

      expect(service.canDelete(admin, resource)).toBe(true)
    })

    it('instructor can delete their courses', () => {
      const instructor = createUser('instructor', 'inst-1')
      const course = createResource('course', { instructor_id: 'inst-1' })

      expect(service.canDelete(instructor, course)).toBe(true)
    })

    it('instructor can delete tests of their courses', () => {
      const instructor = createUser('instructor', 'inst-1')
      const test = createResource('test', { instructor_id: 'inst-1' })

      expect(service.canDelete(instructor, test)).toBe(true)
    })

    it('student cannot delete courses', () => {
      const student = createUser('student')
      const course = createResource('course')

      expect(service.canDelete(student, course)).toBe(false)
    })

    it('instructor cannot delete another instructor course', () => {
      const instructor = createUser('instructor', 'inst-1')
      const course = createResource('course', { instructor_id: 'inst-2' })

      expect(service.canDelete(instructor, course)).toBe(false)
    })

    it('student cannot delete enrollments', () => {
      const student = createUser('student', 'student-1')
      const enrollment = createResource('enrollment', { student_id: 'student-1' })

      expect(service.canDelete(student, enrollment)).toBe(false)
    })
  })

  describe('canCreate', () => {
    it('admin can create any resource type', () => {
      const admin = createUser('admin')

      expect(service.canCreate(admin, 'course')).toBe(true)
      expect(service.canCreate(admin, 'test')).toBe(true)
      expect(service.canCreate(admin, 'enrollment')).toBe(true)
      expect(service.canCreate(admin, 'certificate')).toBe(true)
      expect(service.canCreate(admin, 'user')).toBe(true)
      expect(service.canCreate(admin, 'report')).toBe(true)
    })

    it('instructor can create courses and tests', () => {
      const instructor = createUser('instructor')

      expect(service.canCreate(instructor, 'course')).toBe(true)
      expect(service.canCreate(instructor, 'test')).toBe(true)
    })

    it('instructor can create reports', () => {
      const instructor = createUser('instructor')

      expect(service.canCreate(instructor, 'report')).toBe(true)
    })

    it('student can create enrollments', () => {
      const student = createUser('student')

      expect(service.canCreate(student, 'enrollment')).toBe(true)
    })

    it('student can create certificate requests', () => {
      const student = createUser('student')

      expect(service.canCreate(student, 'certificate')).toBe(true)
    })

    it('student cannot create courses', () => {
      const student = createUser('student')

      expect(service.canCreate(student, 'course')).toBe(false)
    })

    it('instructor cannot create users', () => {
      const instructor = createUser('instructor')

      expect(service.canCreate(instructor, 'user')).toBe(false)
    })

    it('student cannot create users', () => {
      const student = createUser('student')

      expect(service.canCreate(student, 'user')).toBe(false)
    })
  })

  describe('canViewUserData', () => {
    it('admin can view any user data', () => {
      const admin = createUser('admin', 'admin-1')

      expect(service.canViewUserData(admin, 'student-1')).toBe(true)
    })

    it('user can view their own data', () => {
      const user = createUser('student', 'user-1')

      expect(service.canViewUserData(user, 'user-1')).toBe(true)
    })

    it('instructor can view student data (requires context validation)', () => {
      const instructor = createUser('instructor', 'inst-1')

      expect(service.canViewUserData(instructor, 'student-1')).toBe(true)
    })

    it('student cannot view other student data', () => {
      const student = createUser('student', 'student-1')

      expect(service.canViewUserData(student, 'student-2')).toBe(false)
    })
  })

  describe('canManageGrades', () => {
    it('admin can manage all grades', () => {
      const admin = createUser('admin')

      expect(service.canManageGrades(admin)).toBe(true)
    })

    it('instructor can manage grades without resource context', () => {
      const instructor = createUser('instructor')

      expect(service.canManageGrades(instructor)).toBe(true)
    })

    it('instructor can manage grades of their courses', () => {
      const instructor = createUser('instructor', 'inst-1')
      const resource = createResource('test', { instructor_id: 'inst-1' })

      expect(service.canManageGrades(instructor, resource)).toBe(true)
    })

    it('instructor cannot manage grades of other instructor courses', () => {
      const instructor = createUser('instructor', 'inst-1')
      const resource = createResource('test', { instructor_id: 'inst-2' })

      expect(service.canManageGrades(instructor, resource)).toBe(false)
    })

    it('student cannot manage grades', () => {
      const student = createUser('student')

      expect(service.canManageGrades(student)).toBe(false)
    })
  })

  describe('canApproveCertificates', () => {
    it('admin can approve certificates', () => {
      const admin = createUser('admin')

      expect(service.canApproveCertificates(admin)).toBe(true)
    })

    it('instructor cannot approve certificates', () => {
      const instructor = createUser('instructor')

      expect(service.canApproveCertificates(instructor)).toBe(false)
    })

    it('student cannot approve certificates', () => {
      const student = createUser('student')

      expect(service.canApproveCertificates(student)).toBe(false)
    })
  })

  describe('canViewAsStudent', () => {
    it('admin can view as student', () => {
      const admin = createUser('admin')

      expect(service.canViewAsStudent(admin)).toBe(true)
    })

    it('instructor can view as student', () => {
      const instructor = createUser('instructor')

      expect(service.canViewAsStudent(instructor)).toBe(true)
    })

    it('student cannot view as student (no preview mode)', () => {
      const student = createUser('student')

      expect(service.canViewAsStudent(student)).toBe(false)
    })
  })

  describe('validatePermission', () => {
    it('should validate view permission successfully', () => {
      const admin = createUser('admin')
      const resource = createResource('course')

      const result = service.validatePermission(admin, 'view', resource)

      expect(result.allowed).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate create permission successfully', () => {
      const instructor = createUser('instructor')
      const resource = createResource('course')

      const result = service.validatePermission(instructor, 'create', resource)

      expect(result.allowed).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error for denied view permission', () => {
      const student = createUser('student', 'student-1')
      const resource = createResource('course', { instructor_id: 'inst-1' })

      const result = service.validatePermission(student, 'view', resource)

      expect(result.allowed).toBe(false)
      expect(result.error).toContain('student')
      expect(result.error).toContain('view')
    })

    it('should return error for denied delete permission', () => {
      const student = createUser('student')
      const resource = createResource('course')

      const result = service.validatePermission(student, 'delete', resource)

      expect(result.allowed).toBe(false)
      expect(result.error).toContain('student')
      expect(result.error).toContain('delete')
    })

    it('should validate edit permission for instructor', () => {
      const instructor = createUser('instructor', 'inst-1')
      const resource = createResource('course', { instructor_id: 'inst-1' })

      const result = service.validatePermission(instructor, 'edit', resource)

      expect(result.allowed).toBe(true)
    })

    it('should deny edit permission for student', () => {
      const student = createUser('student')
      const resource = createResource('course')

      const result = service.validatePermission(student, 'edit', resource)

      expect(result.allowed).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
