import '@testing-library/jest-dom/vitest'

// Polyfills for Next.js APIs used in components/hooks during tests
globalThis.fetch = globalThis.fetch ?? ((...args: Parameters<typeof fetch>) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)))

class BroadcastChannelStub {
  name: string
  onmessage: ((this: BroadcastChannel, ev: MessageEvent) => any) | null = null
  constructor(name: string) {
    this.name = name
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false
  }
}

if (!('BroadcastChannel' in globalThis)) {
  // @ts-expect-error - assigning to global scope for tests
  globalThis.BroadcastChannel = BroadcastChannelStub
}
