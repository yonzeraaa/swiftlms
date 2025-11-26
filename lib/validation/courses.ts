import { z } from 'zod'

/**
 * Schema de validação para matrícula em curso
 */
export const enrollmentSchema = z.object({
  courseId: z.string().uuid('ID de curso inválido'),
  studentIds: z.array(z.string().uuid('ID de estudante inválido')).optional(),
  students: z.array(z.object({
    studentId: z.string().uuid('ID de estudante inválido'),
    moduleIds: z.array(z.string().uuid('ID de módulo inválido')).optional()
  })).optional()
}).refine(
  data => (data.studentIds && data.studentIds.length > 0) || (data.students && data.students.length > 0),
  { message: 'Pelo menos um estudante deve ser fornecido' }
)

export type EnrollmentInput = z.infer<typeof enrollmentSchema>
