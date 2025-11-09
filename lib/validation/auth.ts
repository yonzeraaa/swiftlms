import { z } from 'zod'

/**
 * Schema de validação para login
 */
export const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(128, 'Senha muito longa')
})

/**
 * Schema de validação para reset de senha
 */
export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo')
})

/**
 * Schema de validação para view-as-student
 */
export const viewAsStudentSchema = z.object({
  userId: z.string().uuid('ID de usuário inválido')
})

export type LoginInput = z.infer<typeof loginSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ViewAsStudentInput = z.infer<typeof viewAsStudentSchema>
