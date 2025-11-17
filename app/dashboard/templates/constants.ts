'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Award,
  BookOpen,
  FileSpreadsheet,
  FileText,
  ScrollText,
  Users,
} from 'lucide-react'

export interface TemplateCategory {
  value: string
  label: string
  icon: LucideIcon
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    value: 'users',
    label: 'Relatório de Usuários',
    icon: Users,
  },
  {
    value: 'grades',
    label: 'Relatório de Notas',
    icon: Award,
  },
  {
    value: 'enrollments',
    label: 'Relatório de Matrículas',
    icon: BookOpen,
  },
  {
    value: 'access',
    label: 'Relatório de Acessos',
    icon: Activity,
  },
  {
    value: 'student-history',
    label: 'Histórico do Aluno',
    icon: ScrollText,
  },
  {
    value: 'certificate-docx',
    label: 'Certificados DOCX',
    icon: FileText,
  },
]

export const DEFAULT_TEMPLATE_ICON = FileSpreadsheet
