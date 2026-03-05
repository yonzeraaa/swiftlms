'use client'

import { useInactivityTimeout } from '../hooks/useInactivityTimeout'
import { useAuth } from '../providers/AuthProvider'

/**
 * Componente que monitora inatividade e faz logout automático após 15 minutos
 * Deve ser incluído no layout raiz da aplicação
 */
export default function InactivityLogout() {
  const { user, isLoading } = useAuth()

  useInactivityTimeout(!isLoading && Boolean(user))
  return null
}
