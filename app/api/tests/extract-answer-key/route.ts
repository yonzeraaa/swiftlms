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

function extractQuestionsWithAnswers(content: string): Array<{ questionNumber: number; correctAnswer: string; points?: number; justification?: string }> {
  const answers: Array<{ questionNumber: number; correctAnswer: string; points?: number; justification?: string }> = []
  
  // Primeiro, procurar pela seção "Gabarito" explícita
  const gabaritoSectionMatch = content.match(/Gabarito\s*\n+([\s\S]+?)(?:\n\n|\n(?=[A-Z])|$)/i)
  
  if (gabaritoSectionMatch) {
    const gabaritoSection = gabaritoSectionMatch[1]
    const lines = gabaritoSection.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Padrão específico: "1. a) Justificativa:" ou "1. a)" ou "1) a" ou "1. A"
      const strictMatch = trimmedLine.match(/^(\d+)[\.\)]\s*([a-eA-E])(?:\))?(?:\s+Justificativa:\s*(.+))?$/)
      if (strictMatch) {
        const questionNumber = parseInt(strictMatch[1])
        const correctAnswer = strictMatch[2].toUpperCase()
        const justification = strictMatch[3]?.trim()
        
        // Verificar se já não existe
        const existingAnswer = answers.find(a => a.questionNumber === questionNumber)
        if (!existingAnswer && questionNumber > 0 && questionNumber <= 100) {
          answers.push({
            questionNumber,
            correctAnswer,
            points: 10,
            justification
          })
        }
      }
    }
    
    // Se encontrou a seção Gabarito, retornar apenas essas respostas
    if (answers.length > 0) {
      // Extrair justificativas adicionais se houver
      const justifications = extractJustifications(content)
      
      // Associar justificativas às questões
      answers.forEach(answer => {
        if (!answer.justification) {
          const justification = justifications.find(j => j.questionNumber === answer.questionNumber)
          if (justification) {
            answer.justification = justification.text
          }
        }
      })
      
      // Ordenar por número da questão
      answers.sort((a, b) => a.questionNumber - b.questionNumber)
      return answers
    }
  }
  
  // Se não encontrou seção Gabarito, retornar vazio
  return []
}

function extractAnswerKey(content: string): Array<{ questionNumber: number; correctAnswer: string; points?: number; justification?: string }> {
  const answerKey: Array<{ questionNumber: number; correctAnswer: string; points?: number; justification?: string }> = []
  
  // Procurar pela seção de gabarito explícita
  const gabaritoRegex = /(?:GABARITO|Gabarito)[\s:]*\n+([\s\S]+?)(?:\n\n|$)/i
  const gabaritoMatch = content.match(gabaritoRegex)
  
  if (gabaritoMatch) {
    const gabaritoSection = gabaritoMatch[1]
    const lines = gabaritoSection.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Parar se encontrar outra seção
      if (trimmedLine.match(/^[A-Z][A-Z\s]+:?$/)) {
        break
      }
      
      // Padrão específico para gabarito: "1. a) Justificativa:" ou "1. a)" ou "1) a" ou "1. A"
      const match = trimmedLine.match(/^(\d+)[\.\)]\s*([a-eA-E])(?:\))?(?:\s+Justificativa:\s*(.+))?$/)
      if (match) {
        const questionNumber = parseInt(match[1])
        const correctAnswer = match[2].toUpperCase()
        const justification = match[3]?.trim()
        
        // Verificar se o número da questão é razoável
        if (questionNumber > 0 && questionNumber <= 100) {
          const existingAnswer = answerKey.find(a => a.questionNumber === questionNumber)
          if (!existingAnswer) {
            answerKey.push({
              questionNumber,
              correctAnswer,
              points: 10,
              justification
            })
          }
        }
      }
    }
    
    // Extrair justificativas adicionais se houver
    if (answerKey.length > 0) {
      const justifications = extractJustifications(content)
      
      // Associar justificativas às questões
      answerKey.forEach(answer => {
        if (!answer.justification) {
          const justification = justifications.find(j => j.questionNumber === answer.questionNumber)
          if (justification) {
            answer.justification = justification.text
          }
        }
      })
    }
  }
  
  // Ordenar por número da questão
  answerKey.sort((a, b) => a.questionNumber - b.questionNumber)
  
  return answerKey
}

function extractJustifications(content: string): Array<{ questionNumber: number; text: string }> {
  const justifications: Array<{ questionNumber: number; text: string }> = []
  
  // Múltiplos padrões para capturar justificativas
  // Padrão 1: "1. a) Justificativa:" ou "2. b) Justificativa:"
  // Padrão 2: "1. Justificativa:" direto
  // Padrão 3: Após a resposta, em formato "Justificativa: ..."
  
  const lines = content.split('\n')
  let currentQuestion = 0
  let captureJustification = false
  let justificationBuffer: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Detectar número da questão
    const questionMatch = line.match(/^(\d+)[\.)\s]/)
    if (questionMatch) {
      // Se estava capturando justificativa anterior, salvar
      if (captureJustification && justificationBuffer.length > 0 && currentQuestion > 0) {
        const existingJustification = justifications.find(j => j.questionNumber === currentQuestion)
        if (!existingJustification) {
          justifications.push({
            questionNumber: currentQuestion,
            text: justificationBuffer.join(' ').trim()
          })
        }
      }
      
      currentQuestion = parseInt(questionMatch[1])
      captureJustification = false
      justificationBuffer = []
    }
    
    // Padrão principal do documento: "X. Y) Justificativa: texto"
    const fullPatternMatch = line.match(/^(\d+)\.\s+([a-eA-E])\)\s+Justificativa:\s*(.+)/i)
    if (fullPatternMatch) {
      const questionNum = parseInt(fullPatternMatch[1])
      const justificationText = fullPatternMatch[3].trim()
      
      if (questionNum > 0 && justificationText) {
        const existingJustification = justifications.find(j => j.questionNumber === questionNum)
        if (!existingJustification) {
          justifications.push({
            questionNumber: questionNum,
            text: justificationText
          })
        }
      }
      continue
    }
    
    // Detectar início de justificativa após resposta
    if (line.match(/^\s*[a-eA-E]\)\s+Justificativa:/i) || line.match(/^Justificativa:/i)) {
      captureJustification = true
      const justMatch = line.match(/Justificativa:\s*(.+)/i)
      if (justMatch && justMatch[1]) {
        justificationBuffer.push(justMatch[1])
      }
      continue
    }
    
    // Continuar capturando texto da justificativa
    if (captureJustification && line.length > 0) {
      // Parar se encontrar próxima questão ou alternativa
      if (line.match(/^(\d+)[\.)\s]/) || line.match(/^[a-eA-E]\)/)) {
        captureJustification = false
        if (justificationBuffer.length > 0 && currentQuestion > 0) {
          const existingJustification = justifications.find(j => j.questionNumber === currentQuestion)
          if (!existingJustification) {
            justifications.push({
              questionNumber: currentQuestion,
              text: justificationBuffer.join(' ').trim()
            })
          }
        }
        justificationBuffer = []
      } else {
        justificationBuffer.push(line)
      }
    }
  }
  
  // Salvar última justificativa se houver
  if (captureJustification && justificationBuffer.length > 0 && currentQuestion > 0) {
    const existingJustification = justifications.find(j => j.questionNumber === currentQuestion)
    if (!existingJustification) {
      justifications.push({
        questionNumber: currentQuestion,
        text: justificationBuffer.join(' ').trim()
      })
    }
  }
  
  return justifications
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