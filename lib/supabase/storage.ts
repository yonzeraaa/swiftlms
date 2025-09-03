import { SupabaseClientOptions } from '@supabase/supabase-js'

interface StorageItem {
  name: string
  value: string
}

export class CustomStorage {
  private storageKeys: Set<string> = new Set()
  
  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for storage events to sync between tabs
      window.addEventListener('storage', this.handleStorageEvent.bind(this))
    }
  }

  private handleStorageEvent(event: StorageEvent) {
    // Sync auth state between tabs
    if (event.key && event.key.includes('sb-') && this.storageKeys.has(event.key)) {
      console.log('Storage event detected for key:', event.key)
      // Trigger a custom event for the auth system to handle
      window.dispatchEvent(new CustomEvent('supabase-storage-change', {
        detail: { key: event.key, newValue: event.newValue, oldValue: event.oldValue }
      }))
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null
    
    // Track which keys we're managing
    this.storageKeys.add(key)
    
    try {
      // First try localStorage
      const localStorageValue = localStorage.getItem(key)
      if (localStorageValue) {
        console.log(`[STORAGE] Found ${key} in localStorage`)
        return localStorageValue
      }
      
      // Fallback to cookies - check for both plain and base64-encoded values
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        
        if (name === key && value) {
          console.log(`[STORAGE] Found ${key} in cookies (plain)`)
          return decodeURIComponent(value)
        }
        
        // Check for base64-encoded cookie (used by @supabase/ssr)
        if (name === key && value?.startsWith('base64-')) {
          try {
            const decoded = atob(value.substring(7)) // Remove 'base64-' prefix
            console.log(`[STORAGE] Found ${key} in cookies (base64)`)
            return decoded
          } catch (decodeError) {
            console.error(`[STORAGE] Failed to decode base64 cookie for ${key}:`, decodeError)
          }
        }
      }
      
      console.log(`[STORAGE] Key ${key} not found in localStorage or cookies`)
      return null
    } catch (error) {
      console.error(`[STORAGE] Error getting item ${key}:`, error)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return
    
    // Track which keys we're managing
    this.storageKeys.add(key)
    
    try {
      console.log(`[STORAGE] Attempting to save ${key} with value length:`, value.length)
      
      // Save to localStorage with retry
      try {
        localStorage.setItem(key, value)
        console.log(`[STORAGE] ✅ localStorage.setItem successful for ${key}`)
        
        // Verify it was saved
        const saved = localStorage.getItem(key)
        if (saved === value) {
          console.log(`[STORAGE] ✅ localStorage verification successful for ${key}`)
        } else {
          console.error(`[STORAGE] ❌ localStorage verification failed for ${key}`)
        }
      } catch (localError) {
        console.error(`[STORAGE] ❌ localStorage.setItem failed for ${key}:`, localError)
      }
      
      // Also save as cookie for SSR and fallback (both plain and base64)
      try {
        const expires = new Date()
        expires.setDate(expires.getDate() + 7) // 7 days
        
        const isSecure = window.location.protocol === 'https:'
        
        // Save plain cookie
        const plainCookieString = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`
        document.cookie = plainCookieString
        
        // Also save as base64 for compatibility with @supabase/ssr
        const base64Value = btoa(value)
        const base64CookieString = `${key}=base64-${base64Value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`
        document.cookie = base64CookieString
        
        console.log(`[STORAGE] ✅ Cookies set for ${key} (plain + base64)`)
      } catch (cookieError) {
        console.error(`[STORAGE] ❌ Cookie setting failed for ${key}:`, cookieError)
      }
      
    } catch (error) {
      console.error(`[STORAGE] ❌ General error setting item ${key}:`, error)
      throw error // Re-throw to let Supabase know it failed
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return
    
    try {
      // Remove from localStorage
      localStorage.removeItem(key)
      
      // Remove cookie by setting expired date
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
      
      this.storageKeys.delete(key)
      console.log(`Removed auth key: ${key}`)
    } catch (error) {
      console.error(`Error removing item ${key}:`, error)
    }
  }
}

// Create singleton storage instance
const storageInstance = new CustomStorage()

// Create storage adapter for Supabase
export const customStorageAdapter = {
  getItem: async (key: string) => {
    console.log(`[STORAGE] Getting key: ${key}`)
    const result = await storageInstance.getItem(key)
    console.log(`[STORAGE] Got value for ${key}:`, result ? 'EXISTS' : 'NULL')
    return result
  },
  setItem: async (key: string, value: string) => {
    console.log(`[STORAGE] Setting key: ${key}`)
    await storageInstance.setItem(key, value)
    console.log(`[STORAGE] Successfully set key: ${key}`)
  },
  removeItem: async (key: string) => {
    console.log(`[STORAGE] Removing key: ${key}`)
    await storageInstance.removeItem(key)
    console.log(`[STORAGE] Successfully removed key: ${key}`)
  }
}