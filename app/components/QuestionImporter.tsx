'use client'

import { useState } from 'react'
import { 
  FileText, 
  Upload, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Link,
  Eye,
  Save,
  FileQuestion,
  Image,
  Calculator,
  ChevronLeft
} from 'lucide-react'
import Card from './Card'
import Button from './Button'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

interface ParsedQuestion {
  questionText: string
  questionType?: 'multiple_choice' | 'true_false'
  questionImage?: string
  options: {
    text: string
    isCorrect: boolean
  }[]
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  points?: number
  hasFormula?: boolean
}

interface ParsedDocument {
  title?: string
  author?: string
  questions: ParsedQuestion[]
}

interface QuestionImporterProps {
  subjectId?: string
  onClose: () => void
  onImport: () => void
}

export default function QuestionImporter({ subjectId, onClose, onImport }: QuestionImporterProps) {
  const [googleDocUrl, setGoogleDocUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [documentInfo, setDocumentInfo] = useState<{ title?: string; author?: string }>({})
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState<'input' | 'preview' | 'importing'>('input')
  const supabase = createClient()

  // Extrair ID do documento do Google Docs
  const extractDocId = (url: string) => {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }

  // Fazer fetch do conteúdo do documento
  const fetchGoogleDoc = async () => {
    setLoading(true)
    setError('')
    
    try {
      const docId = extractDocId(googleDocUrl)
      if (!docId) {
        throw new Error('URL do Google Docs inválida')
      }

      // Usar a API de exportação do Google Docs para obter o conteúdo em texto
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`
      
      const response = await fetch(`/api/fetch-google-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: exportUrl })
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar documento')
      }

      const text = await response.text()
      parseQuestions(text)
      
    } catch (err: any) {
      setError(err.message || 'Erro ao processar documento')
    } finally {
      setLoading(false)
    }
  }

  // Parser para extrair questões do texto
  const parseQuestions = (text: string) => {
    setParsing(true)
    const questions: ParsedQuestion[] = []
    let documentTitle = ''
    let documentAuthor = ''
    
    try {
      // Dividir o texto em linhas
      const lines = text.split('\n').map(line => line.trim())
      
      // Extrair título e autor das primeiras linhas
      let startLine = 0
      
      // Procurar por título (geralmente primeira linha não vazia)
      for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i]
        // Verificar se não é uma questão numerada (incluindo listas)
        if (line && !line.match(/^\s*\d+[\.\)]/)) {
          // Verificar se é título
          if (!documentTitle && !line.toLowerCase().includes('autor:') && !line.toLowerCase().includes('por:')) {
            documentTitle = line
          }
          // Verificar se é autor
          else if (line.toLowerCase().includes('autor:') || line.toLowerCase().includes('por:')) {
            documentAuthor = line.replace(/^(autor:|por:)\s*/i, '').trim()
          }
          // Se já temos título e não é autor, pode ser o autor sem prefixo
          else if (documentTitle && !documentAuthor && !line.match(/^\s*\d+[\.\)]/)) {
            documentAuthor = line
          }
        }
        // Se encontramos uma questão, parar de procurar título/autor
        if (line.match(/^\s*\d+[\.\)]/)) {
          startLine = i
          break
        }
      }
      
      setDocumentInfo({ title: documentTitle, author: documentAuthor })
      
      // Processar questões a partir de onde paramos
      const questionsText = lines.slice(startLine).join('\n')
      
      // Melhorar a divisão para detectar questões que começam com números
      // Suportar vários formatos incluindo listas numeradas do Google Docs
      const questionPatterns = [
        /(?:^|\n)(?:Questão\s*)?(\d+)[\.\)\-\s]+/gim,  // Formato básico: 1. ou 1) ou 1-
        /(?:^|\n)\s*(\d+)\.\s+/gm,                      // Lista numerada: espaços + número + ponto
        /(?:^|\n)\t+(\d+)\.\s+/gm,                      // Lista com tabs
        /(?:^|\n)\s{2,}(\d+)\.\s+/gm,                   // Lista com múltiplos espaços
      ]
      
      let matches: RegExpMatchArray[] = []
      
      // Tentar cada padrão até encontrar questões
      for (const pattern of questionPatterns) {
        const tempMatches = Array.from(questionsText.matchAll(pattern))
        if (tempMatches.length > 0) {
          matches = tempMatches
          break
        }
      }
      
      if (matches.length === 0) {
        // Tentar método alternativo
        const questionBlocks = questionsText.split(/(?=\d+[\.\)])/g).filter(block => block.trim())
        questionBlocks.forEach((block, index) => {
          const parsedQuestion = processQuestionBlock(block, questions)
          if (parsedQuestion) {
            // Renumerar questões começando do 1
            questions.push(parsedQuestion)
          }
        })
      } else {
        // Processar cada questão encontrada
        for (let idx = 0; idx < matches.length; idx++) {
          const start = matches[idx].index || 0
          const end = idx < matches.length - 1 ? matches[idx + 1].index : questionsText.length
          const questionBlock = questionsText.substring(start, end)
          const parsedQuestion = processQuestionBlock(questionBlock, questions)
          if (parsedQuestion) {
            questions.push(parsedQuestion)
          }
        }
      }
      
      // Garantir que as questões sejam numeradas corretamente
      questions.forEach((q, index) => {
        // Adicionar número da questão ao texto se não estiver presente
        if (!q.questionText.match(/^\d+[\.\)]/)) {
          q.questionText = `${index + 1}. ${q.questionText}`
        }
      })
      
      setParsedQuestions(questions)
      if (questions.length > 0) {
        setCurrentStep('preview')
        // Selecionar todas as questões por padrão
        setSelectedQuestions(new Set(questions.map((_, index) => index)))
      } else {
        setError('Nenhuma questão válida encontrada no documento')
      }
      
    } catch (err: any) {
      setError('Erro ao processar questões: ' + err.message)
    } finally {
      setParsing(false)
    }
  }

  // Função auxiliar para processar um bloco de questão
  const processQuestionBlock = (block: string, questions: ParsedQuestion[]): ParsedQuestion | null => {
    // Limpar o bloco mantendo a formatação original para detectar indentação
    const rawLines = block.split('\n')
    const lines = rawLines.map(line => line.trim()).filter(line => line)
    
    if (lines.length < 2) return null // Pular blocos muito pequenos
    
    // Extrair número e texto da questão
    let questionText = ''
    let questionImage = ''
    let hasFormula = false
    let startIndex = 0
    let questionType: 'multiple_choice' | 'true_false' = 'multiple_choice'
    
    console.log('Processing question block:', block.substring(0, 100))
    
    // Processar primeira linha - aceitar vários formatos incluindo listas
    const firstLine = lines[0]
    
    // Padrões para extrair texto da questão
    const patterns = [
      /(?:Questão\s*)?(\d+)[\.\)\-]\s*(.+)$/i,     // Questão 1. texto ou 1. texto
      /^\s*(\d+)\.\s+(.+)$/,                        // Lista numerada com espaços
      /^\t*(\d+)\.\s+(.+)$/,                        // Lista numerada com tabs
      /^(\d+)[\.\)]\s*(.+)$/,                       // Formato simples 1. ou 1)
    ]
    
    let questionMatch = null
    for (const pattern of patterns) {
      questionMatch = firstLine.match(pattern)
      if (questionMatch && questionMatch[2]) {
        questionText = questionMatch[2].trim()
        startIndex = 1
        break
      }
    }
    
    // Se não encontrou match, tentar pegar texto após número
    if (!questionText) {
      const simpleMatch = firstLine.match(/^\s*\d+[\.\)\-\s]+(.+)/)
      if (!simpleMatch) return null
      questionText = simpleMatch[1].trim()
      startIndex = 1
    }
    
    // Verificar se há continuação do texto da questão ou imagem
    let i = startIndex
    while (i < lines.length) {
      const line = lines[i].trim()
      
      // Detectar imagem em vários formatos
      const imagePatterns = [
        /\[IMAGEM:\s*(.+?)\]/i,
        /!\[.*?\]\((.+?)\)/,
        /https?:\/\/[^\s]+\/@@images\/[^\s]+/i, // Padrão gov.br e similares
        /https?:\/\/[^\s]+(image|img|photo|foto|picture)[^\s]*/i, // URLs com palavras-chave de imagem
        /https?:\/\/[^\s]+\/(jpg|jpeg|png|gif|webp|svg)\/[^\s]+/i, // URLs com tipo de imagem no meio
        /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?$/i, // URLs terminando com extensão de imagem
        /^https?:\/\/[^\s]+$/i // URL simples em linha separada (deve ser o último)
      ]
      
      let imageFound = false
      for (const pattern of imagePatterns) {
        const match = line.match(pattern)
        if (match) {
          const detectedUrl = match[1] || match[2] || match[0]
          
          // Validar que é uma URL completa, não apenas uma extensão
          if (detectedUrl && detectedUrl.startsWith('http')) {
            questionImage = detectedUrl
            imageFound = true
            console.log('Image detected:', questionImage)
            break
          }
        }
      }
      
      if (imageFound) {
        i++
        continue
      }
      
      // Detectar fórmulas matemáticas (LaTeX)
      if (line.includes('$$') || line.includes('\\[') || line.includes('\\(') || 
          line.match(/\$[^$]+\$/) || line.match(/\\\w+{/)) {
        hasFormula = true
      }
      
      // Se não for uma opção, gabarito ou imagem, é continuação da questão
      if (!line.match(/^[a-eA-E][\.\)]/) && !line.match(/GABARITO:/i) && !imageFound) {
        // Não adicionar linhas vazias ou muito curtas como continuação
        if (line.length > 2) {
          questionText += ' ' + line
        }
        i++
      } else {
        break
      }
    }
        
    
    // Verificar se é uma questão de Verdadeiro ou Falso
    // Remover indicações de V/F do texto antes de criar as opções
    let cleanQuestionText = questionText
    const fullQuestionText = questionText + ' ' + lines.slice(i).join(' ')
    const trueFalsePatterns = [
      /\(\s*[VF]\s*\)/i,                              // (V) ou (F)
      /\[\s*[VF]\s*\]/i,                              // [V] ou [F]
      /\b(verdadeiro|falso)\b/i,                      // Verdadeiro ou Falso
      /\b(V|F)\b\s*[\-\)]/i,                         // V) ou F) ou V- ou F-
      /\(\s*\)\s*(verdadeiro|falso)/i,                // ( ) Verdadeiro
      /\(\s*\)\s*[VF]/i,                              // ( ) V ou ( ) F
      /^[VF]\s*$/i,                                   // Apenas V ou F em linha separada
      /\s+\(\s*[VF]\s*\)\s*$/i,                      // Termina com (V) ou (F)
      /\s+[VF]\s*$/i,                                // Termina com V ou F
    ]
    
    let isTrueFalse = false
    for (const pattern of trueFalsePatterns) {
      if (fullQuestionText.match(pattern)) {
        isTrueFalse = true
        questionType = 'true_false'
        console.log('True/False question detected:', questionText.substring(0, 50))
        break
      }
    }
    
    const options: { text: string; isCorrect: boolean }[] = []
    let correctAnswer = ''
    
    // Se for questão V/F, criar opções padrão
    if (isTrueFalse) {
      options.push(
        { text: 'Verdadeiro', isCorrect: false },
        { text: 'Falso', isCorrect: false }
      )
      
      // Procurar pela resposta correta no texto
      for (; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Padrões para detectar gabarito de V/F
        const vfGabaritoPatterns = [
          /GABARITO:\s*([VF])/i,
          /Gabarito:\s*([VF])/i,
          /Resposta:\s*([VF])/i,
          /Resposta\s+correta:\s*([VF])/i,
          /Alternativa\s+correta:\s*([VF])/i,
          /^\*\s*([VF])/i,
          /^R:\s*([VF])/i,
          /\(\s*([VF])\s*\)\s*(?:correta|certa)/i,
          /^\s*([VF])\s*(?:correta|certa|verdadeira)/i,
          /GABARITO:\s*(verdadeiro|falso)/i,
          /Resposta:\s*(verdadeiro|falso)/i,
        ]
        
        for (const pattern of vfGabaritoPatterns) {
          const match = line.match(pattern)
          if (match) {
            const answer = match[1].toUpperCase()
            if (answer === 'V' || answer === 'VERDADEIRO') {
              options[0].isCorrect = true
              correctAnswer = 'V'
            } else if (answer === 'F' || answer === 'FALSO') {
              options[1].isCorrect = true
              correctAnswer = 'F'
            }
            break
          }
        }
        
        if (correctAnswer) break
      }
    } else {
      // Procurar por opções de múltipla escolha
      for (; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Verificar se é uma opção - aceitar vários formatos
        const optionPatterns = [
          /^[a-eA-E][\.\)]\s*(.+)/,           // a) ou a. texto
          /^\s+[a-eA-E][\.\)]\s*(.+)/,        // Com espaços antes
          /^\t+[a-eA-E][\.\)]\s*(.+)/,        // Com tabs antes
          /^[a-eA-E]\)\s*(.+)/,               // Apenas a) sem ponto
          /^\s*[a-eA-E]\.\s+(.+)/,            // Lista com letra e ponto
        ]
        
        let optionMatch = null
        for (const pattern of optionPatterns) {
          optionMatch = line.match(pattern)
          if (optionMatch) break
        }
        
        if (optionMatch) {
          const optionText = optionMatch[1].trim()
          
          // Detectar fórmulas nas opções
          if (optionText.includes('$') || optionText.includes('\\')) {
            hasFormula = true
          }
          
          options.push({
            text: optionText,
            isCorrect: false
          })
        }
        
        // Verificar se é o gabarito - aceitar vários formatos
        const gabaritoPatterns = [
          /GABARITO:\s*([a-eA-E])/i,
          /Gabarito:\s*([a-eA-E])/i,
          /Resposta:\s*([a-eA-E])/i,
          /Resposta\s+correta:\s*([a-eA-E])/i,
          /Alternativa\s+correta:\s*([a-eA-E])/i,
          /^([a-eA-E])\s*[\-\)]\s*(?:correta|certa)/i,
          /^Letra\s*([a-eA-E])/i,
          /^\*\s*([a-eA-E])/i,  // *a ou *A indicando resposta
          /^R:\s*([a-eA-E])/i,   // R: a
        ]
        
        for (const pattern of gabaritoPatterns) {
          const match = line.match(pattern)
          if (match) {
            correctAnswer = match[1].toLowerCase()
            break
          }
        }
      }
      
      // Marcar a opção correta para múltipla escolha
      if (correctAnswer && options.length > 0 && !isTrueFalse) {
        const correctIndex = correctAnswer.charCodeAt(0) - 'a'.charCodeAt(0)
        if (correctIndex >= 0 && correctIndex < options.length) {
          options[correctIndex].isCorrect = true
        }
      }
    }
    
    // Retornar questão apenas se tiver opções válidas
    if (questionText && options.length >= 2) {
      const question: ParsedQuestion = {
        questionText,
        questionType,
        questionImage,
        options,
        difficulty: 'medium' as 'medium',
        points: 1,
        category: 'Importada',
        hasFormula
      }
      
      // Log para debug
      if (questionImage) {
        console.log('Question with image:', {
          text: questionText.substring(0, 50),
          imageUrl: questionImage
        })
      }
      
      return question
    }
    
    return null
  }

  // Importar questões selecionadas para o banco
  const importQuestions = async () => {
    if (selectedQuestions.size === 0) {
      setError('Selecione pelo menos uma questão para importar')
      return
    }

    setCurrentStep('importing')
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const questionsToImport = parsedQuestions.filter((_, index) => 
        selectedQuestions.has(index)
      )

      // Importar cada questão
      for (const question of questionsToImport) {
        // Criar categoria com título e autor se disponíveis
        let category = question.category || 'Importada'
        if (documentInfo.title) {
          category = documentInfo.title
        }
        
        // Adicionar autor aos tags se disponível
        const tags = []
        if (documentInfo.author) {
          tags.push(`Autor: ${documentInfo.author}`)
        }
        if (documentInfo.title) {
          tags.push(`Fonte: ${documentInfo.title}`)
        }
        
        // Log da imagem antes de salvar
        if (question.questionImage) {
          console.log('Saving question with image:', question.questionImage)
        }
        
        // Criar a questão
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert({
            question_text: question.questionText,
            question_type: question.questionType || 'multiple_choice',
            difficulty: question.difficulty || 'medium',
            points: question.points || 1,
            subject_id: subjectId,
            created_by: user.id,
            is_active: true,
            category: category,
            tags: tags.length > 0 ? tags : null,
            question_image_url: question.questionImage || null,
            has_formula: question.hasFormula || false
          })
          .select()
          .single()

        if (questionError) throw questionError
        
        // Log após salvar
        if ((questionData as any).question_image_url) {
          console.log('Question saved with image URL:', (questionData as any).question_image_url)
        }

        // Criar as opções
        const optionsToInsert = question.options.map((option, index) => ({
          question_id: questionData.id,
          option_text: option.text,
          is_correct: option.isCorrect,
          order_index: index
        }))

        const { error: optionsError } = await supabase
          .from('question_options')
          .insert(optionsToInsert)

        if (optionsError) throw optionsError
      }

      setSuccess(true)
      setTimeout(() => {
        onImport()
        onClose()
      }, 2000)

    } catch (err: any) {
      setError('Erro ao importar questões: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleQuestionSelection = (index: number) => {
    const newSelection = new Set(selectedQuestions)
    if (newSelection.has(index)) {
      newSelection.delete(index)
    } else {
      newSelection.add(index)
    }
    setSelectedQuestions(newSelection)
  }

  const selectAll = () => {
    setSelectedQuestions(new Set(parsedQuestions.map((_, index) => index)))
  }

  const deselectAll = () => {
    setSelectedQuestions(new Set())
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-navy-800 rounded-xl shadow-2xl border border-gold-500/20 flex flex-col">
        {/* Fixed Header - 80px */}
        <div className="h-20 flex-shrink-0 flex justify-between items-center px-6 border-b border-gold-500/20">
          <div className="flex items-center gap-3">
            <FileQuestion className="w-6 h-6 text-gold-400" />
            <h2 className="text-xl font-bold text-gold">
              Importar Questões do Google Docs
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gold-400 hover:text-gold-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'input' && (
            <div className="h-full overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-6">
              {/* Instructions */}
              <Card variant="glass">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-gold-400 mt-0.5" />
                  <div className="text-sm text-gold-300 space-y-2">
                    <p className="font-semibold text-gold-200">Formato esperado do documento:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• Questões numeradas (1. 2. 3. etc)</li>
                      <li>• <span className="text-gold-400">Múltipla escolha:</span> Alternativas com letras (a) b) c) d) e)</li>
                      <li>• <span className="text-emerald-400">Verdadeiro/Falso:</span> Questões com (V) ou (F) no texto</li>
                      <li>• Gabarito indicado com &quot;GABARITO: X&quot; ou &quot;GABARITO: V/F&quot;</li>
                      <li>• Imagens: [IMAGEM: url] ou links diretos</li>
                      <li>• Fórmulas: LaTeX entre $ $ ou $$ $$</li>
                    </ul>
                    <p className="text-gold-400 mt-2">
                      O documento deve estar compartilhado publicamente ou com permissão de visualização.
                    </p>
                  </div>
                </div>
              </Card>

              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  URL do Google Docs
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                    <input
                      type="url"
                      value={googleDocUrl}
                      onChange={(e) => setGoogleDocUrl(e.target.value)}
                      placeholder="https://docs.google.com/document/d/..."
                      className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={fetchGoogleDoc}
                    disabled={!googleDocUrl || loading}
                    icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
              </div>

              {/* Example URL */}
              <div className="text-sm text-gold-300/70">
                <p>Exemplo de URL válida:</p>
                <code className="text-gold-400 bg-navy-900/50 px-2 py-1 rounded">
                  https://docs.google.com/document/d/1356NMrGqOODo3_xVSsVSNeaGo0ViX61M/edit
                </code>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <>
              {/* Single Scrollable Container for Everything */}
              <div 
                className="flex-1 overflow-y-auto max-h-[calc(85vh-10rem)] custom-scrollbar" 
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#FFD700 #001a33'
                }}>
                <div className="p-6 space-y-4">
                  {/* Document Info */}
                  {(documentInfo.title || documentInfo.author) && (
                    <Card variant="glass">
                      <div className="space-y-2">
                        {documentInfo.title && (
                          <div className="flex items-center gap-2">
                            <span className="text-gold-400 font-medium">Título:</span>
                            <span className="text-gold-200">{documentInfo.title}</span>
                          </div>
                        )}
                        {documentInfo.author && (
                          <div className="flex items-center gap-2">
                            <span className="text-gold-400 font-medium">Autor:</span>
                            <span className="text-gold-200">{documentInfo.author}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                  
                  {/* Summary */}
                  <Card variant="gradient">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gold-200 font-semibold">
                          {parsedQuestions.length} questões encontradas
                        </p>
                        <p className="text-gold-300/70 text-sm">
                          {selectedQuestions.size} selecionadas para importação
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={selectAll}>
                          Selecionar Todas
                        </Button>
                        <Button variant="ghost" size="sm" onClick={deselectAll}>
                          Desmarcar Todas
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Questions List - No extra wrappers */}
                  {parsedQuestions.map((question, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      variant="glass"
                      className={`cursor-pointer transition-all ${
                        selectedQuestions.has(index) 
                          ? 'ring-2 ring-gold-500/50 bg-gold-500/10' 
                          : 'hover:bg-navy-800/50'
                      }`}
                      onClick={() => toggleQuestionSelection(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            selectedQuestions.has(index)
                              ? 'bg-gold-500 border-gold-500'
                              : 'border-gold-500/50'
                          }`}>
                            {selectedQuestions.has(index) && (
                              <CheckCircle2 className="w-3 h-3 text-navy-900" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start gap-2">
                            <p className="text-gold-200 font-medium flex-1">
                              {question.questionText.match(/^\d+[\.\)]/) ? question.questionText : `${index + 1}. ${question.questionText}`}
                            </p>
                            <div className="flex gap-1">
                              {question.questionType === 'true_false' && (
                                <span className="px-2 py-1 bg-emerald-500/20 rounded text-xs text-emerald-400 font-medium">
                                  V/F
                                </span>
                              )}
                              {question.questionImage && (
                                <span className="p-1 bg-blue-500/20 rounded" title="Contém imagem">
                                  <Image className="w-3 h-3 text-blue-400" />
                                </span>
                              )}
                              {question.hasFormula && (
                                <span className="p-1 bg-purple-500/20 rounded" title="Contém fórmula matemática">
                                  <Calculator className="w-3 h-3 text-purple-400" />
                                </span>
                              )}
                            </div>
                          </div>
                          {question.questionImage && (
                            <div className="mt-2 p-2 bg-navy-900/50 rounded-lg border border-blue-500/20">
                              <p className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                Imagem detectada:
                              </p>
                              <p className="text-xs text-gold-300 break-all">
                                {question.questionImage.length > 60 
                                  ? question.questionImage.substring(0, 60) + '...' 
                                  : question.questionImage}
                              </p>
                            </div>
                          )}
                          <div className="space-y-1">
                            {question.options.map((option, optIndex) => (
                              <div 
                                key={optIndex}
                                className={`flex items-center gap-2 text-sm ${
                                  option.isCorrect 
                                    ? 'text-green-400' 
                                    : 'text-gold-300/70'
                                }`}
                              >
                                <span className="font-medium">
                                  {String.fromCharCode(97 + optIndex)})
                                </span>
                                <span>{option.text}</span>
                                {option.isCorrect && (
                                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
                </div>
              </div>

              {/* Fixed Footer - 80px */}
              <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 border-t border-gold-500/20 bg-navy-800">
                <Button variant="ghost" onClick={() => setCurrentStep('input')}>
                  Voltar
                </Button>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={importQuestions}
                    disabled={selectedQuestions.size === 0 || loading}
                    icon={<Save className="w-5 h-5" />}
                    className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-navy-900 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                  >
                    Importar {selectedQuestions.size} Questões
                  </Button>
                </div>
              </div>
            </>
          )}

          {currentStep === 'importing' && (
            <div className="h-full flex flex-col items-center justify-center p-6 space-y-4">
              {!success ? (
                <>
                  <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
                  <p className="text-gold-200 font-medium">Importando questões...</p>
                  <p className="text-gold-300/70 text-sm">Isso pode levar alguns instantes</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-12 h-12 text-green-400" />
                  <p className="text-gold-200 font-medium">Questões importadas com sucesso!</p>
                  <p className="text-gold-300/70 text-sm">
                    {selectedQuestions.size} questões foram adicionadas ao banco
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer for input step */}
        {currentStep === 'input' && (
          <div className="h-20 flex-shrink-0 flex items-center justify-end px-6 border-t border-gold-500/20">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}