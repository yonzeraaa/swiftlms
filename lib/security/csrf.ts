import { headers } from 'next/headers'

/**
 * Valida proteção CSRF verificando a origem da requisição
 *
 * @param request - Request object do Next.js
 * @returns true se a requisição é de origem confiável
 */
export async function validateCSRF(request: Request): Promise<boolean> {
  const headersList = await headers()
  const origin = headersList.get('origin')
  const host = headersList.get('host')

  if (!origin) {
    return false
  }

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    host ? `https://${host}` : undefined,
    host ? `http://${host}` : undefined,
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined
  ].filter(Boolean) as string[]

  return allowedOrigins.some(allowed => origin === allowed)
}

/**
 * Cria uma resposta de erro CSRF
 */
export function createCSRFError() {
  return Response.json(
    { error: 'Invalid request origin' },
    { status: 403 }
  )
}
