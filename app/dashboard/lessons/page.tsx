'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Edit, Trash2, PlayCircle, FileText, Clock, Users, MoreVertical, CheckCircle, X, AlertCircle, BookOpen, Video, FileQuestion, Eye, EyeOff, ArrowDownAZ, ArrowUpAZ, CheckSquare, Square } from 'lucide-react'
import Card from '../../components/Card'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import VideoPlayer from '../../components/VideoPlayer'
import DocumentViewer from '../../components/DocumentViewer'

type Lesson = Database['public']['Tables']['lessons']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type SubjectLessonView = Database['public']['Views']['subject_lessons_view']['Row']

interface LessonWithRelations extends Lesson {
  subject_lessons?: Array<{
    subject_id: string
    subjects: {
      id: string
      name: string
      code: string | null
    }
  }>
  course_modules?: {
    id: string
    title: string
    courses?: {
      id: string
      title: string
    } | null
  } | null
}

export default function LessonsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [lessons, setLessons] = useState<LessonWithRelations[]>([])
  const [modules, setModules] = useState<(CourseModule & { courses: Course })[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonWithRelations | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'video',
    content_url: '',
    content: '',
    duration_minutes: '',
    order_index: '0',
    is_preview: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [lessonProgress, setLessonProgress] = useState<{ [key: string]: { completed: number, total: number } }>({})
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewLesson, setPreviewLesson] = useState<LessonWithRelations | null>(null)
  const [lessonSortMode, setLessonSortMode] = useState<'code' | 'title'>('code')
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([])
  const [selectAllLessons, setSelectAllLessons] = useState(false)
  const [bulkDeletingLessons, setBulkDeletingLessons] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch lessons with their relationships
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          subject_lessons (
            subject_id,
            subjects (
              id,
              name,
              code
            )
          ),
          course_modules (
            id,
            title,
            courses (
              id,
              title
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError)
        throw lessonsError
      }

      console.log('Lessons fetched:', lessonsData?.length || 0, 'lessons')
      setLessons(lessonsData || [])

      // Fetch lesson progress stats
      if (lessonsData && lessonsData.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, is_completed')

        if (progressData) {
          const progressStats: { [key: string]: { completed: number, total: number } } = {}
          
          progressData.forEach((progress: any) => {
            if (!progressStats[progress.lesson_id]) {
              progressStats[progress.lesson_id] = { completed: 0, total: 0 }
            }
            progressStats[progress.lesson_id].total++
            if (progress.is_completed) {
              progressStats[progress.lesson_id].completed++
            }
          })

          setLessonProgress(progressStats)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar aulas' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const lessonData = {
        title: formData.title,
        description: formData.description || null,
        content_type: formData.content_type,
        content_url: formData.content_url || null,
        content: formData.content || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        order_index: parseInt(formData.order_index),
        is_preview: formData.is_preview,
        updated_at: new Date().toISOString()
      }

      if (editingLesson) {
        // Update existing lesson
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', editingLesson.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Aula atualizada com sucesso!' })
      } else {
        // Create new lesson
        const { error } = await supabase
          .from('lessons')
          .insert({
            ...lessonData,
            created_at: new Date().toISOString()
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Aula criada com sucesso!' })
      }

      // Reset form and refresh data
      resetForm()
      setShowModal(false)
      await fetchData()
    } catch (error: any) {
      console.error('Error saving lesson:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao salvar aula' 
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (lesson: LessonWithRelations) => {
    setEditingLesson(lesson)
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      content_type: lesson.content_type,
      content_url: lesson.content_url || '',
      content: lesson.content || '',
      duration_minutes: lesson.duration_minutes?.toString() || '',
      order_index: lesson.order_index.toString(),
      is_preview: lesson.is_preview || false
    })
    setShowModal(true)
  }

  const handleDelete = async (lesson: LessonWithRelations) => {
    if (!confirm(`Tem certeza que deseja excluir a aula "${lesson.title}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lesson.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Aula excluída com sucesso!' })
      await fetchData()
    } catch (error: any) {
      console.error('Error deleting lesson:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao excluir aula' 
      })
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingLesson(null)
    setFormData({
      title: '',
      description: '',
      content_type: 'video',
      content_url: '',
      content: '',
      duration_minutes: '',
      order_index: '0',
      is_preview: false
    })
  }

  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson =>
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [lessons, searchTerm])

  const getLessonSubjectCode = (lesson: LessonWithRelations) => {
    const code = (lesson as any).subject_lessons?.[0]?.subjects?.code
    if (typeof code === 'string' && code.trim().length > 0) {
      return code.trim()
    }
    const match = lesson.title.match(/^[A-Za-zÀ-ÖØ-öø-ÿ0-9._-]+/)
    return match ? match[0] : lesson.title
  }

  const sortedLessons = useMemo(() => {
    const list = [...filteredLessons]

    if (lessonSortMode === 'code') {
      return list.sort((a, b) => {
        const codeA = getLessonSubjectCode(a)
        const codeB = getLessonSubjectCode(b)
        const codeCompare = codeA.localeCompare(codeB, 'pt-BR', { sensitivity: 'base', numeric: true })

        if (codeCompare !== 0) return codeCompare

        return a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
      })
    }

    return list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }))
  }, [filteredLessons, lessonSortMode])

  useEffect(() => {
    setSelectedLessonIds(prev => {
      const filtered = prev.filter(id => sortedLessons.some(lesson => lesson.id === id))
      const allSelected = filtered.length > 0 && filtered.length === sortedLessons.length
      setSelectAllLessons(allSelected)
      return filtered
    })
  }, [sortedLessons])

  const handleToggleLessonSelection = (lessonId: string) => {
    setSelectedLessonIds(prev => {
      if (prev.includes(lessonId)) {
        const updated = prev.filter(id => id !== lessonId)
        if (selectAllLessons) setSelectAllLessons(false)
        return updated
      }
      const updated = [...prev, lessonId]
      if (updated.length === sortedLessons.length && sortedLessons.length > 0) {
        setSelectAllLessons(true)
      }
      return updated
    })
  }

  const handleSelectAllLessons = () => {
    if (selectAllLessons) {
      setSelectedLessonIds([])
      setSelectAllLessons(false)
      return
    }

    const ids = sortedLessons.map(lesson => lesson.id)
    setSelectedLessonIds(ids)
    setSelectAllLessons(ids.length > 0)
  }

  const handleBulkDeleteSelectedLessons = async () => {
    if (selectedLessonIds.length === 0) return

    const selectedTitles = lessons
      .filter(lesson => selectedLessonIds.includes(lesson.id))
      .map(lesson => lesson.title)
      .join(', ')

    if (!confirm(`Tem certeza que deseja excluir ${selectedLessonIds.length} aula(s)?\n\nAulas: ${selectedTitles}`)) {
      return
    }

    setBulkDeletingLessons(true)

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .in('id', selectedLessonIds)

      if (error) throw error

      setMessage({ type: 'success', text: `${selectedLessonIds.length} aula(s) excluída(s) com sucesso!` })
      setSelectedLessonIds([])
      setSelectAllLessons(false)
      await fetchData()
    } catch (error: any) {
      console.error('Error deleting lessons:', error)
      setMessage({ type: 'error', text: error.message || 'Erro ao excluir aulas selecionadas' })
    } finally {
      setBulkDeletingLessons(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />
      case 'text':
        return <FileText className="w-4 h-4" />
      case 'quiz':
        return <FileQuestion className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Vídeo'
      case 'text':
        return 'Texto'
      case 'quiz':
        return 'Quiz'
      default:
        return type
    }
  }

  const totalDuration = lessons.reduce((acc, lesson) => acc + (lesson.duration_minutes || 0), 0)
  const previewLessons = lessons.filter(lesson => lesson.is_preview === true).length
  const completionRate = Object.values(lessonProgress).length > 0
    ? Math.round(
        Object.values(lessonProgress).reduce((acc, progress) => 
          acc + (progress.total > 0 ? (progress.completed / progress.total) * 100 : 0), 0
        ) / Object.values(lessonProgress).length
      )
    : 0

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold flex items-center gap-2">
            <PlayCircle className="w-8 h-8 text-gold-400" />
            Aulas
          </h1>
          <p className="text-gold-300 mt-1">Gerencie as aulas dos cursos</p>
        </div>
        <Button 
          onClick={openCreateModal}
          icon={<Plus className="w-4 h-4 flex-shrink-0" />}
        >
          Nova Aula
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
            : 'bg-red-500/20 text-red-400 border border-red-500/20'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {message.text}
        </div>
      )}

      {selectedLessonIds.length > 0 && (
        <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-gold-200 font-medium">
            {selectedLessonIds.length} {selectedLessonIds.length === 1 ? 'aula selecionada' : 'aulas selecionadas'}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedLessonIds([])
                setSelectAllLessons(false)
              }}
              className="text-sm text-gold-300 hover:text-gold-100 underline"
            >
              Desmarcar todas
            </button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDeleteSelectedLessons}
              disabled={bulkDeletingLessons}
              icon={<Trash2 className="w-4 h-4" />}
            >
              {bulkDeletingLessons ? 'Excluindo...' : 'Excluir selecionadas'}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Aulas</p>
              <p className="text-2xl font-bold text-gold mt-1">{lessons.length}</p>
            </div>
            <PlayCircle className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Aulas de Preview</p>
              <p className="text-2xl font-bold text-gold mt-1">{previewLessons}</p>
            </div>
            <Eye className="w-8 h-8 text-blue-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Tempo Total</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Taxa de Conclusão</p>
              <p className="text-2xl font-bold text-gold mt-1">{completionRate}%</p>
            </div>
            <Users className="w-8 h-8 text-purple-500/30" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
            <input
              type="text"
              placeholder="Buscar por título, descrição, módulo ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <Button 
            variant="secondary"
            icon={<Filter className="w-4 h-4 flex-shrink-0" />}
          >
            Filtros
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gold-400/80 font-medium">Ordenar por:</span>
          <button
            type="button"
            onClick={() => setLessonSortMode('code')}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              lessonSortMode === 'code'
                ? 'border-gold-500 text-gold-100 bg-gold-500/10'
                : 'border-gold-500/20 text-gold-300 hover:border-gold-500/40 hover:bg-navy-800'
            }`}
          >
            Código da disciplina (A-Z)
          </button>
          <button
            type="button"
            onClick={() => setLessonSortMode('title')}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              lessonSortMode === 'title'
                ? 'border-gold-500 text-gold-100 bg-gold-500/10'
                : 'border-gold-500/20 text-gold-300 hover:border-gold-500/40 hover:bg-navy-800'
            }`}
          >
            Título da aula (A-Z)
          </button>
        </div>

        {lessons.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gold-300 mt-2">
            <button
              type="button"
              onClick={handleSelectAllLessons}
              disabled={sortedLessons.length === 0}
              aria-pressed={selectAllLessons && sortedLessons.length > 0}
              className={`text-gold-400 hover:text-gold-200 transition-colors ${
                sortedLessons.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {selectAllLessons && sortedLessons.length > 0 ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span>
              {selectAllLessons && sortedLessons.length > 0
                ? 'Resultados filtrados selecionados'
                : 'Selecionar resultados filtrados'}
            </span>
          </div>
        )}
      </Card>

      {/* Lessons Table */}
      <Card>
        <div className="overflow-x-auto table-sticky">
          <table className="w-full table-density density-compact">
            <thead className="bg-navy-800/80 backdrop-blur-sm sticky top-0 z-10">
              <tr className="border-b border-gold-500/20">
                <th className="text-center text-gold-200 font-medium w-12">
                  <button
                    onClick={handleSelectAllLessons}
                    className="text-gold-400 hover:text-gold-200 transition-colors"
                  >
                    {selectAllLessons && sortedLessons.length > 0 ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th scope="col" className="text-left text-gold-200 font-medium">Aula</th>
                <th scope="col" className="text-left text-gold-200 font-medium">
                  <button
                    type="button"
                    onClick={() => setLessonSortMode(prev => prev === 'code' ? 'title' : 'code')}
                    className="flex items-center gap-2 text-gold-200 hover:text-gold transition-colors"
                  >
                    Disciplina
                    {lessonSortMode === 'code' ? (
                      <ArrowDownAZ className="w-4 h-4" />
                    ) : (
                      <ArrowUpAZ className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th scope="col" className="text-center text-gold-200 font-medium">Tipo</th>
                <th scope="col" className="text-center text-gold-200 font-medium">Duração</th>
                <th scope="col" className="text-center text-gold-200 font-medium">Ordem</th>
                <th scope="col" className="text-center text-gold-200 font-medium">Preview</th>
                <th scope="col" className="text-center text-gold-200 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedLessons.length > 0 ? (
                sortedLessons.map((lesson) => {
                  const progress = lessonProgress[lesson.id] || { completed: 0, total: 0 }
                  return (
                    <tr key={lesson.id} className="border-b border-gold-500/10 hover:bg-navy-800/30">
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleLessonSelection(lesson.id)}
                          className="text-gold-400 hover:text-gold-200 transition-colors"
                        >
                          {selectedLessonIds.includes(lesson.id) ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-[220px] md:max-w-[300px]">
                          <p className="text-gold-100 font-medium truncate" title={lesson.title}>
                            {lesson.title}
                          </p>
                          {lesson.description && (
                            <p className="text-gold-400 text-sm mt-1 truncate" title={lesson.description}>
                              {lesson.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-gold-300 text-sm">
                          {(lesson as any).subject_lessons?.[0]?.subjects ? (
                            <div className="max-w-[200px] md:max-w-[240px]">
                              <p
                                className="text-gold-200 truncate"
                                title={(lesson as any).subject_lessons[0].subjects.name}
                              >
                                {(lesson as any).subject_lessons[0].subjects.name}
                              </p>
                              <p className="text-gold-400 text-xs truncate" title={(lesson as any).subject_lessons[0].subjects.code || undefined}>
                                {(lesson as any).subject_lessons[0].subjects.code}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gold-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-gold-300">
                          {getTypeIcon(lesson.content_type)}
                          <span className="text-sm">{getTypeLabel(lesson.content_type)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gold-200">
                          {lesson.duration_minutes ? `${lesson.duration_minutes} min` : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gold-200">{lesson.order_index}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('lessons')
                                .update({ is_preview: !lesson.is_preview })
                                .eq('id', lesson.id)
                              
                              if (error) throw error
                              
                              setMessage({ 
                                type: 'success', 
                                text: `Aula ${!lesson.is_preview ? 'marcada como' : 'removida de'} preview` 
                              })
                              await fetchData()
                            } catch (error: any) {
                              setMessage({ 
                                type: 'error', 
                                text: 'Erro ao atualizar status de preview' 
                              })
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                            lesson.is_preview
                              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                          }`}
                          aria-label={lesson.is_preview ? 'Marcar como privada' : 'Marcar como preview'}
                        >
                          {lesson.is_preview ? (
                            <><Eye className="w-3 h-3" /> Preview</>
                          ) : (
                            <><EyeOff className="w-3 h-3" /> Privada</>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              // Redirecionar para a página do curso do aluno com a aula específica
                              if (lesson.course_modules?.courses?.id) {
                                router.push(`/student-dashboard/course/${lesson.course_modules.courses.id}?lesson=${lesson.id}`)
                              } else {
                                alert('Esta aula não está associada a um curso')
                              }
                            }}
                            title="Visualizar como Aluno"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleEdit(lesson)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleDelete(lesson)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <BookOpen className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                    <p className="text-gold-300">
                      {searchTerm ? 'Nenhuma aula encontrada com os critérios de busca' : 'Nenhuma aula cadastrada'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-navy-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gold-500/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gold">
                {editingLesson ? 'Editar Aula' : 'Nova Aula'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Título da Aula *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus-ring"
                  placeholder="Ex: Introdução ao Módulo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus-ring"
                  placeholder="Breve descrição da aula..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    Tipo de Conteúdo *
                  </label>
                  <select
                    required
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus-ring"
                  >
                    <option value="video">Vídeo</option>
                    <option value="text">Texto</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus-ring"
                    placeholder="Ex: 30"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  URL do Conteúdo
                </label>
                <input
                  type="url"
                  value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus-ring"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Conteúdo
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Conteúdo da aula (se aplicável)..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    Ordem na Disciplina
                  </label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_preview"
                    checked={formData.is_preview}
                    onChange={(e) => setFormData({ ...formData, is_preview: e.target.checked })}
                    className="w-4 h-4 text-gold-500 bg-navy-900/50 border-gold-500/50 rounded focus:ring-gold-500 focus:ring-2"
                  />
                  <label htmlFor="is_preview" className="ml-2 text-sm text-gold-200 cursor-pointer">
                    <span className="font-medium">Aula de Preview</span>
                    <span className="block text-xs text-gold-400 mt-0.5">
                      Visível para alunos não matriculados como demonstração
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Salvando...
                    </>
                  ) : (
                    editingLesson ? 'Atualizar' : 'Criar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Preview da Aula */}
      {showPreviewModal && previewLesson && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <Card variant="elevated" className="relative">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gold-500/20">
                <div>
                  <h2 className="text-2xl font-bold text-gold mb-2">
                    {previewLesson.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gold-400">
                    <span className="flex items-center gap-1">
                      {previewLesson.content_type === 'video' && <Video className="w-4 h-4" />}
                      {previewLesson.content_type === 'document' && <FileText className="w-4 h-4" />}
                      {previewLesson.content_type === 'text' && <BookOpen className="w-4 h-4" />}
                      {previewLesson.content_type === 'quiz' && <FileQuestion className="w-4 h-4" />}
                      {previewLesson.content_type}
                    </span>
                    {previewLesson.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {previewLesson.duration_minutes} min
                      </span>
                    )}
                    {previewLesson.is_preview && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Eye className="w-4 h-4" />
                        Preview
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPreviewModal(false)
                    setPreviewLesson(null)
                  }}
                  className="text-gold-400 hover:text-gold-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {previewLesson.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gold-300 mb-2">Descri\u00e7\u00e3o</h3>
                    <p className="text-gold-400">{previewLesson.description}</p>
                  </div>
                )}

                {/* Video Player */}
                {previewLesson.content_type === 'video' && previewLesson.content_url && (
                  <div className="rounded-lg overflow-hidden bg-navy-900">
                    <VideoPlayer
                      url={previewLesson.content_url}
                      title={previewLesson.title}
                    />
                  </div>
                )}

                {/* Document Viewer */}
                {previewLesson.content_type === 'document' && previewLesson.content_url && (
                  <div className="rounded-lg overflow-hidden bg-navy-900 h-[500px]">
                    <DocumentViewer
                      url={previewLesson.content_url}
                      title={previewLesson.title}
                    />
                  </div>
                )}

                {/* Text Content */}
                {previewLesson.content_type === 'text' && previewLesson.content && (
                  <div className="prose prose-invert max-w-none">
                    <div 
                      className="text-gold-300"
                      dangerouslySetInnerHTML={{ __html: previewLesson.content }}
                    />
                  </div>
                )}

                {/* Quiz Placeholder */}
                {previewLesson.content_type === 'quiz' && (
                  <div className="text-center py-12">
                    <FileQuestion className="w-16 h-16 text-gold-500/50 mx-auto mb-4" />
                    <p className="text-gold-400">Preview de quiz n\u00e3o dispon\u00edvel</p>
                    <p className="text-gold-500 text-sm mt-2">
                      Os quizzes s\u00e3o visualizados na interface de avalia\u00e7\u00f5es
                    </p>
                  </div>
                )}

                {/* No Content Message */}
                {!previewLesson.content_url && !previewLesson.content && (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-yellow-500/50 mx-auto mb-4" />
                    <p className="text-gold-400">Nenhum conte\u00fado dispon\u00edvel para esta aula</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-4 p-6 border-t border-gold-500/20">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPreviewModal(false)
                    setPreviewLesson(null)
                  }}
                >
                  Fechar
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
