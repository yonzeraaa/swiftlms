import { NextRequest, NextResponse } from 'next/server'
import {
  extractQuestionsWithAnswers,
  generateSampleAnswerKey,
  parseAnswerKeyFromText,
} from '../utils/answer-key'
import { extractGoogleDocumentId } from '../utils/drive'

export async function POST(request: NextRequest) {
  try {
    const { googleDriveUrl } = await request.json()
    
    if (!googleDriveUrl) {
      return NextResponse.json(
        { error: 'URL do Google Drive é obrigatória' },
        { status: 400 }
      )
    }

    const docId = extractGoogleDocumentId(googleDriveUrl)
    if (!docId) {
      return NextResponse.json(
        { error: 'URL do Google Drive inválida' },
        { status: 400 }
      )
    }
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`

    try {
      const response = await fetch(exportUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar documento')
      }

      const content = await response.text()
      
      if (!content) {
        return NextResponse.json(
          { error: 'Não foi possível obter o conteúdo do documento' },
          { status: 400 }
        )
      }

      const answerKey = parseAnswerKeyFromText(content)
      
      if (!answerKey || answerKey.length === 0) {
        const questionsFound = extractQuestionsWithAnswers(content)
        if (questionsFound.length > 0) {
          return NextResponse.json({
            success: true,
            answerKey: questionsFound,
            questionCount: questionsFound.length
          })
        }
        
        return NextResponse.json(
          { error: 'Gabarito não encontrado no documento. Certifique-se de que as questões têm respostas marcadas.' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        answerKey,
        questionCount: answerKey.length
      })

    } catch (fetchError) {
      console.error('Erro ao buscar documento:', fetchError)
      return NextResponse.json({
        success: true,
        answerKey: generateSampleAnswerKey(),
        questionCount: 10,
        message: 'Usando gabarito de exemplo. Certifique-se de que o documento está público.'
      })
    }

  } catch (error) {
    console.error('Erro ao extrair gabarito:', error)
    return NextResponse.json(
      { error: 'Erro ao processar documento' },
      { status: 500 }
    )
  }
}
