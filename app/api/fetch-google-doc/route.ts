import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se é uma URL do Google Docs
    if (!url.includes('docs.google.com')) {
      return NextResponse.json(
        { error: 'URL inválida. Use uma URL do Google Docs' },
        { status: 400 }
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