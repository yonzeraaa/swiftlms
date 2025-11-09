'use client'

import { useInactivityTimeout } from '../hooks/useInactivityTimeout'

/**
 * Componente que monitora inatividade e faz logout automático após 15 minutos
 * Deve ser incluído no layout raiz da aplicação
 */
export default function InactivityLogout() {
  useInactivityTimeout()
  return null
}
