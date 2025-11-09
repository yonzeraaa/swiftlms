/**
 * Client-side session manager com gestão segura de tokens
 */

export class SessionManager {
  private static instance: SessionManager
  private refreshTimer: NodeJS.Timeout | null = null
  private inactivityTimer: NodeJS.Timeout | null = null
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos
  private readonly REFRESH_INTERVAL = 50 * 60 * 1000 // 50 minutos (antes do token expirar)

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupActivityListeners()
    }
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Inicia gestão de sessão após login bem-sucedido
   */
  startSession(): void {
    this.scheduleTokenRefresh()
    this.resetInactivityTimer()
  }

  /**
   * Encerra gestão de sessão
   */
  endSession(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }
  }

  /**
   * Agenda renovação automática de token
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshSession()
      } catch (error) {
        console.error('Token refresh failed:', error)
        // Se refresh falhar, forçar logout
        window.location.href = '/?session=expired'
      }
    }, this.REFRESH_INTERVAL)
  }

  /**
   * Renova sessão chamando Supabase
   */
  private async refreshSession(): Promise<void> {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data, error } = await supabase.auth.refreshSession()

    if (error || !data.session) {
      throw new Error('Session refresh failed')
    }

    // Agendar próxima renovação
    this.scheduleTokenRefresh()
  }

  /**
   * Configura listeners de atividade do usuário
   */
  private setupActivityListeners(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    events.forEach(event => {
      window.addEventListener(event, () => this.handleUserActivity(), { passive: true })
    })
  }

  /**
   * Manipula atividade do usuário
   */
  private handleUserActivity(): void {
    this.resetInactivityTimer()
  }

  /**
   * Reseta timer de inatividade
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
    }

    this.inactivityTimer = setTimeout(() => {
      this.handleInactivityTimeout()
    }, this.INACTIVITY_TIMEOUT)
  }

  /**
   * Manipula timeout de inatividade
   */
  private async handleInactivityTimeout(): Promise<void> {
    // Avisar usuário antes de deslogar
    const shouldLogout = confirm(
      'Sua sessão está inativa há 30 minutos. Deseja continuar conectado?'
    )

    if (!shouldLogout) {
      // Usuário quer continuar - resetar timer
      this.resetInactivityTimer()
      return
    }

    // Fazer logout
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        window.location.href = '/?session=inactive'
      }
    } catch (error) {
      console.error('Logout failed:', error)
      window.location.href = '/'
    }
  }
}
