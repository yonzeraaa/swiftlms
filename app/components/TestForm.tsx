'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, GripVertical, Search, ChevronDown, ChevronUp } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './Toast'

interface TestFormProps {
  isOpen: boolean
  onClose: () => void
  testId?: string
  onSuccess: () => void
}

interface Course {
  id: string
  title: string
}

interface Subject {
  id: string
  name: string
}

interface Question {
  id: string
  question_text: string
  question_type: string
  difficulty: string
  points: number
  subject?: { name: string }
}

interface SelectedQuestion extends Question {
  order_index: number
  points_override?: number
}

export default function TestForm({ isOpen, onClose, testId, onSuccess }: TestFormProps) {
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([])
  const [showQuestionSelector, setShowQuestionSelector] = useState(false)
  const [questionSearch, setQuestionSearch] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    subject_id: '',
    test_type: 'quiz' as 'quiz' | 'exam' | 'practice',
    duration_minutes: 60,
    passing_score: 60,
    instructions: '',
    is_published: false,
    show_results: true,
    show_answers: false,
    randomize_questions: false,
    randomize_options: false,
    max_attempts: null as number | null,
    scheduled_for: '',
    available_until: ''
  })

  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchCourses()
      fetchSubjects()
      fetchAvailableQuestions()
      if (testId) {
        fetchTestData()
      }
    }
  }, [isOpen, testId])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title')

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
      showToast({ type: 'error', title: 'Erro ao carregar cursos' })
    }
  }

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

  const fetchAvailableQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          question_type,
          difficulty,
          points,
          subject:subjects(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAvailableQuestions((data || []) as Question[])
    } catch (error) {
      console.error('Error fetching questions:', error)
      showToast({ type: 'error', title: 'Erro ao carregar questões' })
    }
  }

  const fetchTestData = async () => {
    if (!testId) return

    try {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single()

      if (testError) throw testError

      setFormData({
        title: testData.title,
        description: testData.description || '',
        course_id: testData.course_id || '',
        subject_id: testData.subject_id || '',
        test_type: testData.test_type,
        duration_minutes: testData.duration_minutes || 60,
        passing_score: testData.passing_score,
        instructions: testData.instructions || '',
        is_published: testData.is_published || false,
        show_results: testData.show_results || true,
        show_answers: testData.show_answers || false,
        randomize_questions: testData.randomize_questions || false,
        randomize_options: testData.randomize_options || false,
        max_attempts: testData.max_attempts,
        scheduled_for: testData.scheduled_for ? new Date(testData.scheduled_for).toISOString().slice(0, 16) : '',
        available_until: testData.available_until ? new Date(testData.available_until).toISOString().slice(0, 16) : ''
      })

      // Fetch associated questions
      const { data: testQuestions, error: questionsError } = await supabase
        .from('test_questions')
        .select(`
          *,
          question:questions(
            id,
            question_text,
            question_type,
            difficulty,
            points,
            subject:subjects(name)
          )
        `)
        .eq('test_id', testId)
        .order('order_index')

      if (questionsError) throw questionsError

      const selected = testQuestions?.map(tq => ({
        ...tq.question,
        order_index: tq.order_index,
        points_override: tq.points_override
      })) || []

      setSelectedQuestions(selected as SelectedQuestion[])
    } catch (error) {
      console.error('Error fetching test data:', error)
      showToast({ type: 'error', title: 'Erro ao carregar dados do teste' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedQuestions.length === 0) {
      showToast({ type: 'error', title: 'Adicione pelo menos uma questão ao teste' })
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const totalPoints = selectedQuestions.reduce((sum, q) => sum + (q.points_override || q.points), 0)

      const testPayload = {
        title: formData.title,
        description: formData.description || null,
        course_id: formData.course_id || null,
        subject_id: formData.subject_id || null,
        test_type: formData.test_type,
        duration_minutes: formData.duration_minutes || null,
        total_points: totalPoints,
        passing_score: formData.passing_score,
        instructions: formData.instructions || null,
        is_published: formData.is_published,
        show_results: formData.show_results,
        show_answers: formData.show_answers,
        randomize_questions: formData.randomize_questions,
        randomize_options: formData.randomize_options,
        max_attempts: formData.max_attempts || null,
        scheduled_for: formData.scheduled_for || null,
        available_until: formData.available_until || null,
        created_by: testId ? undefined : user.id,
        updated_at: new Date().toISOString()
      }

      let testIdToUse = testId

      if (testId) {
        // Update existing test
        const { error: updateError } = await supabase
          .from('tests')
          .update(testPayload)
          .eq('id', testId)

        if (updateError) throw updateError

        // Delete existing test questions
        const { error: deleteError } = await supabase
          .from('test_questions')
          .delete()
          .eq('test_id', testId)

        if (deleteError) throw deleteError
      } else {
        // Create new test
        const { data: newTest, error: createError } = await supabase
          .from('tests')
          .insert(testPayload)
          .select()
          .single()

        if (createError) throw createError
        testIdToUse = newTest.id
      }

      // Add test questions
      if (!testIdToUse) {
        throw new Error('Test ID not found')
      }
      
      const testQuestionsPayload = selectedQuestions.map((q, index) => ({
        test_id: testIdToUse,
        question_id: q.id,
        order_index: index,
        points_override: q.points_override || null
      }))

      const { error: questionsError } = await supabase
        .from('test_questions')
        .insert(testQuestionsPayload)

      if (questionsError) throw questionsError

      showToast({ 
        type: 'success', 
        title: testId ? 'Teste atualizado com sucesso!' : 'Teste criado com sucesso!' 
      })
      
      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Error saving test:', error)
      showToast({ type: 'error', title: 'Erro ao salvar teste' })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      course_id: '',
      subject_id: '',
      test_type: 'quiz',
      duration_minutes: 60,
      passing_score: 60,
      instructions: '',
      is_published: false,
      show_results: true,
      show_answers: false,
      randomize_questions: false,
      randomize_options: false,
      max_attempts: null,
      scheduled_for: '',
      available_until: ''
    })
    setSelectedQuestions([])
    setQuestionSearch('')
    setShowQuestionSelector(false)
    onClose()
  }

  const addQuestion = (question: Question) => {
    if (selectedQuestions.find(q => q.id === question.id)) {
      showToast({ type: 'warning', title: 'Questão já adicionada' })
      return
    }

    setSelectedQuestions([...selectedQuestions, {
      ...question,
      order_index: selectedQuestions.length
    }])
  }

  const removeQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId))
  }

  const updateQuestionPoints = (questionId: string, points: number) => {
    setSelectedQuestions(selectedQuestions.map(q => 
      q.id === questionId ? { ...q, points_override: points } : q
    ))
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...selectedQuestions]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= newQuestions.length) return
    
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]]
    setSelectedQuestions(newQuestions)
  }

  const filteredQuestions = availableQuestions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(questionSearch.toLowerCase())
    const matchesSubject = !formData.subject_id || q.subject?.name === subjects.find(s => s.id === formData.subject_id)?.name
    return matchesSearch && matchesSubject
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'Múltipla Escolha'
      case 'true_false': return 'V ou F'
      case 'essay': return 'Dissertativa'
      case 'fill_blank': return 'Preencher Lacunas'
      default: return type
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil'
      case 'medium': return 'Médio'
      case 'hard': return 'Difícil'
      default: return difficulty
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={testId ? 'Editar Teste' : 'Novo Teste'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gold">Informações Básicas</h3>
          
          <div>
            <label className="block text-sm font-medium text-gold-300 mb-2">
              Título do Teste *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gold-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Curso
              </label>
              <select
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="">Selecione um curso</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Disciplina
              </label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="">Selecione uma disciplina</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Tipo de Teste *
              </label>
              <select
                value={formData.test_type}
                onChange={(e) => setFormData({ ...formData, test_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                required
              >
                <option value="quiz">Quiz</option>
                <option value="exam">Prova</option>
                <option value="practice">Prática</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Duração (minutos)
              </label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                min="1"
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Nota Mínima (%)
              </label>
              <input
                type="number"
                value={formData.passing_score}
                onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                required
              />
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gold">
              Questões ({selectedQuestions.length})
            </h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowQuestionSelector(!showQuestionSelector)}
              icon={showQuestionSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            >
              {showQuestionSelector ? 'Ocultar' : 'Adicionar'} Questões
            </Button>
          </div>

          {showQuestionSelector && (
            <div className="border border-gold-500/20 rounded-lg p-4 bg-navy-900/30">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                  <input
                    type="text"
                    placeholder="Buscar questões..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredQuestions.map(question => (
                  <div key={question.id} className="flex items-center justify-between p-2 bg-navy-800/30 rounded hover:bg-navy-800/50 transition-colors">
                    <div className="flex-1">
                      <p className="text-gold-100 text-sm">{question.question_text}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gold-400">{getTypeLabel(question.question_type)}</span>
                        <span className="text-xs text-gold-400">•</span>
                        <span className="text-xs text-gold-400">{getDifficultyLabel(question.difficulty)}</span>
                        <span className="text-xs text-gold-400">•</span>
                        <span className="text-xs text-gold-400">{question.points} pts</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => addQuestion(question)}
                      disabled={selectedQuestions.some(q => q.id === question.id)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedQuestions.length > 0 && (
            <div className="space-y-2">
              {selectedQuestions.map((question, index) => (
                <div key={question.id} className="flex items-center gap-2 p-3 bg-navy-900/30 rounded-lg border border-gold-500/10">
                  <button
                    type="button"
                    className="text-gold-400 hover:text-gold-200 cursor-move"
                    disabled
                  >
                    <GripVertical className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1">
                    <p className="text-gold-100 text-sm">{question.question_text}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-gold-400">{getTypeLabel(question.question_type)}</span>
                      <span className="text-xs text-gold-400">•</span>
                      <span className="text-xs text-gold-400">{getDifficultyLabel(question.difficulty)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={question.points_override || question.points}
                      onChange={(e) => updateQuestionPoints(question.id, parseInt(e.target.value))}
                      min="1"
                      className="w-16 px-2 py-1 bg-navy-900/50 border border-gold-500/20 rounded text-gold-100 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500/50"
                    />
                    <span className="text-xs text-gold-400">pts</span>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gold-400 hover:text-gold-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 'down')}
                      disabled={index === selectedQuestions.length - 1}
                      className="p-1 text-gold-400 hover:text-gold-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(question.id)}
                      className="p-1 text-red-400 hover:text-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="text-right text-sm text-gold-300">
                Total de pontos: {selectedQuestions.reduce((sum, q) => sum + (q.points_override || q.points), 0)}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gold">Configurações</h3>
          
          <div>
            <label className="block text-sm font-medium text-gold-300 mb-2">
              Instruções
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="Instruções para os alunos antes de iniciar o teste..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Tentativas Máximas
              </label>
              <input
                type="number"
                value={formData.max_attempts || ''}
                onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value ? parseInt(e.target.value) : null })}
                min="1"
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                placeholder="Ilimitado"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">
                Agendar Para
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_for}
                onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gold-300 mb-2">
              Disponível Até
            </label>
            <input
              type="datetime-local"
              value={formData.available_until}
              onChange={(e) => setFormData({ ...formData, available_until: e.target.value })}
              className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4 text-gold-500 bg-navy-900 border-gold-500/30 rounded focus:ring-gold-500"
              />
              <span className="text-sm text-gold-200">Publicar teste (disponível para alunos)</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.show_results}
                onChange={(e) => setFormData({ ...formData, show_results: e.target.checked })}
                className="w-4 h-4 text-gold-500 bg-navy-900 border-gold-500/30 rounded focus:ring-gold-500"
              />
              <span className="text-sm text-gold-200">Mostrar resultados após conclusão</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.show_answers}
                onChange={(e) => setFormData({ ...formData, show_answers: e.target.checked })}
                className="w-4 h-4 text-gold-500 bg-navy-900 border-gold-500/30 rounded focus:ring-gold-500"
              />
              <span className="text-sm text-gold-200">Mostrar respostas corretas após conclusão</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.randomize_questions}
                onChange={(e) => setFormData({ ...formData, randomize_questions: e.target.checked })}
                className="w-4 h-4 text-gold-500 bg-navy-900 border-gold-500/30 rounded focus:ring-gold-500"
              />
              <span className="text-sm text-gold-200">Randomizar ordem das questões</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.randomize_options}
                onChange={(e) => setFormData({ ...formData, randomize_options: e.target.checked })}
                className="w-4 h-4 text-gold-500 bg-navy-900 border-gold-500/30 rounded focus:ring-gold-500"
              />
              <span className="text-sm text-gold-200">Randomizar ordem das opções</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gold-500/20">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={loading}>
            {testId ? 'Atualizar' : 'Criar'} Teste
          </Button>
        </div>
      </form>
    </Modal>
  )
}