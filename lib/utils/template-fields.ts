export interface FieldDefinition {
  key: string
  label: string
  required: boolean
  description?: string
}

export const TEMPLATE_FIELDS_BY_CATEGORY: Record<string, FieldDefinition[]> = {
  users: [
    { key: 'full_name', label: 'Nome Completo', required: true, description: 'Nome completo do usuário' },
    { key: 'email', label: 'Email', required: true, description: 'Email do usuário' },
    { key: 'phone', label: 'Telefone/WhatsApp', required: false, description: 'Número de telefone ou WhatsApp' },
    { key: 'cpf', label: 'CPF', required: false, description: 'CPF do usuário' },
    { key: 'role', label: 'Perfil/Tipo', required: false, description: 'Perfil ou tipo de usuário' },
    { key: 'status', label: 'Status', required: false, description: 'Status do usuário (ativo, inativo, etc)' },
    { key: 'course', label: 'Curso', required: false, description: 'Curso matriculado' },
    { key: 'enrollment_date', label: 'Data de Matrícula', required: false, description: 'Data de matrícula no curso' },
    { key: 'created_at', label: 'Data de Cadastro', required: false, description: 'Data de criação do cadastro' },
    { key: 'grade', label: 'Nota/Pontuação', required: false, description: 'Nota ou pontuação do usuário' },
    { key: 'progress', label: 'Progresso (%)', required: false, description: 'Percentual de progresso no curso' },
  ],
  grades: [
    { key: 'full_name', label: 'Nome Completo', required: true, description: 'Nome do aluno' },
    { key: 'course', label: 'Curso', required: true, description: 'Nome do curso' },
    { key: 'grade', label: 'Nota', required: true, description: 'Nota obtida' },
    { key: 'status', label: 'Status', required: false, description: 'Status da avaliação' },
    { key: 'created_at', label: 'Data da Avaliação', required: false, description: 'Data da avaliação' },
  ],
  enrollments: [
    { key: 'full_name', label: 'Nome Completo', required: true, description: 'Nome do aluno' },
    { key: 'course', label: 'Curso', required: true, description: 'Nome do curso' },
    { key: 'enrollment_date', label: 'Data de Matrícula', required: true, description: 'Data de matrícula' },
    { key: 'status', label: 'Status', required: false, description: 'Status da matrícula' },
    { key: 'email', label: 'Email', required: false, description: 'Email do aluno' },
    { key: 'phone', label: 'Telefone', required: false, description: 'Telefone do aluno' },
  ],
  access: [
    { key: 'full_name', label: 'Nome Completo', required: true, description: 'Nome do usuário' },
    { key: 'email', label: 'Email', required: true, description: 'Email do usuário' },
    { key: 'created_at', label: 'Data/Hora do Acesso', required: false, description: 'Timestamp do acesso' },
    { key: 'course', label: 'Curso Acessado', required: false, description: 'Curso que foi acessado' },
  ],
}

export function getFieldsForCategory(category: string): FieldDefinition[] {
  return TEMPLATE_FIELDS_BY_CATEGORY[category] || []
}

export function getRequiredFields(category: string): string[] {
  const fields = getFieldsForCategory(category)
  return fields.filter(f => f.required).map(f => f.key)
}

export function getFieldLabel(category: string, fieldKey: string): string {
  const fields = getFieldsForCategory(category)
  const field = fields.find(f => f.key === fieldKey)
  return field?.label || fieldKey
}

export function isFieldRequired(category: string, fieldKey: string): boolean {
  const fields = getFieldsForCategory(category)
  const field = fields.find(f => f.key === fieldKey)
  return field?.required || false
}
