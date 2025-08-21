'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Check, AlertCircle } from 'lucide-react'
import Button from './Button'
import Card from './Card'
import Modal from './Modal'
import { createClient } from '@/lib/supabase/client'
import { Database, Tables } from '@/lib/database.types'
import { useToast } from '../components/Toast'

type Question = Tables<'questions'>
type QuestionOption = Tables<'question_options'>
type QuestionType = Database['public']['Enums']['question_type']
type DifficultyLevel = Database['public']['Enums']['difficulty_level']

interface QuestionFormProps {
  isOpen: boolean
  onClose: () => void
  questionId?: string
  subjectId?: string
  onSuccess?: () => void
}

export default function QuestionForm({
  isOpen,
  onClose,
  questionId,
  subjectId,
  onSuccess
}: QuestionFormProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([])
  
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice' as QuestionType,
    difficulty: 'medium' as DifficultyLevel,
    points: 1,
    subject_id: subjectId || '',
    category: '',
    explanation: '',
    tags: [] as string[],
    is_active: true
  })

  const [options, setOptions] = useState<Array<{
    id?: string
    option_text: string
    is_correct: boolean
    order_index: number
  }>>([
    { option_text: '', is_correct: false, order_index: 0 },
    { option_text: '', is_correct: false, order_index: 1 },
    { option_text: '', is_correct: false, order_index: 2 },
    { option_text: '', is_correct: false, order_index: 3 }
  ])

  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchSubjects()
      if (questionId) {
        fetchQuestion()
      }
    }
  }, [isOpen, questionId])

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name')

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Error fetching subjects:', error)
      showToast({ type: 'error', title: 'Erro ao carregar disciplinas' })
    }
  }

  const fetchQuestion = async () => {
    if (!questionId) return
    
    setLoading(true)
    try {
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single()

      if (questionError) throw questionError

      const { data: optionsData, error: optionsError } = await supabase
        .from('question_options')
        .select('*')
        .eq('question_id', questionId)
        .order('order_index')

      if (optionsError) throw optionsError

      setFormData({
        question_text: question.question_text,
        question_type: question.question_type,
        difficulty: question.difficulty,
        points: question.points,
        subject_id: question.subject_id || '',
        category: question.category || '',
        explanation: question.explanation || '',
        tags: question.tags || [],
        is_active: question.is_active !== false
      })

      if (optionsData && optionsData.length > 0) {
        setOptions(optionsData)
      }
    } catch (error) {
      console.error('Error fetching question:', error)
      showToast({ type: 'error', title: 'Erro ao carregar questão' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (!formData.question_text.trim()) {
      showToast({ type: 'error', title: 'Por favor, insira o texto da questão' })
      return
    }

    if (!formData.subject_id) {
      showToast({ type: 'error', title: 'Por favor, selecione uma disciplina' })
      return
    }

    // Validações específicas por tipo
    if (formData.question_type === 'multiple_choice') {
      const validOptions = options.filter(opt => opt.option_text.trim())
      if (validOptions.length < 2) {
        showToast({ type: 'error', title: 'Questões de múltipla escolha devem ter pelo menos 2 opções' })
        return
      }
      const hasCorrect = validOptions.some(opt => opt.is_correct)
      if (!hasCorrect) {
        showToast({ type: 'error', title: 'Selecione pelo menos uma opção correta' })
        return
      }
    }

    if (formData.question_type === 'true_false') {
      const validOptions = options.filter(opt => opt.option_text.trim())
      if (validOptions.length !== 2) {
        showToast({ type: 'error', title: 'Questões V/F devem ter exatamente 2 opções' })
        return
      }
      const hasCorrect = validOptions.some(opt => opt.is_correct)
      if (!hasCorrect) {
        showToast({ type: 'error', title: 'Selecione a opção correta' })
        return
      }
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      if (questionId) {
        // Atualizar questão existente
        const { error: updateError } = await supabase
          .from('questions')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', questionId)

        if (updateError) throw updateError

        // Deletar opções antigas se for múltipla escolha ou V/F
        if (['multiple_choice', 'true_false'].includes(formData.question_type)) {
          const { error: deleteError } = await supabase
            .from('question_options')
            .delete()
            .eq('question_id', questionId)

          if (deleteError) throw deleteError

          // Inserir novas opções
          const validOptions = options
            .filter(opt => opt.option_text.trim())
            .map((opt, index) => ({
              question_id: questionId,
              option_text: opt.option_text,
              is_correct: opt.is_correct,
              order_index: index
            }))

          if (validOptions.length > 0) {
            const { error: insertError } = await supabase
              .from('question_options')
              .insert(validOptions)

            if (insertError) throw insertError
          }
        }
      } else {
        // Criar nova questão
        const { data: newQuestion, error: insertError } = await supabase
          .from('questions')
          .insert({
            ...formData,
            created_by: user.id
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Inserir opções se for múltipla escolha ou V/F
        if (['multiple_choice', 'true_false'].includes(formData.question_type)) {
          const validOptions = options
            .filter(opt => opt.option_text.trim())
            .map((opt, index) => ({
              question_id: newQuestion.id,
              option_text: opt.option_text,
              is_correct: opt.is_correct,
              order_index: index
            }))

          if (validOptions.length > 0) {
            const { error: optionsError } = await supabase
              .from('question_options')
              .insert(validOptions)

            if (optionsError) throw optionsError
          }
        }
      }

      showToast({
        type: 'success',
        title: questionId ? 'Questão atualizada com sucesso!' : 'Questão criada com sucesso!'
      })
      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Error saving question:', error)
      showToast({ type: 'error', title: 'Erro ao salvar questão' })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setFormData({
      question_text: '',
      question_type: 'multiple_choice',
      difficulty: 'medium',
      points: 1,
      subject_id: subjectId || '',
      category: '',
      explanation: '',
      tags: [],
      is_active: true
    })
    setOptions([
      { option_text: '', is_correct: false, order_index: 0 },
      { option_text: '', is_correct: false, order_index: 1 },
      { option_text: '', is_correct: false, order_index: 2 },
      { option_text: '', is_correct: false, order_index: 3 }
    ])
    setTagInput('')
    onClose()
  }

  const addOption = () => {
    setOptions([...options, {
      option_text: '',
      is_correct: false,
      order_index: options.length
    }])
  }

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    setOptions(newOptions.map((opt, i) => ({ ...opt, order_index: i })))
  }

  const updateOption = (index: number, field: 'option_text' | 'is_correct', value: string | boolean) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    
    // Se for V/F e marcar uma como correta, desmarcar a outra
    if (formData.question_type === 'true_false' && field === 'is_correct' && value === true) {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false
      })
    }
    
    setOptions(newOptions)
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Carregando...">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={questionId ? 'Editar Questão' : 'Nova Questão'}
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : questionId ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gold">Informações Básicas</h3>
          
          <div>
            <label className="block text-sm font-medium text-gold-300 mb-2">
              Texto da Questão *
            </label>
            <textarea
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="Digite o texto da questão..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Tipo de Questão *
              </label>
              <select
                value={formData.question_type}
                onChange={(e) => {
                  const newType = e.target.value as QuestionType
                  setFormData({ ...formData, question_type: newType })
                  
                  // Ajustar opções para V/F
                  if (newType === 'true_false') {
                    setOptions([
                      { option_text: 'Verdadeiro', is_correct: false, order_index: 0 },
                      { option_text: 'Falso', is_correct: false, order_index: 1 }
                    ])
                  } else if (formData.question_type === 'true_false') {
                    // Resetar opções se estava em V/F
                    setOptions([
                      { option_text: '', is_correct: false, order_index: 0 },
                      { option_text: '', is_correct: false, order_index: 1 },
                      { option_text: '', is_correct: false, order_index: 2 },
                      { option_text: '', is_correct: false, order_index: 3 }
                    ])
                  }
                }}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="multiple_choice">Múltipla Escolha</option>
                <option value="true_false">Verdadeiro ou Falso</option>
                <option value="essay">Dissertativa</option>
                <option value="fill_blank">Preencher Lacunas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Disciplina *
              </label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                required
              >
                <option value="">Selecione uma disciplina</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Dificuldade
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as DifficultyLevel })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="easy">Fácil</option>
                <option value="medium">Médio</option>
                <option value="hard">Difícil</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Pontos
              </label>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                min="1"
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Categoria
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Cálculo"
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
          </div>
        </div>

        {/* Opções de Resposta */}
        {['multiple_choice', 'true_false'].includes(formData.question_type) && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gold">Opções de Resposta</h3>
            
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-start gap-3">
                  <input
                    type={formData.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                    name="correct_option"
                    checked={option.is_correct}
                    onChange={(e) => updateOption(index, 'is_correct', e.target.checked)}
                    className="mt-1.5 w-4 h-4 text-gold-500 border-gold-500/50 rounded focus:ring-gold-500"
                  />
                  <input
                    type="text"
                    value={option.option_text}
                    onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                    placeholder={`Opção ${index + 1}`}
                    className="flex-1 px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    disabled={formData.question_type === 'true_false'}
                  />
                  {formData.question_type === 'multiple_choice' && options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {formData.question_type === 'multiple_choice' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={addOption}
              >
                Adicionar Opção
              </Button>
            )}

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
              <p className="text-sm text-blue-300">
                {formData.question_type === 'multiple_choice'
                  ? 'Marque todas as opções corretas. Pode haver mais de uma resposta correta.'
                  : 'Selecione a opção correta.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Explicação */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gold">Informações Adicionais</h3>
          
          <div>
            <label className="block text-sm font-medium text-gold-300 mb-2">
              Explicação da Resposta
            </label>
            <textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="Explique a resposta correta (opcional)..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gold-300 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Digite uma tag e pressione Enter"
                className="flex-1 px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag}>
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-navy-800/50 text-gold-300 text-sm rounded-full flex items-center gap-2"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-gold-400 hover:text-gold-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-gold-500 border-gold-500/50 rounded focus:ring-gold-500"
            />
            <label htmlFor="is_active" className="text-sm text-gold-300">
              Questão ativa (visível para uso em testes)
            </label>
          </div>
        </div>
      </form>
    </Modal>
  )
}