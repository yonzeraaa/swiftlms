'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'

export default function DebugMiddlewarePage() {
  const { session, user } = useAuth()
  const [verifyData, setVerifyData] = useState<any>(null)
  const [cookies, setCookies] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    checkVerify()
    checkCookies()
  }, [])

  const checkVerify = async () => {
    try {
      const response = await fetch('/api/auth/verify')
      const data = await response.json()
      setVerifyData(data)
    } catch (error: any) {
      setVerifyData({ error: error.message })
    }
  }

  const checkCookies = () => {
    const allCookies = document.cookie.split(';').map(c => c.trim())
    setCookies(allCookies.filter(c => c.includes('sb-')))
  }

  const forceRefresh = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      alert('Refresh realizado! Recarregando...')
      window.location.reload()
    } catch (error: any) {
      alert(`Erro no refresh: ${error.message}`)
    }
  }

  const syncSession = async () => {
    try {
      // Primeiro tentar pegar a sessão atual do Supabase client
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      
      if (currentSession?.access_token && currentSession?.refresh_token) {
        // Usar a sessão atual do cliente
        const response = await fetch('/api/auth/sync-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token
          })
        })
        
        const result = await response.json()
        
        if (response.ok) {
          alert('Sessão sincronizada! Recarregando...')
          window.location.reload()
        } else {
          alert(`Erro: ${result.error}`)
        }
        return
      }
      
      // Se não houver sessão no cliente, tentar localStorage como fallback
      const storageKey = `sb-mdzgnktlsmkjecdbermo-auth-token`
      const storedAuth = localStorage.getItem(storageKey)
      
      if (!storedAuth) {
        // Tentar fazer refresh primeiro
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshData?.session) {
          const response = await fetch('/api/auth/sync-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              access_token: refreshData.session.access_token,
              refresh_token: refreshData.session.refresh_token
            })
          })
          
          const result = await response.json()
          
          if (response.ok) {
            alert('Sessão recuperada e sincronizada! Recarregando...')
            window.location.reload()
          } else {
            alert(`Erro: ${result.error}`)
          }
        } else {
          alert('Nenhuma sessão disponível para sincronizar. Por favor, faça login novamente.')
        }
        return
      }
      
      const authData = JSON.parse(storedAuth)
      
      if (!authData.access_token || !authData.refresh_token) {
        alert('Tokens inválidos no localStorage')
        return
      }
      
      // Sincronizar com o servidor
      const response = await fetch('/api/auth/sync-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          access_token: authData.access_token,
          refresh_token: authData.refresh_token
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert('Sessão sincronizada do localStorage! Recarregando...')
        window.location.reload()
      } else {
        alert(`Erro: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Erro ao sincronizar: ${error.message}`)
    }
  }

  const clearAndLogin = async () => {
    try {
      // Limpar todos os cookies
      document.cookie.split(';').forEach(c => {
        const name = c.split('=')[0].trim()
        if (name.includes('sb-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      })
      
      // Limpar localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
      
      alert('Cookies e storage limpos! Redirecionando para login...')
      window.location.href = '/'
    } catch (error: any) {
      alert(`Erro: ${error.message}`)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🐛 Debug Middleware</h1>
      
      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Estado do Cliente</h2>
        <p>AuthProvider Session: {session ? '✅' : '❌'}</p>
        <p>AuthProvider User: {user ? `✅ ${user.email}` : '❌'}</p>
      </div>

      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Cookies do Browser</h2>
        <p>Total de cookies Supabase: {cookies.length}</p>
        {cookies.map((c, i) => (
          <div key={i} style={{ fontSize: '12px', marginTop: '5px' }}>
            {c.substring(0, 50)}...
          </div>
        ))}
      </div>

      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Verificação do Servidor (/api/auth/verify)</h2>
        <pre style={{ overflow: 'auto', maxHeight: '300px', fontSize: '12px' }}>
          {JSON.stringify(verifyData, null, 2)}
        </pre>
      </div>

      <div style={{ margin: '20px 0' }}>
        <button onClick={checkVerify} style={{ margin: '5px', padding: '10px' }}>
          🔄 Recarregar Verificação
        </button>
        <button onClick={forceRefresh} style={{ margin: '5px', padding: '10px' }}>
          🔄 Forçar Refresh
        </button>
        <button onClick={syncSession} style={{ margin: '5px', padding: '10px', background: '#4CAF50', color: 'white' }}>
          🔄 Sincronizar Sessão Cliente→Servidor
        </button>
        <button onClick={clearAndLogin} style={{ margin: '5px', padding: '10px', background: '#ff6b6b', color: 'white' }}>
          🗑️ Limpar Tudo e Relogar
        </button>
      </div>

      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #0066ff' }}>
        <h2>Diagnóstico</h2>
        {verifyData && (
          <>
            {verifyData.hasUser && !verifyData.hasSession && (
              <p style={{ color: 'orange' }}>
                ⚠️ Tem usuário mas não tem sessão - Middleware pode redirecionar
              </p>
            )}
            {!verifyData.hasUser && !verifyData.hasSession && (
              <p style={{ color: 'red' }}>
                ❌ Sem usuário e sem sessão - Necessário fazer login
              </p>
            )}
            {verifyData.hasUser && verifyData.hasSession && (
              <p style={{ color: 'green' }}>
                ✅ Usuário e sessão OK - Deveria funcionar normalmente
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}