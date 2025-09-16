export interface ParsedAnswerKeyEntry {
  questionNumber: number
  correctAnswer: string
  points?: number
  justification?: string
}

export function parseAnswerKeyFromText(content: string): ParsedAnswerKeyEntry[] {
  const answerKey: ParsedAnswerKeyEntry[] = []

  const gabaritoRegex = /(?:GABARITO|Gabarito)[\s:]*\n+([\s\S]+?)(?:\n\n|$)/i
  const gabaritoMatch = content.match(gabaritoRegex)

  if (gabaritoMatch) {
    const gabaritoSection = gabaritoMatch[1]
    const lines = gabaritoSection.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (trimmedLine.match(/^[A-Z][A-Z\s]+:?$/)) {
        break
      }

      const match = trimmedLine.match(/^(\d+)[\.\)]\s*([a-eA-E])(?:\))?(?:\s+Justificativa:\s*(.+))?$/)
      if (match) {
        const questionNumber = parseInt(match[1], 10)
        const correctAnswer = match[2].toUpperCase()
        const justification = match[3]?.trim()

        if (questionNumber > 0 && questionNumber <= 100) {
          const existing = answerKey.find(entry => entry.questionNumber === questionNumber)
          if (!existing) {
            answerKey.push({
              questionNumber,
              correctAnswer,
              points: 10,
              justification,
            })
          }
        }
      }
    }

    if (answerKey.length > 0) {
      const justifications = extractJustifications(content)
      answerKey.forEach(entry => {
        if (!entry.justification) {
          const justification = justifications.find(j => j.questionNumber === entry.questionNumber)
          if (justification) {
            entry.justification = justification.text
          }
        }
      })

      answerKey.sort((a, b) => a.questionNumber - b.questionNumber)
      return answerKey
    }
  }

  return []
}

export function extractQuestionsWithAnswers(content: string): ParsedAnswerKeyEntry[] {
  const answers: ParsedAnswerKeyEntry[] = []

  const gabaritoSectionMatch = content.match(/Gabarito\s*\n+([\s\S]+?)(?:\n\n|\n(?=[A-Z])|$)/i)

  if (gabaritoSectionMatch) {
    const gabaritoSection = gabaritoSectionMatch[1]
    const lines = gabaritoSection.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()

      const strictMatch = trimmedLine.match(/^(\d+)[\.\)]\s*([a-eA-E])(?:\))?(?:\s+Justificativa:\s*(.+))?$/)
      if (strictMatch) {
        const questionNumber = parseInt(strictMatch[1], 10)
        const correctAnswer = strictMatch[2].toUpperCase()
        const justification = strictMatch[3]?.trim()

        const existingAnswer = answers.find(a => a.questionNumber === questionNumber)
        if (!existingAnswer && questionNumber > 0 && questionNumber <= 100) {
          answers.push({
            questionNumber,
            correctAnswer,
            points: 10,
            justification,
          })
        }
      }
    }

    if (answers.length > 0) {
      const justifications = extractJustifications(content)
      answers.forEach(answer => {
        if (!answer.justification) {
          const justification = justifications.find(j => j.questionNumber === answer.questionNumber)
          if (justification) {
            answer.justification = justification.text
          }
        }
      })

      answers.sort((a, b) => a.questionNumber - b.questionNumber)
      return answers
    }
  }

  return []
}

export function generateSampleAnswerKey(): ParsedAnswerKeyEntry[] {
  return Array.from({ length: 10 }).map((_, index) => ({
    questionNumber: index + 1,
    correctAnswer: ['A', 'B', 'C', 'D', 'E'][index % 5],
    points: 10,
  }))
}

function extractJustifications(content: string): Array<{ questionNumber: number; text: string }> {
  const justificationRegex = /Justificativa\s*(\d+)?[\.:]\s*([\s\S]+?)(?=\n\n|\n\d+[\.\)]|\n[A-Z][A-Z]+|$)/g
  const matches = content.matchAll(justificationRegex)
  const justifications: Array<{ questionNumber: number; text: string }> = []

  for (const match of matches) {
    const questionNumber = match[1] ? parseInt(match[1], 10) : justifications.length + 1
    const text = match[2]?.trim()

    if (!Number.isNaN(questionNumber) && text) {
      justifications.push({ questionNumber, text })
    }
  }

  return justifications
}
