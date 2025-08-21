import { NextRequest, NextResponse } from 'next/server'

// Store para armazenar o progresso das importações
// Usando uma variável global para manter estado entre requisições
// Em produção, seria melhor usar Redis ou um banco de dados
let importProgressStore: Map<string, any>

if (typeof global !== 'undefined') {
  // @ts-ignore
  if (!global.importProgressStore) {
    // @ts-ignore
    global.importProgressStore = new Map()
  }
  // @ts-ignore
  importProgressStore = global.importProgressStore
} else {
  importProgressStore = new Map()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const importId = searchParams.get('importId')
  
  console.log(`[PROGRESS-STATUS] GET request for importId: ${importId}`)
  
  if (!importId) {
    return NextResponse.json({ error: 'Import ID required' }, { status: 400 })
  }
  
  const progress = importProgressStore.get(importId)
  console.log(`[PROGRESS-STATUS] Progress found:`, progress ? 'Yes' : 'No')
  
  if (!progress) {
    console.log(`[PROGRESS-STATUS] Available importIds:`, Array.from(importProgressStore.keys()))
    return NextResponse.json({ error: 'Import not found' }, { status: 404 })
  }
  
  console.log(`[PROGRESS-STATUS] Returning progress:`, progress)
  return NextResponse.json(progress)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { importId, progress } = body
  
  if (!importId) {
    return NextResponse.json({ error: 'Import ID required' }, { status: 400 })
  }
  
  importProgressStore.set(importId, progress)
  
  // Limpar progresso antigo após 30 minutos
  setTimeout(() => {
    importProgressStore.delete(importId)
  }, 30 * 60 * 1000)
  
  return NextResponse.json({ success: true })
}

