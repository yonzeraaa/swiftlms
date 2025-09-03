'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { debugStorage } from '@/lib/supabase/debug-storage'

export default function DebugAuthPage() {
  const [email, setEmail] = useState('admin@swiftedu.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const supabase = createClient()

  const testLogin = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('[DEBUG TEST] Starting login test...')
      console.log('[DEBUG TEST] Storage before login:')
      debugStorage()
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('[DEBUG TEST] Login error:', error)
        setResult(`Error: ${error.message}`)
      } else {
        console.log('[DEBUG TEST] Login success:', data)
        setResult(`Success! User: ${data.user?.email}`)
        
        // Check storage after login
        setTimeout(() => {
          console.log('[DEBUG TEST] Storage after login (with delay):')
          debugStorage()
        }, 1000)
      }
      
    } catch (error) {
      console.error('[DEBUG TEST] Unexpected error:', error)
      setResult(`Unexpected error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogout = async () => {
    setLoading(true)
    
    try {
      console.log('[DEBUG TEST] Storage before logout:')
      debugStorage()
      
      await supabase.auth.signOut()
      
      setTimeout(() => {
        console.log('[DEBUG TEST] Storage after logout:')
        debugStorage()
      }, 1000)
      
      setResult('Logged out')
    } catch (error) {
      console.error('[DEBUG TEST] Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkStorage = () => {
    console.log('[DEBUG TEST] Manual storage check:')
    debugStorage()
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Page</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={loading}
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={testLogin}
            disabled={loading || !password}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Test Login'}
          </button>
          
          <button
            onClick={testLogout}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
          >
            Logout
          </button>
          
          <button
            onClick={checkStorage}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Check Storage
          </button>
        </div>
        
        {result && (
          <div className="p-4 bg-gray-100 rounded text-sm">
            {result}
          </div>
        )}
        
        <div className="text-sm text-gray-600">
          <p>Check the browser console for detailed logs starting with [DEBUG]</p>
        </div>
      </div>
    </div>
  )
}