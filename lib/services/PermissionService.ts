export type UserRole = 'admin' | 'instructor' | 'student'

export interface User {
  id: string
  role: UserRole
  organization_id?: string
}

export interface Resource {
  id: string
  type: 'course' | 'enrollment' | 'test' | 'certificate' | 'user' | 'report'
  owner_id?: string
  instructor_id?: string
  student_id?: string
  organization_id?: string
}

export class PermissionService {
  /**
   * Verifica se o usuário tem a role especificada
   */
  hasRole(user: User, role: UserRole): boolean {
    return user.role === role
  }

  /**
   * Verifica se o usuário tem qualquer uma das roles especificadas
   */
  hasAnyRole(user: User, roles: UserRole[]): boolean {
    return roles.includes(user.role)
  }

  /**
   * Verifica se o usuário é admin
   */
  isAdmin(user: User): boolean {
    return user.role === 'admin'
  }

  /**
   * Verifica se o usuário é instrutor
   */
  isInstructor(user: User): boolean {
    return user.role === 'instructor'
  }

  /**
   * Verifica se o usuário é estudante
   */
  isStudent(user: User): boolean {
    return user.role === 'student'
  }

  /**
   * Verifica se o usuário pode acessar um recurso
   */
  canAccess(user: User, resource: Resource): boolean {
    // Admin tem acesso a tudo
    if (this.isAdmin(user)) {
      return true
    }

    // Verifica propriedade do recurso
    if (resource.owner_id === user.id) {
      return true
    }

    // Regras específicas por tipo de recurso
    switch (resource.type) {
      case 'course':
        // Instrutor pode acessar cursos que ele criou
        if (this.isInstructor(user) && resource.instructor_id === user.id) {
          return true
        }
        break

      case 'enrollment':
        // Estudante pode acessar suas próprias matrículas
        if (this.isStudent(user) && resource.student_id === user.id) {
          return true
        }
        // Instrutor pode acessar matrículas de seus cursos
        if (this.isInstructor(user) && resource.instructor_id === user.id) {
          return true
        }
        break

      case 'test':
      case 'certificate':
        // Estudante pode acessar seus próprios testes/certificados
        if (this.isStudent(user) && resource.student_id === user.id) {
          return true
        }
        // Instrutor pode acessar testes/certificados de seus cursos
        if (this.isInstructor(user) && resource.instructor_id === user.id) {
          return true
        }
        break

      case 'user':
        // Usuários podem acessar seu próprio perfil
        if (resource.id === user.id) {
          return true
        }
        break

      case 'report':
        // Apenas admin e instrutor podem acessar relatórios
        if (this.isInstructor(user) || this.isAdmin(user)) {
          return true
        }
        break
    }

    return false
  }

  /**
   * Verifica se o usuário pode editar um recurso
   */
  canEdit(user: User, resource: Resource): boolean {
    // Admin pode editar tudo
    if (this.isAdmin(user)) {
      return true
    }

    // Proprietário pode editar
    if (resource.owner_id === user.id) {
      return true
    }

    // Regras específicas por tipo
    switch (resource.type) {
      case 'course':
        // Instrutor pode editar seus cursos
        return this.isInstructor(user) && resource.instructor_id === user.id

      case 'test':
        // Apenas admin e instrutor do curso podem editar testes
        return this.isInstructor(user) && resource.instructor_id === user.id

      default:
        return false
    }
  }

  /**
   * Verifica se o usuário pode deletar um recurso
   */
  canDelete(user: User, resource: Resource): boolean {
    // Apenas admin pode deletar
    if (this.isAdmin(user)) {
      return true
    }

    // Instrutor pode deletar recursos de seus cursos
    if (resource.type === 'course' || resource.type === 'test') {
      return this.isInstructor(user) && resource.instructor_id === user.id
    }

    return false
  }

  /**
   * Verifica se o usuário pode criar um tipo de recurso
   */
  canCreate(user: User, resourceType: Resource['type']): boolean {
    // Admin pode criar tudo
    if (this.isAdmin(user)) {
      return true
    }

    switch (resourceType) {
      case 'course':
      case 'test':
        // Instrutor pode criar cursos e testes
        return this.isInstructor(user)

      case 'enrollment':
        // Estudante pode se matricular
        return this.isStudent(user)

      case 'certificate':
        // Estudante pode solicitar certificado
        return this.isStudent(user)

      case 'user':
        // Apenas admin pode criar usuários
        return false

      case 'report':
        // Instrutor e admin podem gerar relatórios
        return this.isInstructor(user)

      default:
        return false
    }
  }

  /**
   * Verifica se o usuário pode visualizar dados de outro usuário
   */
  canViewUserData(viewer: User, targetUserId: string): boolean {
    // Admin pode ver tudo
    if (this.isAdmin(viewer)) {
      return true
    }

    // Usuário pode ver seus próprios dados
    if (viewer.id === targetUserId) {
      return true
    }

    // Instrutor pode ver dados de estudantes em seus cursos
    // (precisa ser validado com dados do curso no contexto de uso)
    if (this.isInstructor(viewer)) {
      return true // Validação adicional necessária no contexto
    }

    return false
  }

  /**
   * Verifica se o usuário pode gerenciar notas
   */
  canManageGrades(user: User, resource?: Resource): boolean {
    // Admin pode gerenciar todas as notas
    if (this.isAdmin(user)) {
      return true
    }

    // Instrutor pode gerenciar notas de seus cursos
    if (this.isInstructor(user)) {
      if (!resource) return true
      return resource.instructor_id === user.id
    }

    return false
  }

  /**
   * Verifica se o usuário pode aprovar certificados
   */
  canApproveCertificates(user: User): boolean {
    // Apenas admin pode aprovar certificados
    return this.isAdmin(user)
  }

  /**
   * Verifica se o usuário pode visualizar modo estudante (preview)
   */
  canViewAsStudent(user: User): boolean {
    // Admin e instrutor podem visualizar como estudante
    return this.isAdmin(user) || this.isInstructor(user)
  }

  /**
   * Valida permissão e retorna erro descritivo
   */
  validatePermission(
    user: User,
    action: 'view' | 'create' | 'edit' | 'delete',
    resource?: Resource
  ): { allowed: boolean; error?: string } {
    let allowed = false

    switch (action) {
      case 'view':
        allowed = resource ? this.canAccess(user, resource) : false
        break
      case 'create':
        allowed = resource ? this.canCreate(user, resource.type) : false
        break
      case 'edit':
        allowed = resource ? this.canEdit(user, resource) : false
        break
      case 'delete':
        allowed = resource ? this.canDelete(user, resource) : false
        break
    }

    if (!allowed) {
      return {
        allowed: false,
        error: `Usuário com role "${user.role}" não tem permissão para ${action} este recurso`,
      }
    }

    return { allowed: true }
  }
}
