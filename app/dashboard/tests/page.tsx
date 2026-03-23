'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, ExternalLink, Check, Clock, Target, RotateCcw, FileCheck, Search, Filter, X, Eye, EyeOff, MessageSquare, Square, CheckSquare, PlayCircle } from 'lucide-react'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'
import { Tables } from '@/lib/database.types'
import Card from '../../components/Card'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useTranslation } from '../../contexts/LanguageContext'
import { useToast } from '../../components/Toast'
import Spinner from '../../components/ui/Spinner'
import { Chip } from '../../components/Badge'
import {
  getTestsData,
  createTest,
  updateTest,
  deleteTest,
  bulkDeleteTests,
  updateTestAnswerKeys,
  getTestAnswerKeys
} from '@/lib/actions/admin-tests'

type Test = Tables<'tests'> & { answer_key_count?: number }
type Course = Tables<'courses'>
type Subject = Tables<'subjects'>
type Module = Tables<'course_modules'>

export default function TestsManagementPage() {
  const [tests, setTests] = useState<Test[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [lessonsCount, setLessonsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTest, setEditingTest] = useState<Test | null>(null)
  const [extractingGabarito, setExtractingGabarito] = useState(false)
  const [gabaritoData, setGabaritoData] = useState<Array<{ questionNumber: number; correctAnswer: string; points?: number; justification?: string }>>([])
  const [showJustifications, setShowJustifications] = useState(false)
  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false)
  const [viewingAnswerKey, setViewingAnswerKey] = useState<Array<{ question_number: number; correct_answer: string; points?: number; justification?: string | null }> | null>(null)
  const [viewingTestTitle, setViewingTestTitle] = useState('')
  const [codeFilter, setCodeFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [testSortMode, setTestSortMode] = useState<'code' | 'title'>('code')

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
      const data = await getTestsData()

      if (!data) {
        console.error('Erro ao carregar dados de testes')
        return
      }

      setTests(data.tests)
      setCourses(data.courses)
      setSubjects(data.subjects)
      setModules(data.modules)
      setLessonsCount(data.lessonsCount)
      setSelectedTests([])
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
    if (codeFilter && !test.code?.toLowerCase().includes(codeFilter.toLowerCase())) return false

    if (searchTerm) {
      const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (test.description && test.description.toLowerCase().includes(searchTerm.toLowerCase()))
      if (!matchesSearch) return false
    }

    const matchesCourse = filterCourse === 'all' || test.course_id === filterCourse
    const matchesSubject = filterSubject === 'all' || test.subject_id === filterSubject
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && test.is_active) ||
      (filterStatus === 'inactive' && !test.is_active)

    return matchesCourse && matchesSubject && matchesStatus
  })

  const sortedTests = useMemo(() => {
    const list = [...filteredTests]

    if (testSortMode === 'code') {
      return list.sort((a, b) => {
        const codeA = a.code || a.title
        const codeB = b.code || b.title
        return codeA.localeCompare(codeB, 'pt-BR', { sensitivity: 'base', numeric: true })
      })
    }

    return list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }))
  }, [filteredTests, testSortMode])

  const anySelection = selectedTests.length > 0
  const allFilteredSelected = filteredTests.length > 0 && filteredTests.every(test => selectedTests.includes(test.id))

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev =>
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    )
  }

  const toggleSelectAllFiltered = () => {
    if (filteredTests.length === 0) return

    if (allFilteredSelected) {
      const filteredIds = new Set(filteredTests.map(test => test.id))
      setSelectedTests(prev => prev.filter(id => !filteredIds.has(id)))
      return
    }

    const filteredIds = filteredTests.map(test => test.id)
    setSelectedTests(prev => {
      const current = new Set(prev)
      filteredIds.forEach(id => current.add(id))
      return Array.from(current)
    })
  }

  useEffect(() => {
    setSelectedTests(prev => prev.filter(id => tests.some(test => test.id === id)))
  }, [tests])

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
      let testId: string

      if (editingTest) {
        setUpdating(true)
        const result = await updateTest(editingTest.id, cleanedData)

        if (!result.success) {
          showToast(`Erro ao atualizar teste: ${result.error}`)
          return
        }

        testId = editingTest.id
      } else {
        const result = await createTest(cleanedData)

        if (!result.success || !result.testId) {
          showToast(`Erro ao criar teste: ${result.error}`)
          return
        }

        testId = result.testId
      }

      const answerKeysResult = await updateTestAnswerKeys(testId, gabaritoData)

      if (!answerKeysResult.success) {
        showToast(`Aviso: Teste salvo mas houve erro ao salvar gabarito: ${answerKeysResult.error}`)
      } else {
        showToast(`Sucesso: Teste ${editingTest ? 'atualizado' : 'criado'} com gabarito! (${gabaritoData.length} questões)`)
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

  const performDeleteTests = async (testIds: string[]) => {
    if (testIds.length === 0) return

    setBulkDeleting(true)
    try {
      const result = await bulkDeleteTests(testIds)

      if (!result.success) {
        showToast(`Erro ao excluir testes: ${result.error}`)
        await loadData()
        return
      }

      setTests(prev => prev.filter(test => !testIds.includes(test.id)))
      setSelectedTests(prev => prev.filter(id => !testIds.includes(id)))

      if (testIds.length > 1) {
        showToast(`Sucesso: ${testIds.length} testes excluídos!`)
      } else {
        showToast('Sucesso: Teste excluído!')
      }
    } catch (error) {
      console.error('Erro inesperado ao excluir testes:', error)
      showToast('Erro inesperado ao excluir testes')
    } finally {
      setBulkDeleting(false)
    }
  }

  const deleteTest = async (id: string) => {
    if (bulkDeleting) return

    const confirmDelete = confirm('Tem certeza que deseja excluir este teste?')
    if (!confirmDelete) {
      return
    }

    await performDeleteTests([id])
  }

  const handleBulkDelete = async () => {
    if (!anySelection || bulkDeleting) return

    const confirmDelete = confirm(
      `Tem certeza que deseja excluir ${selectedTests.length} teste(s) selecionado(s)? Esta ação não pode ser desfeita.`
    )

    if (!confirmDelete) return

    await performDeleteTests(selectedTests)
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
      const response = await fetch(`/api/tests/${test.id}/sync-answer-key`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        showToast(data.error || 'Erro ao sincronizar gabarito')
        return
      }

      if (!data.answerKey || data.answerKey.length === 0) {
        showToast('Este teste ainda não possui gabarito cadastrado')
        return
      }

      if (data.updated) {
        showToast('Gabarito atualizado a partir do Google Drive!')
      }

      setViewingAnswerKey(data.answerKey)
      setViewingTestTitle(test.title)
      setShowAnswerKeyModal(true)
    } catch (error) {
      console.error('Erro ao sincronizar gabarito:', error)
      showToast('Erro ao sincronizar gabarito')
    }
  }

  const editTest = async (test: Test) => {
    console.log('Abrindo modal de edição para teste:', test.id)
    try {
      await fetch(`/api/tests/${test.id}/sync-answer-key`, { method: 'POST' })
    } catch (error) {
      console.warn('Falha ao sincronizar gabarito antes da edição', error)
    }
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

    const answerKeys = await getTestAnswerKeys(test.id)

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
    <div className="max-w-[1400px] mx-auto p-6 md:p-10 space-y-8 bg-[#faf6ee] min-h-screen font-[family-name:var(--font-lora)] text-[#1e130c]">
      {/* Header com busca e filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#1e130c', lineHeight: 1.1, fontWeight: 700 }}>
            {t('tests.title')}
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: '#7a6350', marginTop: '0.5rem' }}>
            Gerencie e avalie as avaliações do sistema.
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color="#1e130c" />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end">
            {anySelection && (
              <span className="text-xs uppercase tracking-widest text-[#7a6350] bg-[#8b6d22]/5 border border-[#8b6d22]/20 px-3 py-1 font-bold">
                {selectedTests.length} selecionado(s)
              </span>
            )}
            {anySelection && (
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                loading={bulkDeleting}
                disabled={bulkDeleting}
                icon={<Trash2 className="w-4 h-4 flex-shrink-0" />}
              >
                Excluir
              </Button>
            )}
            <button
              onClick={() => setShowModal(true)}
              disabled={bulkDeleting}
              style={{ padding: '1rem 3rem', backgroundColor: '#1e130c', color: '#faf6ee', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              {t('tests.newTest')}
            </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-8 font-[family-name:var(--font-lora)] text-[#1e130c] mb-10 justify-center md:justify-start border-b border-dashed border-[#1e130c]/20 pb-8">
        <div className="flex flex-col items-center">
          <span className="text-[#7a6350] text-xs uppercase tracking-widest mb-1 font-semibold">Total de Testes</span>
          <span className="text-3xl font-[family-name:var(--font-playfair)] font-bold text-[#1e130c]">{tests.length}</span>
        </div>
        <div className="w-px bg-[#1e130c]/20"></div>
        <div className="flex flex-col items-center">
          <span className="text-[#7a6350] text-xs uppercase tracking-widest mb-1 font-semibold">Testes Ativos</span>
          <span className="text-3xl font-[family-name:var(--font-playfair)] font-bold text-[#1e130c] font-bold/80">{tests.filter(t => t.is_active).length}</span>
        </div>
        <div className="w-px bg-[#1e130c]/20"></div>
        <div className="flex flex-col items-center">
          <span className="text-[#7a6350] text-xs uppercase tracking-widest mb-1 font-semibold">Total de Aulas</span>
          <span className="text-3xl font-[family-name:var(--font-playfair)] font-bold text-[#1e130c]">{lessonsCount}</span>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="mb-10 p-6 bg-[#faf6ee]/50 border border-[#1e130c]/10 relative">

        <div className="space-y-6">
          <div className="flex flex-wrap gap-6">
            <div className="relative w-full md:w-48 shrink-0">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-[#8b6d22] w-4 h-4" />
              <input
                type="text"
                placeholder="Código (Ex: XXXX123)"
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                className="w-full pl-6 pr-0 py-2 bg-transparent border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:outline-none focus:border-[color:var(--color-focus)] font-mono text-sm transition-colors"
              />
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-[#8b6d22] w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-6 pr-0 py-2 bg-transparent border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:outline-none focus:border-[color:var(--color-focus)] font-[family-name:var(--font-lora)] text-sm transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-[family-name:var(--font-lora)] text-sm">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#8b6d22] flex-shrink-0" />
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="bg-transparent border-b border-[#1e130c]/30 text-[#1e130c] focus:outline-none focus:border-[color:var(--color-focus)] py-1 cursor-pointer"
              >
                <option value="all">Todos os cursos</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#8b6d22] flex-shrink-0" />
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-transparent border-b border-[#1e130c]/30 text-[#1e130c] focus:outline-none focus:border-[color:var(--color-focus)] py-1 cursor-pointer"
              >
                <option value="all">Todas as disciplinas</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#8b6d22] flex-shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent border-b border-[#1e130c]/30 text-[#1e130c] focus:outline-none focus:border-[color:var(--color-focus)] py-1 cursor-pointer"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-widest pt-4 border-t border-dashed border-[#1e130c]/20">
            <span className="text-[#7a6350] font-bold">Ordenar por:</span>
            <button
              type="button"
              onClick={() => setTestSortMode('code')}
              className={`pb-1 border-b-2 transition-all ${
                testSortMode === 'code'
                  ? 'border-[#8b6d22] text-[#1e130c] font-bold'
                  : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
              }`}
            >
              Código
            </button>
            <button
              type="button"
              onClick={() => setTestSortMode('title')}
              className={`pb-1 border-b-2 transition-all ${
                testSortMode === 'title'
                  ? 'border-[#8b6d22] text-[#1e130c] font-bold'
                  : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
              }`}
            >
              Título
            </button>
          </div>
        </div>
      </div>

      {(codeFilter || filterCourse !== 'all' || filterSubject !== 'all' || filterStatus !== 'all' || searchTerm !== '') && (
        <p className="text-sm text-[#7a6350] font-[family-name:var(--font-lora)] italic mb-4">
          Mostrando {filteredTests.length} de {tests.length} testes
        </p>
      )}

      {/* Tabela -> Lista de Diretório Clássico */}
      {loading ? (
        <Spinner fullPage size="xl" />
      ) : (
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-[#1e130c] mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAllFiltered}
              className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
              title={allFilteredSelected ? 'Deselecionar todos' : 'Selecionar todos'}
            >
              {allFilteredSelected && filteredTests.length > 0 ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1e130c]">Testes</span>
          </div>
        </div>

        {sortedTests.length > 0 ? (
          <div className="space-y-0">
            {sortedTests.map((test) => {
              const subject = subjects.find(s => s.id === test.subject_id)
              const isSelected = selectedTests.includes(test.id)

              return (
                <div key={test.id} className="flex flex-col md:flex-row md:items-center justify-between py-4 border-b border-dashed border-[#1e130c]/20 hover:bg-[#1e130c]/5 px-2 -mx-2 transition-colors group">
                  <div className="flex items-start gap-4 mb-3 md:mb-0">
                    <button
                      onClick={() => toggleTestSelection(test.id)}
                      className="text-[#8b6d22] hover:text-[#1e130c] transition-colors mt-1"
                    >
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1e130c]">{test.title}</span>
                        <span className="text-[#8b6d22] font-mono text-xs border border-[#8b6d22]/30 px-1">{test.code || 'S/C'}</span>
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${test.is_active ? 'bg-[#1e130c]/5 text-[#1e130c] font-bold' : 'bg-orange-100 text-orange-700'}`}>
                          {test.is_active ? t('tests.active') : t('tests.inactive')}
                        </span>
                      </div>
                      <div className="font-[family-name:var(--font-lora)] text-sm text-[#7a6350] flex items-center gap-4 opacity-90 flex-wrap">
                        <span><strong className="font-semibold text-[#1e130c]">Disciplina:</strong> {subject ? subject.name : '-'}</span>
                        <span className="w-1 h-1 rounded-full bg-[#1e130c]/20"></span>
                        <span><strong className="font-semibold text-[#1e130c]">Duração:</strong> {test.duration_minutes ? `${test.duration_minutes}m` : '-'}</span>
                        <span className="w-1 h-1 rounded-full bg-[#1e130c]/20"></span>
                        <span><strong className="font-semibold text-[#1e130c]">Aprovação:</strong> {test.passing_score != null ? `${test.passing_score}%` : '-'}</span>
                        <span className="w-1 h-1 rounded-full bg-[#1e130c]/20"></span>
                        <span>
                          <strong className="font-semibold text-[#1e130c]">Gabarito: </strong> 
                          {test.answer_key_count !== undefined ? (
                            test.answer_key_count > 0 ? (
                              <span className="text-[#1e130c] font-bold font-bold">{test.answer_key_count} questões</span>
                            ) : (
                              <span className="text-[#7a6350] italic font-bold">Sem gabarito</span>
                            )
                          ) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity pl-9 md:pl-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(test.google_drive_url, '_blank')}
                      title="Ver Documento"
                      className="!bg-transparent border-[#1e130c]/20 hover:border-[#8b6d22] text-[#1e130c]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => viewAnswerKey(test)}
                      title="Ver Gabarito"
                      className="!bg-transparent border-[#1e130c]/20 hover:border-[#8b6d22] text-[#1e130c]"
                    >
                      <FileCheck className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => editTest(test)}
                      title="Editar"
                      className="!bg-transparent border-[#1e130c]/20 hover:border-[#8b6d22] text-[#1e130c]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        if (!confirm(`Excluir o teste "${test.title}"?`)) return
                        await deleteTest(test.id)
                      }}
                      title="Excluir"
                      disabled={bulkDeleting}
                      className="!bg-transparent border-[#1e130c]/20 hover:border-red-500 text-[#7a6350] italic"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-16 text-center border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/30">
            <FileCheck className="w-12 h-12 text-[#8b6d22]/50 mx-auto mb-4" />
            <p className="text-[#7a6350] font-[family-name:var(--font-lora)] italic text-lg">
              {searchTerm ? 'Nenhum teste encontrado com os critérios de busca' : t('tests.noTests')}
            </p>
          </div>
        )}
      </div>
      )}

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingTest ? t('tests.editTest') : t('tests.newTest')}
        size="lg"
      >
        <div className="relative font-[family-name:var(--font-lora)] text-[#1e130c]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-[#7a6350] mb-2">
                {t('tests.testTitle')} <span className="text-[#7a6350] italic">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-transparent border-b border-[#1e130c]/30 py-2 focus:outline-none focus:border-[color:var(--color-focus)] transition-colors font-[family-name:var(--font-playfair)] text-xl text-[#1e130c]"
                placeholder={t('tests.titlePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-[#7a6350] mb-2">
                {t('tests.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full bg-transparent border-b border-[#1e130c]/30 py-2 focus:outline-none focus:border-[color:var(--color-focus)] transition-colors resize-y italic text-[#1e130c]"
                placeholder={t('tests.descriptionPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-[#7a6350] mb-2">
                {t('tests.googleDriveUrl')} <span className="text-[#7a6350] italic">*</span>
              </label>
              <div className="flex gap-4 items-end">
                <input
                  type="url"
                  required
                  value={formData.google_drive_url}
                  onChange={(e) => setFormData({ ...formData, google_drive_url: e.target.value })}
                  placeholder="https://docs.google.com/document/d/..."
                  className="flex-1 bg-transparent border-b border-[#1e130c]/30 py-2 focus:outline-none focus:border-[color:var(--color-focus)] transition-colors font-mono text-sm text-[#1e130c]"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={extractGabarito}
                  loading={extractingGabarito}
                  className="uppercase tracking-widest text-xs py-2"
                >
                  {extractingGabarito ? t('tests.extracting') : t('tests.extractAnswerKey')}
                </Button>
              </div>
            </div>

            {gabaritoData.length > 0 && (
              <div className="p-5 bg-[#8b6d22]/5 border border-[#8b6d22]/30 relative text-[#1e130c]">
                <div className="flex items-center justify-between mb-4 border-b border-dashed border-[#8b6d22]/30 pb-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-[#1e130c] font-bold" />
                    <span className="font-bold font-[family-name:var(--font-playfair)] text-lg text-[#1e130c]">
                      {t('tests.answerKeyExtracted')}
                    </span>
                    <span className="text-[#7a6350] font-bold text-sm bg-white px-2 py-0.5 border border-[#8b6d22]/20">
                      {gabaritoData.length} {t('tests.questions')}
                    </span>
                  </div>
                  {gabaritoData.some(item => item.justification) && (
                    <button
                      type="button"
                      onClick={() => setShowJustifications(!showJustifications)}
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                    >
                      {showJustifications ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Ocultar Justificativas
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Ver Justificativas
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {!showJustifications ? (
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-sm text-[#1e130c]">
                    {gabaritoData.map((item, index) => (
                      <div key={`gabarito-${index}-${item.questionNumber}`} className="flex items-center justify-center p-2 bg-white border border-[#1e130c]/10 text-[#1e130c]">
                        <span className="text-[#7a6350] font-bold text-xs">{item.questionNumber}.</span>
                        <span className="ml-1 font-[family-name:var(--font-playfair)] font-bold text-[#1e130c] text-lg">{item.correctAnswer}</span>
                        {item.justification && (
                          <MessageSquare className="w-3 h-3 text-[#1e130c] font-bold ml-1" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 text-[#1e130c]">
                    {gabaritoData.map((item, index) => (
                      <div key={`gabarito-detail-${index}-${item.questionNumber}`} className="p-4 bg-white border border-[#1e130c]/10 relative text-[#1e130c]">
                        <div className="flex items-center gap-4 mb-2 border-b border-dashed border-[#1e130c]/10 pb-2">
                          <span className="text-[#8b6d22] font-bold uppercase tracking-widest text-xs">Questão {item.questionNumber}</span>
                          <span className="px-3 py-1 bg-[#8b6d22]/10 text-[#1e130c] font-[family-name:var(--font-playfair)] font-bold text-xl">{item.correctAnswer}</span>
                          {item.points && (
                            <span className="text-sm text-[#7a6350] italic">({item.points} pontos)</span>
                          )}
                        </div>
                        {item.justification && (
                          <div className="mt-3 text-[#1e130c] italic text-sm leading-relaxed border-l-2 border-green-500 pl-3">
                            {item.justification}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 text-[#1e130c]">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-[#7a6350] mb-2">
                  {t('tests.course')}
                </label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full bg-transparent border-b border-[#1e130c]/30 py-2 focus:outline-none focus:border-[color:var(--color-focus)] transition-colors cursor-pointer text-[#1e130c]"
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
                <label className="block text-xs uppercase tracking-widest font-bold text-[#7a6350] mb-2">
                  {t('tests.subject')}
                </label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full bg-transparent border-b border-[#1e130c]/30 py-2 focus:outline-none focus:border-[color:var(--color-focus)] transition-colors cursor-pointer text-[#1e130c]"
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

            <div className="grid grid-cols-3 gap-6 pt-2 text-[#1e130c]">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-[#7a6350] mb-2">
                  {t('tests.duration')} (min)
                </label>
                <input
                  type="number"
                  value={formData.duration_minutes || ''}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                  min="1"
                  className="w-full bg-transparent border-b border-[#1e130c]/30 py-2 focus:outline-none focus:border-[color:var(--color-focus)] transition-colors font-[family-name:var(--font-playfair)] text-xl text-center text-[#1e130c]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-[#7a6350] mb-2">
                  {t('tests.passingScore')} (%)
                </label>
                <input
                  type="number"
                  value={formData.passing_score || ''}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 70 })}
                  min="0"
                  max="100"
                  className="w-full bg-transparent border-b border-[#1e130c]/30 py-2 focus:outline-none focus:border-[color:var(--color-focus)] transition-colors font-[family-name:var(--font-playfair)] text-xl text-center text-[#1e130c]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-[#7a6350] mb-2">
                  {t('tests.maxAttempts')}
                </label>
                <input
                  type="number"
                  value={formData.max_attempts || ''}
                  onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 3 })}
                  min="1"
                  className="w-full bg-transparent border-b border-[#1e130c]/30 py-2 focus:outline-none focus:border-[color:var(--color-focus)] transition-colors font-[family-name:var(--font-playfair)] text-xl text-center text-[#1e130c]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-dashed border-[#1e130c]/20">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-[#8b6d22] border-2 border-[#1e130c]/30 focus:ring-[color:var(--color-focus)] bg-transparent cursor-pointer"
              />
              <label htmlFor="is_active" className="text-sm font-bold uppercase tracking-widest text-[#1e130c] cursor-pointer">
                {t('tests.testActive')}
              </label>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-[#1e130c]/20 text-[#1e130c]">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                className="uppercase tracking-widest text-xs font-bold"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={creating || updating}
                disabled={creating || updating}
                className="uppercase tracking-widest text-xs font-bold"
              >
                {editingTest ? t('tests.updateTest') : t('tests.createTest')}
              </Button>
            </div>
          </form>
        </div>
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
        <div className="relative font-[family-name:var(--font-lora)] text-[#1e130c]">
          {viewingAnswerKey && viewingAnswerKey.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4 border-b border-[#1e130c]/10 pb-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#8b6d22]" />
                  <span className="text-[#1e130c] font-bold font-[family-name:var(--font-playfair)] text-xl">
                    {viewingAnswerKey.length} questões no total
                  </span>
                </div>
                <button
                  onClick={() => setShowJustifications(!showJustifications)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                >
                  {showJustifications ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Ocultar Justificativas
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Mostrar Justificativas
                    </>
                  )}
                </button>
              </div>
              
              {/* Grade compacta do gabarito */}
              {!showJustifications && (
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                  {viewingAnswerKey.map((item, index) => (
                    <div 
                      key={`key-${item.question_number}-${index}`}
                      className="flex flex-col items-center justify-center p-3 border border-[#1e130c]/20 bg-[#faf6ee]/50 relative"
                    >
                      <span className="text-[#7a6350] font-bold text-xs uppercase tracking-widest mb-1">Q.{item.question_number}</span>
                      <span className="font-bold font-[family-name:var(--font-playfair)] text-2xl text-[#1e130c]">{item.correct_answer}</span>
                      {item.justification && (
                        <MessageSquare className="w-3 h-3 text-[#8b6d22] absolute top-1 right-1 opacity-50" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Visualização detalhada com justificativas */}
              {showJustifications && (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 text-[#1e130c]">
                  {viewingAnswerKey.map((item, index) => (
                    <div 
                      key={`detail-${item.question_number}-${index}`}
                      className="p-5 border border-[#1e130c]/20 bg-[#faf6ee]/50 relative"
                    >
                      <div className="flex items-center gap-4 mb-4 border-b border-dashed border-[#1e130c]/20 pb-3">
                        <span className="text-[#8b6d22] font-bold uppercase tracking-widest text-sm">
                          Questão {item.question_number}
                        </span>
                        <span className="px-3 py-1 bg-[#8b6d22]/10 text-[#1e130c] font-bold font-[family-name:var(--font-playfair)] text-2xl border border-[#8b6d22]/20">
                          {item.correct_answer}
                        </span>
                        {item.points && (
                          <span className="text-sm text-[#7a6350] italic">
                            ({item.points} pontos)
                          </span>
                        )}
                      </div>
                      
                      {item.justification ? (
                        <div className="text-[#1e130c] italic text-sm leading-relaxed border-l-2 border-[#8b6d22] pl-4">
                          {item.justification}
                        </div>
                      ) : (
                        <div className="text-[#7a6350]/50 italic text-sm">Sem justificativa cadastrada.</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end pt-6 border-t border-[#1e130c]/20 mt-6 text-[#1e130c]">
                <Button
                  onClick={() => {
                    setShowAnswerKeyModal(false)
                    setViewingAnswerKey(null)
                    setViewingTestTitle('')
                  }}
                  variant="secondary"
                  className="uppercase tracking-widest text-xs font-bold"
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/30">
              <FileCheck className="w-12 h-12 text-[#8b6d22]/50 mx-auto mb-4" />
              <p className="text-[#7a6350] font-[family-name:var(--font-lora)] italic text-lg">Nenhum gabarito encontrado para este teste.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
