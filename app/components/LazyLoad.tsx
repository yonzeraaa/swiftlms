'use client'

import dynamic from 'next/dynamic'
import { Suspense, ReactNode } from 'react'
import PremiumLoader from './ui/PremiumLoader'

interface LazyLoadProps {
  children: ReactNode
  fallback?: ReactNode
}

export function LazyWrapper({ children, fallback }: LazyLoadProps) {
  return (
    <Suspense fallback={fallback || <PremiumLoader />}>
      {children}
    </Suspense>
  )
}

// Lazy load componentes pesados com Framer Motion
export const LazyVideoPlayer = dynamic(
  () => import('./VideoPlayer'),
  { 
    loading: () => <PremiumLoader />,
    ssr: false 
  }
)

export const LazyDocumentViewer = dynamic(
  () => import('./DocumentViewer'),
  { 
    loading: () => <PremiumLoader />,
    ssr: false 
  }
)


// Lazy load componentes UI pesados - removido por não ter export default

export const LazyHeatMap = dynamic(
  () => import('./ui/HeatMap'),
  { 
    loading: () => <PremiumLoader />,
    ssr: false 
  }
)

export const LazyCommandPalette = dynamic(
  () => import('./ui/CommandPalette'),
  { 
    loading: () => <PremiumLoader />,
    ssr: false 
  }
)

// LazyOnboarding removido - arquivo não tem export default

// LazyGamification removido - arquivo não tem export default

// Lazy load páginas pesadas do dashboard
export const LazyStructurePage = dynamic(
  () => import('../dashboard/structure/page'),
  { 
    loading: () => <PremiumLoader />,
    ssr: false 
  }
)

// Helper para lazy load de componentes com animação
export function lazyLoadWithAnimation(
  importFn: () => Promise<any>,
  componentName?: string
) {
  return dynamic(importFn, {
    loading: () => <PremiumLoader />,
    ssr: false
  })
}