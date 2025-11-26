import { NextRequest, NextResponse } from 'next/server'
import { apiRateLimiter, getClientIdentifier } from '@/app/lib/rate-limiter'

// Regex para validar URL do Google Docs
const GOOGLE_DOCS_URL_PATTERN = /^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9-_]+/

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request)
  if (!apiRateLimiter.isAllowed(clientId)) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente mais tarde.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': String(apiRateLimiter.getRemainingRequests(clientId)),
          'X-RateLimit-Reset': String(apiRateLimiter.getResetTime(clientId))
        }
      }
    )
  }
  
  try {
    const body = await request.json()
    const { url } = body
    
    // Validação de entrada
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL é obrigatória e deve ser uma string' },
        { status: 400 }
      )
    }

    // Validação rigorosa da URL do Google Docs
    if (!GOOGLE_DOCS_URL_PATTERN.test(url)) {
      return NextResponse.json(
        { error: 'URL inválida. Use uma URL válida do Google Docs (https://docs.google.com/document/d/...)' },
        { status: 400 }
      )
    }
    
    // Prevenir SSRF - bloquear URLs internas e localhost
    const parsedUrl = new URL(url)
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
    if (blockedHosts.includes(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'URL não permitida' },
        { status: 403 }
      )
    }

    // Fazer o fetch do documento
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      // Se não conseguir exportar diretamente, tentar método alternativo
      // Converter URL para formato de visualização pública
      const docIdMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)
      if (docIdMatch) {
        const docId = docIdMatch[1]
        const publicUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`
        
        const publicResponse = await fetch(publicUrl)
        if (publicResponse.ok) {
          const text = await publicResponse.text()
          return new NextResponse(text, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8'
            }
          })
        }
      }
      
      return NextResponse.json(
        { error: 'Não foi possível acessar o documento. Verifique se ele está compartilhado publicamente.' },
        { status: 403 }
      )
    }

    const text = await response.text()
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    })

  } catch (error: any) {
    console.error('Erro ao buscar documento:', error)
    return NextResponse.json(
      { error: 'Erro ao processar documento: ' + error.message },
      { status: 500 }
    )
  }
}