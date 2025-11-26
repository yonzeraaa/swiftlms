'use client'

import { createContext, useContext } from 'react'
import { headers } from 'next/headers'

interface NonceContextType {
  nonce: string
}

const NonceContext = createContext<NonceContextType | undefined>(undefined)

export function NonceProvider({ 
  children, 
  nonce 
}: { 
  children: React.ReactNode
  nonce: string 
}) {
  return (
    <NonceContext.Provider value={{ nonce }}>
      {children}
    </NonceContext.Provider>
  )
}

export function useNonce() {
  const context = useContext(NonceContext)
  if (!context) {
    throw new Error('useNonce must be used within NonceProvider')
  }
  return context.nonce
}

// Helper component for inline styles with nonce
export function InlineStyle({ 
  styles, 
  nonce 
}: { 
  styles: string
  nonce?: string 
}) {
  const contextNonce = nonce || useNonce()
  
  return (
    <style 
      nonce={contextNonce}
      dangerouslySetInnerHTML={{ __html: styles }}
    />
  )
}

// Helper component for inline scripts with nonce
export function InlineScript({ 
  script, 
  nonce 
}: { 
  script: string
  nonce?: string 
}) {
  const contextNonce = nonce || useNonce()
  
  return (
    <script 
      nonce={contextNonce}
      dangerouslySetInnerHTML={{ __html: script }}
    />
  )
}