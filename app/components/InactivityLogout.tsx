'use client'

import { useInactivityTimeout } from '../hooks/useInactivityTimeout'
import { useAuth } from '../providers/AuthProvider'

/**
 * Componente que monitora inatividade e faz logout automático após 15 minutos
 * Deve ser incluído no layout raiz da aplicação
 */
export default function InactivityLogout() {
  const { user, session, isLoading } = useAuth()
  const sessionKey = user?.id && session?.expires_at
    ? `${user.id}:${session.expires_at}`
    : null

  useInactivityTimeout(!isLoading && Boolean(user), sessionKey)
  return null
}
