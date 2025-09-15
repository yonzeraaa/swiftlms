'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, FileText, Edit, Trash2, ExternalLink, Check, Clock, Target, RotateCcw, BookOpen, FileCheck, Sparkles, MoreVertical, Search, Filter, X, Eye, EyeOff, MessageSquare } from 'lucide-react'
import { Tables } from '@/lib/database.types'
import Card from '../../components/Card'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useTranslation } from '../../contexts/LanguageContext'
import { useToast } from '../../components/Toast'
import EmptyState from '../../components/EmptyState'
import { SkeletonCard } from '../../components/Skeleton'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Spinner from '../../components/ui/Spinner'
import { Chip } from '../../components/Badge'

type Test = Tables<'tests'> & { answer_key_count?: number }
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
  const [gabaritoData, setGabaritoData] = useState<Array<{ questionNumber: number; correctAnswer: string; points?: number; justification?: string }>>([])
  const [showJustifications, setShowJustifications] = useState(false)
  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false)
  const [viewingAnswerKey, setViewingAnswerKey] = useState<Array<{ question_number: number; correct_answer: string; points?: number; justification?: string | null }> | null>(null)
  const [viewingTestTitle, setViewingTestTitle] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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
      
      // Carregar contagem de gabaritos para cada teste
      if (testsData) {
        const testsWithAnswerKeys = await Promise.all(
          testsData.map(async (test: any) => {
            const { count } = await supabase
              .from('test_answer_keys')
              .select('*', { count: 'exact', head: true })
              .eq('test_id', test.id)
            
            return { ...test, answer_key_count: count || 0 }
          })
        )
        setTests(testsWithAnswerKeys)
      }
      
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

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (test.description && test.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCourse = filterCourse === 'all' || test.course_id === filterCourse
    const matchesSubject = filterSubject === 'all' || test.subject_id === filterSubject
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && test.is_active) ||
      (filterStatus === 'inactive' && !test.is_active)
    
    return matchesSearch && matchesCourse && matchesSubject && matchesStatus
  })

  const handleDropdownClick = (e: React.MouseEvent, testId: string) => {
    e.stopPropagation()
    setOpenDropdown(openDropdown === testId ? null : testId)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Verifica se o clique foi fora de todos os dropdowns
      const target = event.target as Node
      const isInsideDropdown = Object.values(dropdownRefs.current).some(ref => {
        return ref && (ref.contains(target) || ref.parentElement?.contains(target))
      })
      
      if (openDropdown && !isInsideDropdown) {
        setOpenDropdown(null)
      }
    }

    // Usar 'click' ao invés de 'mousedown' para melhor compatibilidade
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openDropdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    
    // Validar gabarito
    if (gabaritoData.length === 0) {
      showToast('Aviso: Nenhum gabarito foi extraído. Por favor, extraia o gabarito do documento.')
      setCreating(false)
      return
    }
    
    // Verificar se o gabarito está completo
    const questionNumbers = gabaritoData.map(item => item.questionNumber).sort((a, b) => a - b)
    const maxQuestion = Math.max(...questionNumbers)
    const missingQuestions = []
    
    for (let i = 1; i <= maxQuestion; i++) {
      if (!questionNumbers.includes(i)) {
        missingQuestions.push(i)
      }
    }
    
    if (missingQuestions.length > 0) {
      const confirm = window.confirm(`Atenção: Gabarito incompleto! Faltam as questões: ${missingQuestions.join(', ')}. Deseja continuar mesmo assim?`)
      if (!confirm) {
        setCreating(false)
        return
      }
    }
    
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
        setUpdating(true)
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
        
        // Sempre atualizar o gabarito
        await updateAnswerKeys(editingTest.id)
        console.log(`Gabarito atualizado: ${gabaritoData.length} questões salvas`)
        showToast(`Sucesso: Teste e gabarito atualizados! (${gabaritoData.length} questões)`)
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
          await updateAnswerKeys(newTest.id)
          console.log(`Gabarito salvo: ${gabaritoData.length} questões`)
          showToast(`Sucesso: Teste criado com gabarito! (${gabaritoData.length} questões)`)
        }
      }
      
      resetForm()
      loadData()
    } catch (error) {
      console.error('Erro ao salvar teste:', error)
      showToast('Erro: Erro ao salvar teste')
      setError('Erro ao salvar teste')
    } finally {
      setCreating(false)
      setUpdating(false)
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
      points: item.points || 10,
      justification: (item as any).justification || null
    }))
    
    await supabase
      .from('test_answer_keys')
      .insert(answerKeys)
  }

  const deleteTest = async (id: string) => {
    console.log('Função deleteTest chamada com ID:', id)
    
    const confirmDelete = confirm('Tem certeza que deseja excluir este teste?')
    console.log('Usuário confirmou exclusão:', confirmDelete)
    
    if (!confirmDelete) {
      console.log('Exclusão cancelada pelo usuário')
      return
    }
    
    console.log('Iniciando processo de exclusão do teste:', id)
    
    try {
      // Primeiro deletar registros relacionados
      console.log('1. Deletando answer keys...')
      const { error: answerKeysError } = await supabase
        .from('test_answer_keys')
        .delete()
        .eq('test_id', id)
      
      if (answerKeysError) {
        console.error('Erro ao deletar answer keys:', answerKeysError)
        // Continuar mesmo com erro, pois pode não haver answer keys
      }
      
      console.log('2. Deletando attempts...')
      const { error: attemptsError } = await supabase
        .from('test_attempts')
        .delete()
        .eq('test_id', id)
      
      if (attemptsError) {
        console.error('Erro ao deletar attempts:', attemptsError)
        // Continuar mesmo com erro, pois pode não haver attempts
      }
      
      console.log('3. Deletando grades...')
      const { error: gradesError } = await supabase
        .from('test_grades')
        .delete()
        .eq('test_id', id)
      
      if (gradesError) {
        console.error('Erro ao deletar grades:', gradesError)
        // Continuar mesmo com erro, pois pode não haver grades
      }
      
      // Por último, deletar o teste
      console.log('4. Deletando o teste principal...')
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', id)
      
      console.log('Resultado da exclusão do teste:', error ? 'ERRO' : 'SUCESSO', error)
      
      if (!error) {
        console.log('Teste excluído com sucesso!')
        // Atualizar estado local removendo o teste excluído
        setTests(prevTests => prevTests.filter(test => test.id !== id))
        showToast('Sucesso: Teste excluído!')
        // NÃO recarregar dados se a exclusão foi bem sucedida
      } else {
        console.error('ERRO AO EXCLUIR TESTE:', error)
        showToast(`Erro ao excluir teste: ${error.message}`)
        // Recarregar dados apenas em caso de erro
        await loadData()
      }
    } catch (err) {
      console.error('Erro inesperado ao excluir teste:', err)
      showToast('Erro ao excluir teste!')
      // Recarregar dados em caso de erro
      await loadData()
    }
    
    console.log('Função deleteTest finalizada')
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
    setShowJustifications(false)
    setShowModal(false)
  }

  const viewAnswerKey = async (test: Test) => {
    try {
      // Buscar gabarito do teste
      const { data: answerKeys, error } = await supabase
        .from('test_answer_keys')
        .select('*')
        .eq('test_id', test.id)
        .order('question_number')
      
      if (error) {
        showToast('Erro ao buscar gabarito')
        return
      }
      
      if (!answerKeys || answerKeys.length === 0) {
        showToast('Este teste ainda não possui gabarito cadastrado')
        return
      }
      
      setViewingAnswerKey(answerKeys)
      setViewingTestTitle(test.title)
      setShowAnswerKeyModal(true)
    } catch (error) {
      console.error('Erro ao buscar gabarito:', error)
      showToast('Erro ao buscar gabarito')
    }
  }

  const editTest = async (test: Test) => {
    console.log('Abrindo modal de edição para teste:', test.id)
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
    
    // Carregar gabarito existente
    const { data: answerKeys } = await supabase
      .from('test_answer_keys')
      .select('*')
      .eq('test_id', test.id)
      .order('question_number')
    
    if (answerKeys && answerKeys.length > 0) {
      const formattedGabarito = answerKeys.map((key: any) => ({
        questionNumber: key.question_number,
        correctAnswer: key.correct_answer,
        points: key.points || 10
      }))
      setGabaritoData(formattedGabarito)
      console.log(`Gabarito carregado: ${answerKeys.length} questões`)
    } else {
      setGabaritoData([])
      console.log('Nenhum gabarito encontrado para este teste')
    }
    
    setEditingTest(test)
    setShowModal(true)
    console.log('Modal deve estar visível:', true)
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />
      {/* Header com busca e filtros */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
          <FileCheck className="w-8 h-8 text-gold-400" />
          {t('tests.title')}
        </h1>
        <Button
          variant="primary"
          onClick={() => setShowModal(true)}
          icon={<Plus className="w-5 h-5 flex-shrink-0" />}
        >
          {t('tests.newTest')}
        </Button>
      </div>

      {/* Barra de busca e filtros */}
      <Card variant="elevated" className="mb-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gold-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar testes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              icon={<Filter className="w-5 h-5 flex-shrink-0" />}
            >
              Filtros ({filteredTests.length})
            </Button>
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="pt-4 border-t border-gold-500/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">Curso</label>
                  <select
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    className="w-full px-4 py-2 bg-navy-800 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="all">Todos os cursos</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">Disciplina</label>
                  <select
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="w-full px-4 py-2 bg-navy-800 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="all">Todas as disciplinas</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-navy-800 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Lista de Testes */}
      {loading ? (
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid gap-4">
        {filteredTests.map((test) => {
          const course = courses.find(c => c.id === test.course_id)
          const subject = subjects.find(s => s.id === test.subject_id)
          
          return (
            <Card
              key={test.id}
              variant="elevated"
              hoverable
              className="relative"
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
                        <BookOpen className="w-5 h-5 text-gold-400" />
                        <span className="text-sm font-medium text-gold-200">{course.title}</span>
                      </div>
                    )}
                    {subject && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 rounded-lg border border-gold-500/20">
                        <FileText className="w-5 h-5 text-gold-400" />
                        <span className="text-sm font-medium text-gold-200">{subject.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gold-300">
                      <Clock className="w-5 h-5 text-gold-400" />
                      <span className="font-medium">{test.duration_minutes} {t('tests.minutes')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gold-300">
                      <Target className="w-5 h-5 text-gold-400" />
                      <span className="font-medium">{t('tests.minimum')}: {test.passing_score}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gold-300">
                      <RotateCcw className="w-5 h-5 text-gold-400" />
                      <span className="font-medium">{test.max_attempts} {t('tests.attempts')}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Chip
                      label={test.is_active ? t('tests.active') : t('tests.inactive')}
                      color={test.is_active ? 'green' : 'gold'}
                    />
                    {test.answer_key_count !== undefined && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                        test.answer_key_count > 0 
                          ? 'bg-green-900/30 border-green-500/30' 
                          : 'bg-red-900/30 border-red-500/30'
                      }`}>
                        {test.answer_key_count > 0 ? (
                          <>
                            <Check className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-medium text-green-400">
                              Gabarito: {test.answer_key_count} questões
                            </span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-red-400">
                              Sem gabarito
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-20">
                  <button
                    ref={el => {
                      if (el) dropdownRefs.current[test.id] = el
                    }}
                    onClick={(e) => handleDropdownClick(e, test.id)}
                    className="p-2 hover:bg-navy-700 rounded-lg transition-colors border border-transparent hover:border-gold-500/30"
                    aria-label="Abrir menu de ações do teste"
                    type="button"
                  >
                    <MoreVertical className="w-5 h-5 text-gold-400" />
                  </button>
                  
                  {openDropdown === test.id && (
                    <div className="absolute right-0 mt-2 w-56 bg-navy-800 rounded-lg shadow-xl border border-gold-500/20 z-50 pointer-events-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(test.google_drive_url, '_blank')
                          setOpenDropdown(null)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-navy-700/50 transition-colors block"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <ExternalLink className="w-4 h-4 text-gold-400 flex-shrink-0" />
                          <span className="text-gold-200 text-left flex-1">Ver Documento</span>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenDropdown(null)
                          viewAnswerKey(test)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-navy-700/50 transition-colors block"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <FileCheck className="w-4 h-4 text-gold-400 flex-shrink-0" />
                          <span className="text-gold-200 text-left flex-1">Ver Gabarito</span>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          console.log('Editando teste:', test.id)
                          setOpenDropdown(null)
                          editTest(test)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-navy-700/50 transition-colors block"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <Edit className="w-4 h-4 text-gold-400 flex-shrink-0" />
                          <span className="text-gold-200 text-left flex-1">Editar</span>
                        </div>
                      </button>
                      <div className="border-t border-gold-500/20 mt-2 pt-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            setOpenDropdown(null)
                            // Chamar a função deleteTest diretamente
                            await deleteTest(test.id)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-red-900/20 transition-colors block"
                          type="button"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <Trash2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span className="text-red-400 text-left flex-1">Excluir</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      )}

      {!loading && filteredTests.length === 0 && (
        <EmptyState
          icon={<FileCheck className="w-12 h-12 flex-shrink-0" />}
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
                        className="w-full px-4 py-2 bg-navy-800/50 border border-gold-500/20 rounded-xl text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
                        className="w-full px-4 py-2 bg-navy-800/50 border border-gold-500/20 rounded-xl text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
                          className="flex-1 px-4 py-2 bg-navy-800/50 border border-gold-500/20 rounded-xl text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
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
                          {gabaritoData.some(item => item.justification) && (
                            <button
                              type="button"
                              onClick={() => setShowJustifications(!showJustifications)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 rounded-lg border border-gold-500/30 transition-colors"
                            >
                              {showJustifications ? (
                                <>
                                  <EyeOff className="w-4 h-4 text-gold-400" />
                                  <span className="text-sm text-gold-300">Ocultar Justificativas</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 text-gold-400" />
                                  <span className="text-sm text-gold-300">Ver Justificativas</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        {!showJustifications ? (
                          <div className="grid grid-cols-10 gap-2 text-sm">
                            {gabaritoData.map((item, index) => (
                              <div key={`gabarito-${index}-${item.questionNumber}`} className="flex items-center justify-center p-2 bg-navy-800 rounded-lg border border-gold-500/20">
                                <span className="text-gold-300 font-medium">{item.questionNumber}.</span>
                                <span className="ml-1 font-bold text-gold">{item.correctAnswer}</span>
                                {item.justification && (
                                  <MessageSquare className="w-3 h-3 text-green-400 ml-1" />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {gabaritoData.map((item, index) => (
                              <div key={`gabarito-detail-${index}-${item.questionNumber}`} className="p-3 bg-navy-800 rounded-lg border border-gold-500/20">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-gold-400 font-semibold">Questão {item.questionNumber}</span>
                                  <span className="px-2 py-1 bg-gold-500/20 text-gold-300 rounded font-bold">{item.correctAnswer}</span>
                                  {item.points && (
                                    <span className="text-sm text-gold-300/70">({item.points} pontos)</span>
                                  )}
                                </div>
                                {item.justification && (
                                  <div className="mt-2 p-2 bg-navy-900/50 rounded border border-green-500/20">
                                    <div className="flex items-start gap-2">
                                      <MessageSquare className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                      <p className="text-sm text-gray-300">{item.justification}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
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
                            className="w-full pl-11 pr-4 py-2 bg-navy-800/50 border border-gold-500/20 rounded-xl text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
                            className="w-full pl-11 pr-4 py-2 bg-navy-800/50 border border-gold-500/20 rounded-xl text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
                            className="w-full pl-11 pr-4 py-2 bg-navy-800/50 border border-gold-500/20 rounded-xl text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
                      loading={creating || updating}
                      disabled={creating || updating}
                    >
                      {editingTest ? t('tests.updateTest') : t('tests.createTest')}
                    </Button>
                  </div>
                </form>
      </Modal>

      {/* Modal para visualizar gabarito com justificativas */}
      <Modal
        isOpen={showAnswerKeyModal}
        onClose={() => {
          setShowAnswerKeyModal(false)
          setViewingAnswerKey(null)
          setViewingTestTitle('')
        }}
        title={`Gabarito: ${viewingTestTitle}`}
        size="lg"
      >
        {viewingAnswerKey && viewingAnswerKey.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-gold-400" />
                <span className="text-gold-300 font-semibold">
                  Total de {viewingAnswerKey.length} questões
                </span>
              </div>
              <button
                onClick={() => setShowJustifications(!showJustifications)}
                className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 rounded-lg border border-gold-500/30 transition-colors"
              >
                {showJustifications ? (
                  <>
                    <EyeOff className="w-4 h-4 text-gold-400" />
                    <span className="text-sm text-gold-300">Ocultar Justificativas</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-gold-400" />
                    <span className="text-sm text-gold-300">Mostrar Justificativas</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Grade compacta do gabarito */}
            {!showJustifications && (
              <div className="grid grid-cols-10 gap-2">
                {viewingAnswerKey.map((item, index) => (
                  <div 
                    key={`key-${item.question_number}-${index}`}
                    className="flex items-center justify-center p-2 bg-navy-800 rounded-lg border border-gold-500/20"
                  >
                    <span className="text-gold-300 font-medium">{item.question_number}.</span>
                    <span className="ml-1 font-bold text-gold">{item.correct_answer}</span>
                    {item.justification && (
                      <MessageSquare className="w-3 h-3 text-green-400 ml-1" />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Visualização detalhada com justificativas */}
            {showJustifications && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {viewingAnswerKey.map((item, index) => (
                  <div 
                    key={`detail-${item.question_number}-${index}`}
                    className="p-4 bg-navy-800 rounded-lg border border-gold-500/20"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-gold-400 font-semibold">
                        Questão {item.question_number}
                      </span>
                      <span className="px-3 py-1 bg-gold-500/20 text-gold-300 rounded font-bold">
                        {item.correct_answer}
                      </span>
                      {item.points && (
                        <span className="text-sm text-gold-300/70">
                          ({item.points} pontos)
                        </span>
                      )}
                    </div>
                    
                    {item.justification && (
                      <div className="mt-3 p-3 bg-navy-900/50 rounded border border-green-500/20">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-green-400 mb-1">
                              Justificativa:
                            </p>
                            <p className="text-sm text-gray-300">
                              {item.justification}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-gold-500/20">
              <Button
                onClick={() => {
                  setShowAnswerKeyModal(false)
                  setViewingAnswerKey(null)
                  setViewingTestTitle('')
                }}
                variant="secondary"
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <p className="text-gold-300 text-left">Nenhum gabarito encontrado para este teste.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
