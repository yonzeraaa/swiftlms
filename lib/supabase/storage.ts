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
        return localStorageValue
      }
      
      // Fallback to cookies
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === key && value) {
          return decodeURIComponent(value)
        }
      }
      
      return null
    } catch (error) {
      console.error(`Error getting item ${key}:`, error)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return
    
    // Track which keys we're managing
    this.storageKeys.add(key)
    
    try {
      // Save to localStorage
      localStorage.setItem(key, value)
      
      // Also save as httpOnly cookie for SSR
      const expires = new Date()
      expires.setDate(expires.getDate() + 7) // 7 days
      
      const isSecure = window.location.protocol === 'https:'
      document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`
      
      console.log(`Saved auth key: ${key}`)
    } catch (error) {
      console.error(`Error setting item ${key}:`, error)
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

// Create storage adapter for Supabase
export const customStorageAdapter = {
  getItem: async (key: string) => {
    const storage = new CustomStorage()
    return await storage.getItem(key)
  },
  setItem: async (key: string, value: string) => {
    const storage = new CustomStorage()
    await storage.setItem(key, value)
  },
  removeItem: async (key: string) => {
    const storage = new CustomStorage()
    await storage.removeItem(key)
  }
}