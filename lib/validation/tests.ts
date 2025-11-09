import { z } from 'zod'

/**
 * Schema de validação para submissão de teste
 */
export const testSubmissionSchema = z.object({
  testId: z.string().uuid('ID de teste inválido'),
  answers: z.record(z.string(), z.string().min(1, 'Resposta não pode ser vazia'))
})

export type TestSubmissionInput = z.infer<typeof testSubmissionSchema>
