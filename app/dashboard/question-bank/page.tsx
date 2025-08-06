'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Database, FileQuestion, Tag, MoreVertical, Copy, Archive, Eye, Check } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../../contexts/LanguageContext'
import { Question, QuestionOption } from '@/lib/database.types'
import QuestionForm from '../../components/QuestionForm'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'

interface QuestionWithDetails extends Question {
  options?: QuestionOption[]
  subject?: { name: string }
  creator?: { full_name: string }
}

export default function QuestionBankPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [questions, setQuestions] = useState<QuestionWithDetails[]>([])
  const [categories, setCategories] = useState<string[]>(['all'])
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | undefined>()
  const [previewQuestion, setPreviewQuestion] = useState<QuestionWithDetails | null>(null)
  const { t } = useTranslation()
  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          subject:subjects(name),
          creator:profiles!questions_created_by_fkey(full_name),
          options:question_options(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setQuestions((data || []) as QuestionWithDetails[])
      
      // Extrair categorias únicas
      const uniqueCategories = Array.from(new Set(
        (data || [])
          .map(q => q.category)
          .filter(Boolean)
      )) as string[]
      setCategories(['all', ...uniqueCategories])
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching questions:', error)
      showToast({ type: 'error', title: 'Erro ao carregar questões' })
      setLoading(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Tem certeza que deseja arquivar esta questão?')) return

    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: false })
        .eq('id', questionId)

      if (error) throw error

      showToast({ type: 'success', title: 'Questão arquivada com sucesso' })
      fetchQuestions()
    } catch (error) {
      console.error('Error archiving question:', error)
      showToast({ type: 'error', title: 'Erro ao arquivar questão' })
    }
  }

  const handleDuplicateQuestion = async (question: QuestionWithDetails) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // Criar cópia da questão
      const { data: newQuestion, error: questionError } = await supabase
        .from('questions')
        .insert({
          question_text: `${question.question_text} (Cópia)`,
          question_type: question.question_type,
          difficulty: question.difficulty,
          points: question.points,
          subject_id: question.subject_id,
          category: question.category,
          explanation: question.explanation,
          tags: question.tags,
          is_active: true,
          created_by: user.id
        })
        .select()
        .single()

      if (questionError) throw questionError

      // Copiar opções se existirem
      if (question.options && question.options.length > 0) {
        const newOptions = question.options.map(opt => ({
          question_id: newQuestion.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          order_index: opt.order_index
        }))

        const { error: optionsError } = await supabase
          .from('question_options')
          .insert(newOptions)

        if (optionsError) throw optionsError
      }

      showToast({ type: 'success', title: 'Questão duplicada com sucesso' })
      fetchQuestions()
    } catch (error) {
      console.error('Error duplicating question:', error)
      showToast({ type: 'error', title: 'Erro ao duplicar questão' })
    }
  }

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (question.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (question.subject?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || question.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || question.difficulty === selectedDifficulty
    const matchesType = selectedType === 'all' || question.question_type === selectedType
    return matchesSearch && matchesCategory && matchesDifficulty && matchesType && question.is_active !== false
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Múltipla Escolha'
      case 'true_false':
        return 'V ou F'
      case 'essay':
        return 'Dissertativa'
      case 'calculation':
        return 'Cálculo'
      default:
        return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'bg-blue-500/20 text-blue-400'
      case 'true_false':
        return 'bg-green-500/20 text-green-400'
      case 'essay':
        return 'bg-purple-500/20 text-purple-400'
      case 'calculation':
        return 'bg-orange-500/20 text-orange-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 text-green-400'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'hard':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Fácil'
      case 'medium':
        return 'Médio'
      case 'hard':
        return 'Difícil'
      default:
        return difficulty
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold">Banco de Questões</h1>
          <p className="text-gold-300 mt-1">Gerencie e organize questões para testes e avaliações</p>
        </div>
        <Button 
          icon={<Plus className="w-5 h-5" />}
          onClick={() => {
            setEditingQuestionId(undefined)
            setShowQuestionForm(true)
          }}
        >
          Nova Questão
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder="Buscar questões, tags ou disciplinas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
        >
          <option value="all">Todas as Categorias</option>
          {categories.slice(1).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
        >
          <option value="all">Todas as Dificuldades</option>
          <option value="easy">Fácil</option>
          <option value="medium">Médio</option>
          <option value="hard">Difícil</option>
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
        >
          <option value="all">Todos os Tipos</option>
          <option value="multiple_choice">Múltipla Escolha</option>
          <option value="true_false">V ou F</option>
          <option value="essay">Dissertativa</option>
          <option value="fill_blank">Preencher Lacunas</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Questões</p>
              <p className="text-2xl font-bold text-gold mt-1">{questions.length}</p>
            </div>
            <Database className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Categorias</p>
              <p className="text-2xl font-bold text-gold mt-1">{categories.length - 1}</p>
            </div>
            <Tag className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Uso Médio</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {questions.length > 0 ? Math.round(questions.reduce((acc, q) => acc + (q.usage_count || 0), 0) / questions.length) : 0}
              </p>
            </div>
            <FileQuestion className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Questões Ativas</p>
              <p className="text-2xl font-bold text-gold mt-1">{questions.filter(q => q.is_active !== false).length}</p>
            </div>
            <Archive className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
      </div>

      {/* Questions List */}
      <Card>
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gold-400">Nenhuma questão encontrada</p>
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <div key={question.id} className="p-4 bg-navy-900/30 rounded-lg border border-gold-500/10 hover:border-gold-500/30 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-gold-100 font-medium mb-2">{question.question_text}</p>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(question.question_type)}`}>
                        {getTypeLabel(question.question_type)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                        {getDifficultyLabel(question.difficulty)}
                      </span>
                      {question.category && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-navy-700/50 text-gold-300">
                          {question.category}
                        </span>
                      )}
                      {question.subject?.name && (
                        <span className="text-gold-400 text-xs">• {question.subject.name}</span>
                      )}
                      <span className="text-gold-400 text-xs">• {question.points} {question.points === 1 ? 'ponto' : 'pontos'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gold-400">
                      {question.creator?.full_name && (
                        <>
                          <span>Criado por: {question.creator.full_name}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{new Date(question.created_at || '').toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>Usada {question.usage_count || 0} vezes</span>
                    </div>
                    {question.tags && question.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {question.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-navy-800/50 text-gold-300 text-xs rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors" 
                      title="Visualizar"
                      onClick={() => setPreviewQuestion(question)}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors" 
                      title="Duplicar"
                      onClick={() => handleDuplicateQuestion(question)}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors" 
                      title="Editar"
                      onClick={() => {
                        setEditingQuestionId(question.id)
                        setShowQuestionForm(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors" 
                      title="Arquivar"
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Question Form Modal */}
      <QuestionForm
        isOpen={showQuestionForm}
        onClose={() => {
          setShowQuestionForm(false)
          setEditingQuestionId(undefined)
        }}
        questionId={editingQuestionId}
        onSuccess={() => {
          setShowQuestionForm(false)
          setEditingQuestionId(undefined)
          fetchQuestions()
        }}
      />

      {/* Question Preview Modal */}
      {previewQuestion && (
        <Modal
          isOpen={!!previewQuestion}
          onClose={() => setPreviewQuestion(null)}
          title="Visualizar Questão"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gold-300 mb-2">Questão</h3>
              <p className="text-gold-100">{previewQuestion.question_text}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(previewQuestion.question_type)}`}>
                {getTypeLabel(previewQuestion.question_type)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(previewQuestion.difficulty)}`}>
                {getDifficultyLabel(previewQuestion.difficulty)}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-navy-700/50 text-gold-300">
                {previewQuestion.points} {previewQuestion.points === 1 ? 'ponto' : 'pontos'}
              </span>
            </div>

            {previewQuestion.options && previewQuestion.options.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gold-300 mb-2">Opções de Resposta</h3>
                <div className="space-y-2">
                  {previewQuestion.options.sort((a, b) => a.order_index - b.order_index).map((option, idx) => (
                    <div key={option.id} className={`flex items-center gap-2 p-2 rounded ${option.is_correct ? 'bg-green-500/10 border border-green-500/20' : ''}`}>
                      <span className="text-gold-400">{String.fromCharCode(65 + idx)})</span>
                      <span className="text-gold-100">{option.option_text}</span>
                      {option.is_correct && <Check className="w-4 h-4 text-green-400 ml-auto" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewQuestion.explanation && (
              <div>
                <h3 className="text-sm font-medium text-gold-300 mb-2">Explicação</h3>
                <p className="text-gold-100">{previewQuestion.explanation}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gold-400">Disciplina:</span>
                <span className="text-gold-100 ml-2">{previewQuestion.subject?.name || '-'}</span>
              </div>
              {previewQuestion.category && (
                <div>
                  <span className="text-gold-400">Categoria:</span>
                  <span className="text-gold-100 ml-2">{previewQuestion.category}</span>
                </div>
              )}
              <div>
                <span className="text-gold-400">Criado por:</span>
                <span className="text-gold-100 ml-2">{previewQuestion.creator?.full_name || '-'}</span>
              </div>
              <div>
                <span className="text-gold-400">Data de criação:</span>
                <span className="text-gold-100 ml-2">{new Date(previewQuestion.created_at || '').toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {previewQuestion.tags && previewQuestion.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gold-300 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {previewQuestion.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-navy-800/50 text-gold-300 text-xs rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}