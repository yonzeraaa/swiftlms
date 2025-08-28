'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, FileText, Edit, Trash2, ExternalLink, Check, Clock, Target, RotateCcw, BookOpen, FileCheck, Sparkles } from 'lucide-react'
import { Tables } from '@/lib/database.types'
import Card from '../../components/Card'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useTranslation } from '../../contexts/LanguageContext'
import { useToast } from '../../components/Toast'
import EmptyState from '../../components/EmptyState'
import LoadingState from '../../components/LoadingState'

type Test = Tables<'tests'>
type Course = Tables<'courses'>
type Subject = Tables<'subjects'>
type Module = Tables<'course_modules'>

export default function TestsManagementPage() {
  const [tests, setTests] = useState<Test[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTest, setEditingTest] = useState<Test | null>(null)
  const [extractingGabarito, setExtractingGabarito] = useState(false)
  const [gabaritoData, setGabaritoData] = useState<Array<{ questionNumber: number; correctAnswer: string; points?: number }>>([])
  
  const supabase = createClient()
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    google_drive_url: '',
    course_id: '',
    module_id: '',
    subject_id: '',
    duration_minutes: 60,
    passing_score: 70,
    max_attempts: 3,
    is_active: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Carregar testes
      const { data: testsData } = await supabase
        .from('tests')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Carregar cursos
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .order('title')
      
      // Carregar disciplinas
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name')
      
      // Carregar módulos
      const { data: modulesData } = await supabase
        .from('course_modules')
        .select('*')
        .order('title')

      if (testsData) setTests(testsData)
      if (coursesData) setCourses(coursesData)
      if (subjectsData) setSubjects(subjectsData)
      if (modulesData) setModules(modulesData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const extractGabarito = async () => {
    if (!formData.google_drive_url) {
      showToast('Erro: Por favor, insira a URL do Google Drive primeiro')
      return
    }

    setExtractingGabarito(true)
    try {
      const response = await fetch('/api/tests/extract-answer-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleDriveUrl: formData.google_drive_url })
      })

      const data = await response.json()
      
      if (data.success) {
        setGabaritoData(data.answerKey)
        showToast(`Sucesso: Gabarito extraído! ${data.questionCount} questões encontradas.`)
      } else {
        showToast(`Erro: ${data.error || 'Erro ao extrair gabarito'}`)
      }
    } catch (error) {
      console.error('Erro ao extrair gabarito:', error)
      showToast('Erro: Erro ao processar documento')
    } finally {
      setExtractingGabarito(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Preparar dados limpos para envio
    const cleanedData: any = {
      title: formData.title,
      description: formData.description || null,
      google_drive_url: formData.google_drive_url,
      duration_minutes: formData.duration_minutes || 60,
      passing_score: formData.passing_score || 70,
      max_attempts: formData.max_attempts || 3,
      is_active: formData.is_active
    }
    
    // Adicionar campos opcionais apenas se tiverem valor
    if (formData.course_id) cleanedData.course_id = formData.course_id
    if (formData.module_id) cleanedData.module_id = formData.module_id
    if (formData.subject_id) cleanedData.subject_id = formData.subject_id
    
    try {
      if (editingTest) {
        // Atualizar teste existente
        const { error } = await supabase
          .from('tests')
          .update(cleanedData)
          .eq('id', editingTest.id)
        
        if (error) {
          console.error('Erro ao atualizar teste:', error)
          showToast(`Erro ao atualizar teste: ${error.message}`)
          return
        }
        
        // Se houver gabarito, atualizar
        if (gabaritoData.length > 0) {
          await updateAnswerKeys(editingTest.id)
        }
        showToast('Sucesso: Teste atualizado!')
      } else {
        // Criar novo teste
        const { data: newTest, error } = await supabase
          .from('tests')
          .insert(cleanedData)
          .select()
          .single()
        
        if (error) {
          console.error('Erro ao criar teste:', error)
          showToast(`Erro ao criar teste: ${error.message}`)
          return
        }
        
        if (newTest) {
          // Salvar gabarito
          if (gabaritoData.length > 0) {
            await updateAnswerKeys(newTest.id)
          }
          showToast('Sucesso: Teste criado!')
        }
      }
      
      resetForm()
      loadData()
    } catch (error) {
      console.error('Erro ao salvar teste:', error)
      showToast('Erro: Erro ao salvar teste')
    }
  }

  const updateAnswerKeys = async (testId: string) => {
    // Deletar gabarito existente
    await supabase
      .from('test_answer_keys')
      .delete()
      .eq('test_id', testId)
    
    // Inserir novo gabarito
    const answerKeys = gabaritoData.map(item => ({
      test_id: testId,
      question_number: item.questionNumber,
      correct_answer: item.correctAnswer,
      points: item.points || 10
    }))
    
    await supabase
      .from('test_answer_keys')
      .insert(answerKeys)
  }

  const deleteTest = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este teste?')) return
    
    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', id)
    
    if (!error) {
      showToast('Sucesso: Teste excluído!')
      loadData()
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      google_drive_url: '',
      course_id: '',
      module_id: '',
      subject_id: '',
      duration_minutes: 60,
      passing_score: 70,
      max_attempts: 3,
      is_active: true
    })
    setEditingTest(null)
    setGabaritoData([])
    setShowModal(false)
  }

  const editTest = (test: Test) => {
    setFormData({
      title: test.title,
      description: test.description || '',
      google_drive_url: test.google_drive_url,
      course_id: test.course_id || '',
      module_id: test.module_id || '',
      subject_id: test.subject_id || '',
      duration_minutes: test.duration_minutes || 60,
      passing_score: test.passing_score || 70,
      max_attempts: test.max_attempts || 3,
      is_active: test.is_active ?? true
    })
    setEditingTest(test)
    setShowModal(true)
  }

  if (loading) return <LoadingState isLoading={loading}>{null}</LoadingState>

  return (
    <div className="space-y-6">
      {/* Header consistente com outras páginas */}
      <Card variant="gradient" className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-gold-400 animate-pulse" />
              {t('tests.title')}
            </h1>
            <p className="text-gold-300 mt-1">{t('tests.subtitle')}</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowModal(true)}
            icon={<Plus className="w-5 h-5" />}
          >
            {t('tests.newTest')}
          </Button>
        </div>
      </Card>

      {/* Lista de Testes */}
      <div className="grid gap-4">
        {tests.map((test) => {
          const course = courses.find(c => c.id === test.course_id)
          const subject = subjects.find(s => s.id === test.subject_id)
          
          return (
            <Card
              key={test.id}
              variant="elevated"
              className="hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gold-100 rounded-lg border border-gold-500/20">
                      <FileCheck className="w-5 h-5 text-gold-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gold">
                      {test.title}
                    </h3>
                  </div>
                  
                  {test.description && (
                    <p className="text-gold-300 mb-4 leading-relaxed">{test.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 mb-4">
                    {course && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 rounded-lg border border-gold-500/20">
                        <BookOpen className="w-4 h-4 text-gold-400" />
                        <span className="text-sm font-medium text-gold-200">{course.title}</span>
                      </div>
                    )}
                    {subject && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 rounded-lg border border-gold-500/20">
                        <FileText className="w-4 h-4 text-gold-400" />
                        <span className="text-sm font-medium text-gold-200">{subject.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gold-300">
                      <Clock className="w-4 h-4 text-gold-400" />
                      <span className="font-medium">{test.duration_minutes} {t('tests.minutes')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gold-300">
                      <Target className="w-4 h-4 text-gold-400" />
                      <span className="font-medium">{t('tests.minimum')}: {test.passing_score}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gold-300">
                      <RotateCcw className="w-4 h-4 text-gold-400" />
                      <span className="font-medium">{test.max_attempts} {t('tests.attempts')}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      test.is_active 
                        ? 'bg-green-900/30 text-green-400 border-green-500/30' 
                        : 'bg-navy-700/50 text-gold-500 border-gold-500/20'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        test.is_active ? 'bg-green-400 animate-pulse' : 'bg-gold-500'
                      }`} />
                      {test.is_active ? t('tests.active') : t('tests.inactive')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(test.google_drive_url, '_blank')}
                    icon={<ExternalLink className="w-4 h-4" />}
                    aria-label={t('tests.viewDocument')}
                  >
                    <span className="sr-only">{t('tests.viewDocument')}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => editTest(test)}
                    icon={<Edit className="w-4 h-4" />}
                    aria-label={t('tests.edit')}
                  >
                    <span className="sr-only">{t('tests.edit')}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => deleteTest(test.id)}
                    icon={<Trash2 className="w-4 h-4" />}
                    aria-label={t('tests.delete')}
                  >
                    <span className="sr-only">{t('tests.delete')}</span>
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {tests.length === 0 && (
        <EmptyState
          icon={<FileCheck className="w-12 h-12" />}
          title={t('tests.noTests')}
          description={t('tests.noTestsDescription')}
          action={{
            label: t('tests.createFirstTest'),
            onClick: () => setShowModal(true),
            variant: 'primary'
          }}
        />
      )}

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingTest ? t('tests.editTest') : t('tests.newTest')}
        size="lg"
      >

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gold-200 mb-2">
                        {t('tests.testTitle')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                        placeholder={t('tests.titlePlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gold-200 mb-2">
                        {t('tests.description')}
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                        placeholder={t('tests.descriptionPlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gold-200 mb-2">
                        {t('tests.googleDriveUrl')} *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          required
                          value={formData.google_drive_url}
                          onChange={(e) => setFormData({ ...formData, google_drive_url: e.target.value })}
                          placeholder="https://docs.google.com/document/d/..."
                          className="flex-1 px-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                        />
                        <Button
                          type="button"
                          variant="primary"
                          onClick={extractGabarito}
                          loading={extractingGabarito}
                        >
                          {extractingGabarito ? t('tests.extracting') : t('tests.extractAnswerKey')}
                        </Button>
                      </div>
                    </div>

                    {gabaritoData.length > 0 && (
                      <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-green-500 rounded-full">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold text-green-400">
                            {t('tests.answerKeyExtracted')}
                          </span>
                          <span className="text-green-300 font-medium">
                            {gabaritoData.length} {t('tests.questions')}
                          </span>
                        </div>
                        <div className="grid grid-cols-10 gap-2 text-sm">
                          {gabaritoData.map((item, index) => (
                            <div key={`gabarito-${index}-${item.questionNumber}`} className="flex items-center justify-center p-2 bg-navy-800 rounded-lg border border-gold-500/20">
                              <span className="text-gold-300 font-medium">{item.questionNumber}.</span>
                              <span className="ml-1 font-bold text-gold">{item.correctAnswer}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gold-200 mb-2">
                          {t('tests.course')}
                        </label>
                        <select
                          value={formData.course_id}
                          onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                          className="w-full px-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                        >
                          <option value="">{t('tests.select')}</option>
                          {courses.map(course => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gold-200 mb-2">
                          {t('tests.subject')}
                        </label>
                        <select
                          value={formData.subject_id}
                          onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                          className="w-full px-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                        >
                          <option value="">{t('tests.select')}</option>
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
                        <label className="block text-sm font-semibold text-gold-200 mb-2">
                          {t('tests.duration')}
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                          <input
                            type="number"
                            value={formData.duration_minutes || ''}
                            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                            min="1"
                            className="w-full pl-11 pr-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gold-200 mb-2">
                          {t('tests.passingScore')}
                        </label>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                          <input
                            type="number"
                            value={formData.passing_score || ''}
                            onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 70 })}
                            min="0"
                            max="100"
                            className="w-full pl-11 pr-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gold-200 mb-2">
                          {t('tests.maxAttempts')}
                        </label>
                        <div className="relative">
                          <RotateCcw className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                          <input
                            type="number"
                            value={formData.max_attempts || ''}
                            onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 3 })}
                            min="1"
                            className="w-full pl-11 pr-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-navy-700 rounded-xl border border-gold-500/20">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 text-gold-600 focus:ring-gold-500 border-2 border-gold-500/30 rounded bg-navy-900/50"
                      />
                      <label htmlFor="is_active" className="text-sm font-semibold text-gold-200 cursor-pointer">
                        {t('tests.testActive')}
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gold-500/20">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetForm}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                    >
                      {editingTest ? t('tests.updateTest') : t('tests.createTest')}
                    </Button>
                  </div>
                </form>
      </Modal>
    </div>
  )
}