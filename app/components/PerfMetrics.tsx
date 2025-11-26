'use client'

import { useEffect } from 'react'

export default function PerfMetrics() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).name === 'largest-contentful-paint') {
            // eslint-disable-next-line no-console
            console.log('[Perf] LCP:', Math.round((entry as any).startTime))
          }
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            // eslint-disable-next-line no-console
            console.log('[Perf] CLS increment:', (entry as any).value)
          }
        }
      })
      try { po.observe({ type: 'largest-contentful-paint', buffered: true } as any) } catch {}
      try { po.observe({ type: 'layout-shift', buffered: true } as any) } catch {}
      return () => { po.disconnect() }
    } catch {}
  }, [])
  return null
}

