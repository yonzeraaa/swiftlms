'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'

export default function TestAuthPage() {
  const { session, user, isLoading, refreshSession, signOut } = useAuth()
  const [testResults, setTestResults] = useState<any>(null)
  const [isTestingApi, setIsTestingApi] = useState(false)
  const [enrollTestResult, setEnrollTestResult] = useState<any>(null)
  const supabase = createClient()

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    setIsTestingApi(true)
    try {
      const response = await fetch('/api/auth/check')
      const data = await response.json()
      setTestResults(data)
    } catch (error: any) {
      setTestResults({ error: error.message })
    }
    setIsTestingApi(false)
  }

  const testLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'admin@swiftedu.com',
        password: 'admin@123'
      })
      
      if (error) throw error
      
      alert('Login successful! Refreshing...')
      window.location.reload()
    } catch (error: any) {
      alert(`Login error: ${error.message}`)
    }
  }

  const testRefresh = async () => {
    try {
      await refreshSession()
      alert('Session refreshed!')
      checkAuthStatus()
    } catch (error: any) {
      alert(`Refresh error: ${error.message}`)
    }
  }

  const testEnrollApi = async () => {
    try {
      const response = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          courseId: 'test-course-id',
          studentIds: ['test-student-id']
        })
      })
      
      const data = await response.json()
      setEnrollTestResult({
        status: response.status,
        ok: response.ok,
        data
      })
    } catch (error: any) {
      setEnrollTestResult({ error: error.message })
    }
  }

  const checkCookies = () => {
    const cookies = document.cookie.split(';').map(c => c.trim())
    const authCookies = cookies.filter(c => 
      c.includes('sb-') || c.includes('auth') || c.includes('supabase')
    )
    
    alert(`Found ${authCookies.length} auth cookies:\n${authCookies.join('\n')}`)
  }

  const checkLocalStorage = () => {
    const keys = Object.keys(localStorage)
    const authKeys = keys.filter(k => k.includes('sb-') || k.includes('supabase'))
    
    const data = authKeys.map(k => ({
      key: k,
      value: localStorage.getItem(k)?.substring(0, 50) + '...'
    }))
    
    alert(`Found ${authKeys.length} auth items in localStorage:\n${JSON.stringify(data, null, 2)}`)
  }

  const forceLogin = async () => {
    try {
      const response = await fetch('/api/auth/force-login', {
        method: 'POST',
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert('Login forçado com sucesso! Recarregando...')
        window.location.reload()
      } else {
        alert(`Erro: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Erro ao forçar login: ${error.message}`)
    }
  }

  const fixSession = async () => {
    try {
      // Primeiro tentar sem credenciais
      let response = await fetch('/api/auth/fix-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      })
      
      let data = await response.json()
      
      // Se falhar, tentar com credenciais
      if (!response.ok) {
        const email = prompt('Digite o email para reautenticar:')
        const password = prompt('Digite a senha:')
        
        if (email && password) {
          response = await fetch('/api/auth/fix-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
          })
          
          data = await response.json()
        }
      }
      
      if (response.ok) {
        alert('Sessão corrigida! Recarregando...')
        window.location.reload()
      } else {
        alert(`Erro: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Erro ao corrigir sessão: ${error.message}`)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔐 Auth Test Page</h1>
      <p>URL: {typeof window !== 'undefined' ? window.location.href : 'loading...'}</p>
      
      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Current Status</h2>
        <p>Loading: {isLoading ? '⏳ Yes' : '✅ No'}</p>
        <p>Session: {session ? '✅ Active' : '❌ None'}</p>
        <p>User: {user ? `✅ ${user.email}` : '❌ None'}</p>
        {session && (
          <>
            <p>User ID: {session.user.id}</p>
            <p>Expires: {new Date(session.expires_at! * 1000).toLocaleString()}</p>
          </>
        )}
      </div>

      <div style={{ margin: '20px 0' }}>
        <h2>Actions</h2>
        <button onClick={testLogin} style={{ margin: '5px', padding: '10px' }}>
          📥 Test Login (admin@swiftedu.com)
        </button>
        <button onClick={testRefresh} style={{ margin: '5px', padding: '10px' }}>
          🔄 Refresh Session
        </button>
        <button onClick={signOut} style={{ margin: '5px', padding: '10px' }}>
          📤 Sign Out
        </button>
        <button onClick={checkAuthStatus} style={{ margin: '5px', padding: '10px' }}>
          🔍 Check Auth API
        </button>
        <button onClick={checkCookies} style={{ margin: '5px', padding: '10px' }}>
          🍪 Check Cookies
        </button>
        <button onClick={checkLocalStorage} style={{ margin: '5px', padding: '10px' }}>
          💾 Check LocalStorage
        </button>
        <button onClick={testEnrollApi} style={{ margin: '5px', padding: '10px' }}>
          🎓 Test Enroll API
        </button>
        <button onClick={forceLogin} style={{ margin: '5px', padding: '10px', background: '#00a652', color: 'white' }}>
          ⚡ FORCE LOGIN ADMIN
        </button>
        <button onClick={fixSession} style={{ margin: '5px', padding: '10px', background: '#ff6b6b', color: 'white' }}>
          🔧 FIX SESSION (Emergência)
        </button>
      </div>

      {testResults && (
        <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
          <h2>Auth API Results</h2>
          <pre style={{ overflow: 'auto', maxHeight: '400px' }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      {enrollTestResult && (
        <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
          <h2>Enroll API Test Result</h2>
          <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(enrollTestResult, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #0066ff' }}>
        <h2>📋 Checklist para Supabase</h2>
        <p>Certifique-se de ter configurado no Supabase Dashboard:</p>
        <ul>
          <li>✅ Site URL: https://swiftedu-rose.vercel.app</li>
          <li>✅ Redirect URLs inclui: https://swiftedu-rose.vercel.app/*</li>
          <li>✅ Redirect URLs inclui: https://swiftedu-rose.vercel.app/auth/callback</li>
        </ul>
      </div>
    </div>
  )
}