import { describe, it, expect } from 'vitest'
import { extractQuestionsWithAnswers, parseAnswerKeyFromText } from '../answer-key'

describe('answer key parsing', () => {
  it('detects letter and boolean answers with extended gabarito formats', () => {
    const content = `
GABARITO
1) Gabarito : a
2) Resposta: Verdadeiro
3) Questão 3 - Resposta: Falso
4) Gabarito : Verdadeiro \\ Falso
5) Resposta: v
6) Resposta: F

Justificativa 2: Este item é verdadeiro.
`

    const result = parseAnswerKeyFromText(content)

    expect(result).toHaveLength(6)

    const q1 = result.find(entry => entry.questionNumber === 1)
    const q2 = result.find(entry => entry.questionNumber === 2)
    const q3 = result.find(entry => entry.questionNumber === 3)
    const q4 = result.find(entry => entry.questionNumber === 4)
    const q5 = result.find(entry => entry.questionNumber === 5)
    const q6 = result.find(entry => entry.questionNumber === 6)

    expect(q1?.correctAnswer).toBe('A')
    expect(q2?.correctAnswer).toBe('V')
    expect(q3?.correctAnswer).toBe('F')
    expect(q4?.correctAnswer).toBe('V')
    expect(q5?.correctAnswer).toBe('V')
    expect(q6?.correctAnswer).toBe('F')
    expect(q2?.justification).toBe('Este item é verdadeiro.')
  })

  it('parses fallback lines that include gabarito or resposta when section header is absent', () => {
    const content = `
Questão 1 - Gabarito: C
Questão 2 - Resposta: falso
Questão 3 - resposta: Verdadeiro / Falso
`

    const result = parseAnswerKeyFromText(content)
    expect(result.map(entry => ({ question: entry.questionNumber, answer: entry.correctAnswer }))).toEqual([
      { question: 1, answer: 'C' },
      { question: 2, answer: 'F' },
      { question: 3, answer: 'V' }
    ])
  })

  it('extracts questions with answers using the same parsing helpers', () => {
    const content = `
Gabarito
1) Alternativa correta: letra D
2) Resposta: Verdadeiro
`

    const result = extractQuestionsWithAnswers(content)
    expect(result.map(entry => entry.correctAnswer)).toEqual(['D', 'V'])
  })
})
