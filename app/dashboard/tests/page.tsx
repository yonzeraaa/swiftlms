'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, FileCheck, Clock, Users, MoreVertical, AlertCircle, CheckCircle2, Eye, Copy, Download, BookOpen, ToggleLeft, ToggleRight, LayoutGrid, List } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../../contexts/LanguageContext'
import { useRouter } from 'next/navigation'
import TestForm from '../../components/TestForm'
import TestPreview from '../../components/TestPreview'
import { useToast } from '../../components/Toast'
import TestCard from '../../components/TestCard'
import ViewToggle from '../../components/ViewToggle'
import { Chip } from '../../components/Badge'
import { SkeletonCard } from '../../components/Skeleton'

interface Test {
  id: string
  title: string
  description?: string
  test_type: 'quiz' | 'exam' | 'practice'
  duration_minutes?: number
  total_points: number
  passing_score: number
  is_published: boolean
  max_attempts?: number
  created_at: string
  course?: { title: string }
  subject?: { name: string }
  questions?: Array<{ id: string }>
  attempts?: Array<{ 
    id: string
    score?: number
    status: string
  }>
}

export default function TestsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<Test[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [testToDelete, setTestToDelete] = useState<Test | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCourse, setFilterCourse] = useState('all')
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([])  
  const [showTestForm, setShowTestForm] = useState(false)
  const [editingTestId, setEditingTestId] = useState<string | undefined>()
  const [previewTestId, setPreviewTestId] = useState<string | undefined>()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { t } = useTranslation()
  const { showToast } = useToast()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchTests()
    fetchCourses()
  }, [])

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          course:courses(title),
          subject:subjects(name),
          questions:test_questions(id),
          attempts:test_attempts(id, score, status)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTests((data || []) as Test[])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching tests:', error)
      showToast({ type: 'error', title: 'Erro ao carregar testes' })
      setLoading(false)
    }
  }

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
    }
  }

  const handleTogglePublish = async (test: Test) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ is_published: !test.is_published })
        .eq('id', test.id)

      if (error) throw error

      showToast({ 
        type: 'success', 
        title: test.is_published ? 'Teste despublicado' : 'Teste publicado' 
      })
      fetchTests()
    } catch (error) {
      console.error('Error toggling publish:', error)
      showToast({ type: 'error', title: 'Erro ao alterar status do teste' })
    }
  }

  const handleDuplicateTest = async (test: Test) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // Fetch full test data with questions
      const { data: fullTest, error: fetchError } = await supabase
        .from('tests')
        .select(`
          *,
          questions:test_questions(*)
        `)
        .eq('id', test.id)
        .single()

      if (fetchError) throw fetchError

      // Create duplicate test
      const { data: newTest, error: createError } = await supabase
        .from('tests')
        .insert({
          title: `${test.title} (Cópia)`,
          description: fullTest.description,
          test_type: fullTest.test_type,
          duration_minutes: fullTest.duration_minutes,
          total_points: fullTest.total_points,
          passing_score: fullTest.passing_score,
          instructions: fullTest.instructions,
          is_published: false,
          show_results: fullTest.show_results,
          show_answers: fullTest.show_answers,
          randomize_questions: fullTest.randomize_questions,
          randomize_options: fullTest.randomize_options,
          max_attempts: fullTest.max_attempts,
          course_id: fullTest.course_id,
          subject_id: fullTest.subject_id,
          created_by: user.id
        })
        .select()
        .single()

      if (createError) throw createError

      // Duplicate test questions
      if (fullTest.questions && fullTest.questions.length > 0) {
        const questionsToInsert = fullTest.questions.map((q: any) => ({
          test_id: newTest.id,
          question_id: q.question_id,
          order_index: q.order_index,
          points_override: q.points_override
        }))

        const { error: questionsError } = await supabase
          .from('test_questions')
          .insert(questionsToInsert)

        if (questionsError) throw questionsError
      }

      showToast({ type: 'success', title: 'Teste duplicado com sucesso!' })
      fetchTests()
    } catch (error) {
      console.error('Error duplicating test:', error)
      showToast({ type: 'error', title: 'Erro ao duplicar teste' })
    }
  }

  const confirmDelete = async () => {
    if (!testToDelete) return

    try {
      // Check if test has attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('id')
        .eq('test_id', testToDelete.id)
        .limit(1)

      if (attemptsError) throw attemptsError

      if (attempts && attempts.length > 0) {
        // Has attempts, soft delete only
        const { error } = await supabase
          .from('tests')
          .update({ is_published: false })
          .eq('id', testToDelete.id)

        if (error) throw error
        showToast({ type: 'info', title: 'Teste despublicado (possui tentativas)' })
      } else {
        // No attempts, can delete
        // First delete test questions
        const { error: questionsError } = await supabase
          .from('test_questions')
          .delete()
          .eq('test_id', testToDelete.id)

        if (questionsError) throw questionsError

        // Then delete test
        const { error } = await supabase
          .from('tests')
          .delete()
          .eq('id', testToDelete.id)

        if (error) throw error
        showToast({ type: 'success', title: 'Teste excluído com sucesso!' })
      }

      setShowDeleteModal(false)
      setTestToDelete(null)
      fetchTests()
    } catch (error) {
      console.error('Error deleting test:', error)
      showToast({ type: 'error', title: 'Erro ao excluir teste' })
    }
  }

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (test.subject?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (test.course?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || test.test_type === filterType
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'published' ? test.is_published : !test.is_published)
    const matchesCourse = filterCourse === 'all' || test.course?.title === filterCourse
    
    return matchesSearch && matchesType && matchesStatus && matchesCourse
  })

  const calculateAverageScore = (attempts: Test['attempts']) => {
    if (!attempts || attempts.length === 0) return 0
    const completedAttempts = attempts.filter(a => a.status === 'completed' && a.score)
    if (completedAttempts.length === 0) return 0
    const sum = completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0)
    return Math.round(sum / completedAttempts.length)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'Quiz'
      case 'exam':
        return 'Prova'
      case 'practice':
        return 'Prática'
      default:
        return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'bg-blue-500/20 text-blue-400'
      case 'exam':
        return 'bg-purple-500/20 text-purple-400'
      case 'practice':
        return 'bg-orange-500/20 text-orange-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-32 bg-navy-700/50 rounded-lg animate-pulse mb-2"></div>
            <div className="h-4 w-48 bg-navy-700/30 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-navy-700/50 rounded-lg animate-pulse"></div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-navy-700/50 rounded-lg animate-pulse"></div>
          <div className="h-10 w-24 bg-navy-700/50 rounded-lg animate-pulse"></div>
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold">Testes</h1>
          <p className="text-gold-300 mt-1">Gerencie as avaliações e testes</p>
        </div>
        <Button 
          icon={<Plus className="w-5 h-5" />}
          onClick={() => {
            setEditingTestId(undefined)
            setShowTestForm(true)
          }}
        >
          Novo Teste
        </Button>
      </div>

      {/* Search, Filters and View Toggle */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder="Buscar testes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          />
        </div>
        <ViewToggle view={viewMode} onViewChange={setViewMode} />
        <Button 
          variant="secondary" 
          icon={<Filter className="w-5 h-5" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filtros
        </Button>
      </div>

      {/* Filters Panel with Chips */}
      {showFilters && (
        <Card variant="outlined">
          <div className="space-y-4">
            {/* Type Filters */}
            <div>
              <p className="text-sm font-medium text-gold-300 mb-3">Tipo de Teste</p>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="Todos"
                  selected={filterType === 'all'}
                  onClick={() => setFilterType('all')}
                  count={tests.length}
                />
                <Chip
                  label="Quiz"
                  selected={filterType === 'quiz'}
                  onClick={() => setFilterType('quiz')}
                  count={tests.filter(t => t.test_type === 'quiz').length}
                  color="blue"
                />
                <Chip
                  label="Prova"
                  selected={filterType === 'exam'}
                  onClick={() => setFilterType('exam')}
                  count={tests.filter(t => t.test_type === 'exam').length}
                  color="purple"
                />
                <Chip
                  label="Prática"
                  selected={filterType === 'practice'}
                  onClick={() => setFilterType('practice')}
                  count={tests.filter(t => t.test_type === 'practice').length}
                  color="green"
                />
              </div>
            </div>

            {/* Status Filters */}
            <div>
              <p className="text-sm font-medium text-gold-300 mb-3">Status</p>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="Todos"
                  selected={filterStatus === 'all'}
                  onClick={() => setFilterStatus('all')}
                />
                <Chip
                  label="Publicado"
                  selected={filterStatus === 'published'}
                  onClick={() => setFilterStatus('published')}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  count={tests.filter(t => t.is_published).length}
                  color="green"
                />
                <Chip
                  label="Rascunho"
                  selected={filterStatus === 'draft'}
                  onClick={() => setFilterStatus('draft')}
                  icon={<AlertCircle className="w-4 h-4" />}
                  count={tests.filter(t => !t.is_published).length}
                  color="gold"
                />
              </div>
            </div>

            {/* Course Filters */}
            {courses.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gold-300 mb-3">Curso</p>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    label="Todos os Cursos"
                    selected={filterCourse === 'all'}
                    onClick={() => setFilterCourse('all')}
                  />
                  {courses.map(course => (
                    <Chip
                      key={course.id}
                      label={course.title}
                      selected={filterCourse === course.title}
                      onClick={() => setFilterCourse(course.title)}
                      count={tests.filter(t => t.course?.title === course.title).length}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {(filterType !== 'all' || filterStatus !== 'all' || filterCourse !== 'all') && (
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterType('all')
                    setFilterStatus('all')
                    setFilterCourse('all')
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Testes</p>
              <p className="text-2xl font-bold text-gold mt-1">{tests.length}</p>
            </div>
            <FileCheck className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Testes Publicados</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {tests.filter(t => t.is_published).length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Questões</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {tests.reduce((acc, t) => acc + (t.questions?.length || 0), 0)}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Tentativas</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {tests.reduce((acc, t) => acc + (t.attempts?.length || 0), 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
      </div>

      {/* Tests List or Grid */}
      {viewMode === 'grid' ? (
        <>
          {/* Results Count */}
          {filteredTests.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gold-400">
                {filteredTests.length} {filteredTests.length === 1 ? 'teste encontrado' : 'testes encontrados'}
              </p>
            </div>
          )}

          {/* Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                onView={() => setPreviewTestId(test.id)}
                onEdit={() => {
                  setEditingTestId(test.id)
                  setShowTestForm(true)
                }}
                onTogglePublish={() => handleTogglePublish(test)}
                onDuplicate={() => handleDuplicateTest(test)}
                onDelete={() => {
                  setTestToDelete(test)
                  setShowDeleteModal(true)
                }}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredTests.length === 0 && (
            <Card className="text-center py-12">
              <FileCheck className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gold mb-2">Nenhum teste encontrado</h3>
              <p className="text-gold-400">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all' || filterCourse !== 'all'
                  ? 'Tente ajustar os filtros ou termo de busca'
                  : 'Comece criando seu primeiro teste usando o botão "+ Novo Teste" acima'}
              </p>
            </Card>
          )}
        </>
      ) : (
        /* List View - Keeping the table */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold-500/20">
                  <th className="text-left py-3 px-4 text-gold-300 font-medium">Teste</th>
                  <th className="text-left py-3 px-4 text-gold-300 font-medium">Curso / Disciplina</th>
                  <th className="text-center py-3 px-4 text-gold-300 font-medium">Tipo</th>
                  <th className="text-center py-3 px-4 text-gold-300 font-medium">Questões</th>
                  <th className="text-center py-3 px-4 text-gold-300 font-medium">Duração</th>
                  <th className="text-center py-3 px-4 text-gold-300 font-medium">Tentativas</th>
                  <th className="text-center py-3 px-4 text-gold-300 font-medium">Média</th>
                  <th className="text-center py-3 px-4 text-gold-300 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gold-300 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test) => (
                  <tr key={test.id} className="border-b border-gold-500/10 hover:bg-navy-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <p className="text-gold-100 font-medium">{test.title}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-gold-200 text-sm">{test.course?.title || '-'}</p>
                        <p className="text-gold-400 text-xs mt-1">{test.subject?.name || '-'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(test.test_type)}`}>
                        {getTypeLabel(test.test_type)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gold-200">{test.questions?.length || 0}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gold-200">
                        {test.duration_minutes ? `${test.duration_minutes} min` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gold-200">{test.attempts?.length || 0}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {test.attempts && test.attempts.length > 0 ? (
                        <span className={`font-medium ${getScoreColor(calculateAverageScore(test.attempts))}`}>
                          {calculateAverageScore(test.attempts)}%
                        </span>
                      ) : (
                        <span className="text-gold-500">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.is_published 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {test.is_published ? 'Publicado' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                          onClick={() => setPreviewTestId(test.id)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                          onClick={() => {
                            setEditingTestId(test.id)
                            setShowTestForm(true)
                          }}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                          onClick={() => handleTogglePublish(test)}
                          title={test.is_published ? 'Despublicar' : 'Publicar'}
                        >
                          {test.is_published ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                          onClick={() => handleDuplicateTest(test)}
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-red-400 hover:text-red-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                          onClick={() => {
                            setTestToDelete(test)
                            setShowDeleteModal(true)
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && testToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-navy-800 border border-gold-500/20 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gold mb-4">Confirmar Exclusão</h3>
            <p className="text-gold-200 mb-6">
              Tem certeza que deseja excluir o teste &quot;{testToDelete.title}&quot;? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false)
                  setTestToDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => confirmDelete()}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Test Form Modal */}
      <TestForm
        isOpen={showTestForm}
        onClose={() => {
          setShowTestForm(false)
          setEditingTestId(undefined)
        }}
        testId={editingTestId}
        onSuccess={() => {
          setShowTestForm(false)
          setEditingTestId(undefined)
          fetchTests()
        }}
      />

      {/* Test Preview Modal */}
      {previewTestId && (
        <TestPreview
          isOpen={!!previewTestId}
          onClose={() => setPreviewTestId(undefined)}
          testId={previewTestId}
        />
      )}
    </div>
  )
}