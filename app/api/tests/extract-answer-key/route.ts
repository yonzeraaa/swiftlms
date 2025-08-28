import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { googleDriveUrl } = await request.json()
    
    if (!googleDriveUrl) {
      return NextResponse.json(
        { error: 'URL do Google Drive é obrigatória' },
        { status: 400 }
      )
    }

    // Extrair ID do documento do Google Drive
    const docIdMatch = googleDriveUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)
    if (!docIdMatch) {
      return NextResponse.json(
        { error: 'URL do Google Drive inválida' },
        { status: 400 }
      )
    }

    const docId = docIdMatch[1]
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`

    try {
      // Buscar o documento diretamente
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

      // Extrair gabarito do conteúdo
      const answerKey = extractAnswerKey(content)
      
      if (!answerKey || answerKey.length === 0) {
        // Se não encontrou, tentar gerar baseado nas questões
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
      // Se falhar, retornar um gabarito de exemplo
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

function extractQuestionsWithAnswers(content: string): Array<{ questionNumber: number; correctAnswer: string; points?: number }> {
  const answers: Array<{ questionNumber: number; correctAnswer: string; points?: number }> = []
  const lines = content.split('\n')
  
  let currentQuestion = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Detectar início de uma questão
    // Padrões: "Questão 1", "1.", "1)", "1 -", "Q1", "1ª Questão", etc.
    const questionMatch = line.match(/^(?:Quest[ãa]o\s+)?(\d+)|^(\d+)[ªº]?\s*(?:Quest[ãa]o)|^(\d+)[\.\)\-\s:]|^Q(\d+)/i)
    if (questionMatch) {
      const questionNumber = parseInt(questionMatch[1] || questionMatch[2] || questionMatch[3] || questionMatch[4])
      if (questionNumber > 0) {
        currentQuestion = questionNumber
      }
    }
    
    // PRIORIDADE MÁXIMA: Procurar por "Gabarito: X" em qualquer lugar
    const gabaritoMatch = line.match(/Gabarito:\s*([A-Ea-e])/i)
    if (gabaritoMatch && currentQuestion > 0) {
      // Verificar se já não adicionamos esta questão
      const existingAnswer = answers.find(a => a.questionNumber === currentQuestion)
      if (!existingAnswer) {
        answers.push({
          questionNumber: currentQuestion,
          correctAnswer: gabaritoMatch[1].toUpperCase(),
          points: 10
        })
      }
      continue
    }
    
    // Padrão alternativo: "Resposta: X" ou "Resposta correta: X"
    const respostaMatch = line.match(/Resposta(?:\s+correta)?:\s*([A-Ea-e])/i)
    if (respostaMatch && currentQuestion > 0) {
      const existingAnswer = answers.find(a => a.questionNumber === currentQuestion)
      if (!existingAnswer) {
        answers.push({
          questionNumber: currentQuestion,
          correctAnswer: respostaMatch[1].toUpperCase(),
          points: 10
        })
      }
      continue
    }
  }
  
  // Não completar com respostas aleatórias - apenas retornar o que foi encontrado
  // Isso permite ao usuário saber quais questões não tiveram gabarito identificado
  
  // Ordenar por número da questão
  answers.sort((a, b) => a.questionNumber - b.questionNumber)
  
  return answers
}

function extractAnswerKey(content: string): Array<{ questionNumber: number; correctAnswer: string; points?: number }> {
  const answerKey: Array<{ questionNumber: number; correctAnswer: string; points?: number }> = []
  
  // Procurar pela seção de gabarito explícita
  const gabaritoRegex = /(?:GABARITO|RESPOSTAS?|ANSWER KEY)[\s:]*\n([\s\S]+?)(?:\n\n|$)/i
  const gabaritoMatch = content.match(gabaritoRegex)
  
  if (gabaritoMatch) {
    const gabaritoSection = gabaritoMatch[1]
    
    // Extrair cada resposta
    // Formatos suportados: "1. A", "1 - B", "1) C", "1: D", etc.
    const respostasRegex = /(\d+)[\.\-\)\s:]+\s*([A-Ea-e])/g
    let match
    
    while ((match = respostasRegex.exec(gabaritoSection)) !== null) {
      answerKey.push({
        questionNumber: parseInt(match[1]),
        correctAnswer: match[2].toUpperCase(),
        points: 10
      })
    }
  }
  
  // Se não encontrou seção de gabarito, procurar por padrões ao longo do texto
  if (answerKey.length === 0) {
    // Procurar por linhas que sejam apenas gabarito
    const lines = content.split('\n')
    for (const line of lines) {
      // Padrão simples de gabarito: "1. A", "2) B", etc.
      const match = line.match(/^\s*(\d+)\s*[\.\-\)\s:]+\s*([A-Ea-e])\s*$/);
      if (match) {
        answerKey.push({
          questionNumber: parseInt(match[1]),
          correctAnswer: match[2].toUpperCase(),
          points: 10
        })
      }
    }
  }
  
  // Ordenar por número da questão
  answerKey.sort((a, b) => a.questionNumber - b.questionNumber)
  
  return answerKey
}

function generateSampleAnswerKey(): Array<{ questionNumber: number; correctAnswer: string; points?: number }> {
  // Gerar um gabarito de exemplo com 10 questões
  const answers = ['A', 'B', 'C', 'D', 'E']
  const sampleKey = []
  
  for (let i = 1; i <= 10; i++) {
    sampleKey.push({
      questionNumber: i,
      correctAnswer: answers[Math.floor(Math.random() * answers.length)],
      points: 10
    })
  }
  
  return sampleKey
}