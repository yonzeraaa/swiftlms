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
    { key: 'course_code', label: 'Código do Curso', required: false, description: 'Código/slug do curso' },
    { key: 'enrollment_date', label: 'Data de Matrícula', required: false, description: 'Data de matrícula no curso' },
    { key: 'completed_at', label: 'Data de Conclusão', required: false, description: 'Data de conclusão do curso' },
    { key: 'created_at', label: 'Data de Cadastro', required: false, description: 'Data de criação do cadastro' },
    { key: 'grade', label: 'Nota/Pontuação', required: false, description: 'Nota ou pontuação do usuário' },
    { key: 'progress', label: 'Progresso (%)', required: false, description: 'Percentual de progresso no curso' },
    { key: 'time_in_system', label: 'Tempo no Sistema (h)', required: false, description: 'Tempo em horas que o usuário está no sistema' },
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
  'student-history': [
    // Cabeçalho
    { key: 'course_name', label: 'Nome do Curso', required: true, description: 'Nome completo do curso' },
    { key: 'category', label: 'Categoria', required: true, description: 'Categoria do curso (ex: Pós-graduação)' },
    { key: 'institution', label: 'Instituição', required: true, description: 'Nome da instituição' },
    { key: 'enrollment_date', label: 'Matrícula', required: false, description: 'Data de matrícula do aluno' },
    { key: 'coordination', label: 'Coordenação', required: false, description: 'Nome do coordenador do curso' },
    { key: 'student_name', label: 'Aluno', required: true, description: 'Nome completo do aluno' },
    // Situação Acadêmica
    { key: 'approval', label: 'Aprovação', required: true, description: 'Status de aprovação (Sim/Não)' },
    { key: 'last_access', label: 'Último acesso', required: false, description: 'Data e hora do último acesso' },
    { key: 'tests_grade', label: 'Avaliação dos testes', required: true, description: 'Nota média dos testes' },
    { key: 'tcc_grade', label: 'Avaliação do TCC', required: true, description: 'Nota do TCC' },
    { key: 'general_average', label: 'Média Geral', required: true, description: 'Média geral ponderada' },
    // Tabela de Módulos e Disciplinas
    { key: 'code', label: 'Código', required: true, description: 'Código do módulo ou disciplina' },
    { key: 'name', label: 'Módulos e Disciplinas', required: true, description: 'Nome do módulo ou disciplina' },
    { key: 'workload', label: 'Carga Horária', required: true, description: 'Carga horária em horas' },
    { key: 'completion_date', label: 'Data da Finalização', required: false, description: 'Data de conclusão da disciplina' },
    { key: 'score', label: 'Pontuação', required: false, description: 'Pontuação obtida' },
    // Totais
    { key: 'total_workload', label: 'Total Carga Horária', required: false, description: 'Soma total de todas as cargas horárias' },
    { key: 'total_duration_days', label: 'Total Duração (Dias)', required: false, description: 'Tempo total do curso em dias' },
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
