'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Edit, Trash2, PlayCircle, FileText, Clock, Users, MoreVertical, CheckCircle, X, AlertCircle, BookOpen, Video, FileQuestion, Eye, EyeOff, ArrowDownAZ, ArrowUpAZ, CheckSquare, Square, Check } from 'lucide-react'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/Button'
import { Database } from '@/lib/database.types'
import VideoPlayer from '../../components/VideoPlayer'
import DocumentViewer from '../../components/DocumentViewer'
import {
  getLessonsData,
  createLesson,
  updateLesson,
  deleteLesson,
  bulkDeleteLessons,
  toggleLessonPreview
} from '@/lib/actions/admin-lessons'
import { getAllCourses } from '@/lib/actions/admin-courses'

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
  const [codeFilter, setCodeFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number, bottom?: number, left: number, isUp?: boolean } | null>(null)
  const [dropdownLesson, setDropdownLesson] = useState<any>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('todos')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('todas')
  const [loading, setLoading] = useState(true)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
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
  const [allCourses, setAllCourses] = useState<{ id: string; title: string }[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const data = await getLessonsData()

      if (!data) {
        setMessage({ type: 'error', text: 'Erro ao carregar aulas' })
        return
      }

      setLessons(data.lessons)
      setLessonProgress(data.lessonProgress)
      setAllCourses(await getAllCourses())
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
        description: formData.description,
        content_type: formData.content_type,
        content_url: formData.content_url,
        content: formData.content,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
        order_index: parseInt(formData.order_index),
        is_preview: formData.is_preview
      }

      let result
      if (editingLesson) {
        result = await updateLesson(editingLesson.id, lessonData)
        if (result.success) {
          setMessage({ type: 'success', text: 'Aula atualizada com sucesso!' })
        }
      } else {
        result = await createLesson(lessonData)
        if (result.success) {
          setMessage({ type: 'success', text: 'Aula criada com sucesso!' })
        }
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar aula')
      }

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
      const result = await deleteLesson(lesson.id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir aula')
      }

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

  const availableSubjects = useMemo(() => {
    const subjectsMap = new Map<string, { id: string; name: string; code: string | null }>()

    lessons.forEach(lesson => {
      if (lesson.subject_lessons && lesson.subject_lessons.length > 0) {
        lesson.subject_lessons.forEach(sl => {
          if (sl.subjects && !subjectsMap.has(sl.subjects.id)) {
            subjectsMap.set(sl.subjects.id, {
              id: sl.subjects.id,
              name: sl.subjects.name,
              code: sl.subjects.code
            })
          }
        })
      }
    })

    return Array.from(subjectsMap.values()).sort((a, b) => {
      const codeA = a.code || a.name
      const codeB = b.code || b.name
      return codeA.localeCompare(codeB, 'pt-BR', { sensitivity: 'base', numeric: true })
    })
  }, [lessons])

  const availableCourses = useMemo(() => {
    const coursesMap = new Map<string, { id: string; title: string }>()

    lessons.forEach(lesson => {
      const course = lesson.course_modules?.courses
      if (course && !coursesMap.has(course.id)) {
        coursesMap.set(course.id, { id: course.id, title: course.title })
      }
    })

    return Array.from(coursesMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
    )
  }, [lessons])

  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      if (codeFilter && !lesson.code?.toLowerCase().includes(codeFilter.toLowerCase())) return false

      if (searchTerm) {
        const matchesSearch =
          lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lesson.description?.toLowerCase().includes(searchTerm.toLowerCase())
        if (!matchesSearch) return false
      }

      if (selectedCourseId !== 'todos') {
        const lessonCourseId = lesson.course_modules?.courses?.id
        if (lessonCourseId !== selectedCourseId) return false
      }

      if (selectedSubjectId === 'todas') return true

      if (selectedSubjectId === 'sem-disciplina') {
        return !lesson.subject_lessons || lesson.subject_lessons.length === 0
      }

      return lesson.subject_lessons?.some(sl => sl.subject_id === selectedSubjectId) ?? false
    })
  }, [lessons, codeFilter, searchTerm, selectedCourseId, selectedSubjectId])

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
        const codeA = a.code || a.title
        const codeB = b.code || b.title
        return codeA.localeCompare(codeB, 'pt-BR', { sensitivity: 'base', numeric: true })
      })
    }

    return list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }))
  }, [filteredLessons, lessonSortMode])

  const totalPages = Math.ceil(sortedLessons.length / itemsPerPage)
  const paginatedLessons = sortedLessons.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
      const result = await bulkDeleteLessons(selectedLessonIds)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir aulas')
      }

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

    return (    <div className="max-w-[1400px] mx-auto p-6 md:p-10 space-y-8 bg-[#faf6ee] min-h-screen font-[family-name:var(--font-lora)] text-[#1e130c]">
      
      {/* Header Clássico */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#1e130c', lineHeight: 1.1, fontWeight: 700 }}>
            Gestão de Aulas
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: '#7a6350', marginTop: '0.5rem' }}>
            Gerencie as aulas e conteúdos dos cursos.
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color="#1e130c" />
          </div>
        </div>
        <button
          onClick={openCreateModal}
          style={{ padding: '1rem 3rem', backgroundColor: '#1e130c', color: '#faf6ee', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          Nova Aula
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="border border-[#1e130c]/20 bg-[#faf6ee] p-4 rounded shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            {message.type === 'success' ? (
              <AlertCircle className="w-5 h-5 text-[#8b6d22]" />
            ) : message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-[#7a6350] italic" />
            ) : (
              <Spinner size="sm" className="text-[#8b6d22]" />
            )}
            <p className={
              message.type === 'success' ? 'text-[#1e130c] font-medium' :
              message.type === 'error' ? 'text-[#7a6350] italic font-medium' :
              'text-[#1e130c] font-medium'
            }>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {selectedLessonIds.length > 0 && (
        <div className="border border-[#8b6d22]/50 bg-[#8b6d22]/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
          <span className="text-[#1e130c] font-medium">
            {selectedLessonIds.length} {selectedLessonIds.length === 1 ? 'preleção assinalada' : 'preleções assinaladas'}
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setSelectedLessonIds([])
                setSelectAllLessons(false)
              }}
              className="text-[#8b6d22] hover:text-[#1e130c] text-sm underline italic transition-colors"
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
              {bulkDeletingLessons ? 'Expurgando...' : 'Expurgar selecionadas'}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Area */}
      <div className="border-b border-t border-[#1e130c]/20 py-4 mb-8 flex flex-wrap justify-between gap-6 bg-[#faf6ee]/50 text-center sm:text-left">
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Total de Preleções</p>
          <p className="text-2xl font-bold text-[#1e130c]">{lessons.length}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Demonstrações (Preview)</p>
          <p className="text-2xl font-bold text-[#1e130c]">{previewLessons}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Duração Total</p>
          <p className="text-2xl font-bold text-[#1e130c]">
            {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
          </p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Taxa de Conclusão</p>
          <p className="text-2xl font-bold text-[#1e130c]">{completionRate}%</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative w-full md:w-48 shrink-0">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6d22]" />
            <input
              type="text"
              placeholder="Cifra (Ex: TEO101)"
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none font-mono"
            />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6d22]" />
            <input
              type="text"
              placeholder="Pesquisar por título ou sumário..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-4 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="w-4 h-4 text-[#8b6d22] flex-shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => { setSelectedCourseId(e.target.value); setCurrentPage(1); }}
              className="px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
            >
              <option value="todos">Todos os cursos</option>
              {allCourses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <select
              value={selectedSubjectId}
              onChange={(e) => { setSelectedSubjectId(e.target.value); setCurrentPage(1); }}
              className="px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
            >
              <option value="todas">Todas as disciplinas</option>
              <option value="sem-disciplina">Sem disciplina vinculada</option>
              {availableSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.code ? `${subject.code} - ${subject.name}` : subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm pt-2">
          <span className="text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Ordenação:</span>
          <button
            type="button"
            onClick={() => setLessonSortMode('code')}
            className={`px-3 py-1 border-b-2 transition-colors ${
              lessonSortMode === 'code'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }`}
          >
            Cifra da Disciplina
          </button>
          <button
            type="button"
            onClick={() => setLessonSortMode('title')}
            className={`px-3 py-1 border-b-2 transition-colors ${
              lessonSortMode === 'title'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }`}
          >
            Título da Preleção
          </button>
        </div>

        {lessons.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-[#7a6350] mt-2 italic">
            <button
              type="button"
              onClick={handleSelectAllLessons}
              disabled={sortedLessons.length === 0}
              aria-pressed={selectAllLessons && sortedLessons.length > 0}
              className={`text-[#8b6d22] hover:text-[#1e130c] transition-colors ${
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
      </div>

      {(codeFilter || selectedCourseId !== 'todos' || selectedSubjectId !== 'todas' || searchTerm) && (
        <p className="text-sm text-[#7a6350] mb-4 italic">
          A exibir {filteredLessons.length} de {lessons.length} preleções.
        </p>
      )}

      {/* Lessons Directory List */}
      {loading ? (
        <Spinner fullPage size="xl" />
      ) : (
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm sm:text-base border-collapse">
          <thead className="bg-transparent sticky top-0 z-10 border-b-2 border-[#1e130c]/30">
            <tr>
              <th className="text-center py-3 px-4 text-[#7a6350] font-medium w-12">
                <button
                  onClick={handleSelectAllLessons}
                  className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                >
                  {selectAllLessons && sortedLessons.length > 0 ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Código</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Título</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Descrição</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">
                <button
                  type="button"
                  onClick={() => setLessonSortMode(prev => prev === 'code' ? 'title' : 'code')}
                  className="flex items-center gap-2 text-[#1e130c] hover:text-[#8b6d22] transition-colors"
                >
                  Disciplina
                  {lessonSortMode === 'code' ? (
                    <ArrowDownAZ className="w-4 h-4" />
                  ) : (
                    <ArrowUpAZ className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Tipo</th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Duração</th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Preview</th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLessons.length > 0 ? (
              paginatedLessons.map((lesson) => {
                const progress = lessonProgress[lesson.id] || { completed: 0, total: 0 }
                return (
                  <tr key={lesson.id} className="border-b border-dashed border-[#1e130c]/20 hover:bg-[#1e130c]/5 transition-colors">
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleLessonSelection(lesson.id)}
                        className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                      >
                        {selectedLessonIds.includes(lesson.id) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#8b6d22] font-mono text-sm">{lesson.code || '-'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#1e130c] font-medium truncate max-w-[220px] md:max-w-[300px] block" title={lesson.title}>
                        {lesson.title}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#7a6350] italic text-sm">{lesson.description || '-'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-[#7a6350] text-sm">
                        {(lesson as any).subject_lessons?.[0]?.subjects ? (
                          <span
                            className="text-[#1e130c] truncate max-w-[200px] md:max-w-[240px] block"
                            title={(lesson as any).subject_lessons[0].subjects.name}
                          >
                            {(lesson as any).subject_lessons[0].subjects.name}
                          </span>
                        ) : (
                          <span className="text-[#8b6d22] italic">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-[#7a6350]">
                        {getTypeIcon(lesson.content_type)}
                        <span className="text-sm tracking-widest uppercase">{getTypeLabel(lesson.content_type)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-[#1e130c] font-medium">
                        {lesson.duration_minutes ? `${lesson.duration_minutes} min` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={async () => {
                          try {
                            const result = await toggleLessonPreview(lesson.id, lesson.is_preview || false)

                            if (!result.success) {
                              throw new Error(result.error || 'Erro ao atualizar preview')
                            }

                            setMessage({
                              type: 'success',
                              text: `Aula ${result.newStatus ? 'marcada como' : 'removida de'} preview`
                            })
                            await fetchData()
                          } catch (error: any) {
                            setMessage({
                              type: 'error',
                              text: error.message || 'Erro ao atualizar status de preview'
                            })
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1 border text-xs font-medium transition-all hover:scale-105 ${
                          lesson.is_preview
                            ? 'border-[#8b6d22] bg-[#8b6d22]/10 text-[#8b6d22]'
                            : 'border-[#1e130c]/20 bg-transparent text-[#7a6350]'
                        }`}
                        aria-label={lesson.is_preview ? 'Marcar como privada' : 'Marcar como preview'}
                      >
                        {lesson.is_preview ? (
                          <><Eye className="w-3 h-3" /> Exposta</>
                        ) : (
                          <><EyeOff className="w-3 h-3" /> Oculta</>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                        const isUp = window.innerHeight - rect.bottom < 250
                        setDropdownPosition({ 
                          top: isUp ? undefined : rect.bottom, 
                          bottom: isUp ? window.innerHeight - rect.top : undefined,
                          left: rect.right - 240,
                          isUp
                        })
                          setDropdownLesson(lesson)
                          setOpenDropdown(lesson.id)
                        }}
                        className="text-[#8b6d22] hover:text-[#1e130c] p-2 transition-transform active:scale-90"
                        title="Ações"
                      >
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <BookOpen className="w-12 h-12 text-[#8b6d22]/30 mx-auto mb-3" />
                  <p className="text-[#7a6350] italic">
                    {searchTerm ? 'Nenhuma preleção encontrada nos registros' : 'O livro de registros encontra-se vazio'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div className="flex justify-between items-center py-4 px-4 mt-2 border-t border-[#1e130c]/10 bg-transparent">
            <span className="text-sm text-[#7a6350] italic">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-transparent border border-[#1e130c]/20 text-[#1e130c] text-sm hover:bg-[#1e130c]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-transparent border border-[#1e130c]/20 text-[#1e130c] text-sm hover:bg-[#1e130c]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1e130c]/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto custom-scrollbar">
          <div className="relative bg-[#faf6ee] w-full max-w-xl p-8 shadow-xl border border-[#1e130c]/10 my-8">

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c]">
                {editingLesson ? 'Editar Aula' : 'Nova Aula'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1e130c] mb-1">
                  Título <span className="text-[#8b6d22]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[#1e130c]/20 bg-transparent focus:border-[#8b6d22] outline-none transition-colors"
                  placeholder="Ex: Introdução ao Módulo"
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Sumário (Descrição)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none resize-none"
                  placeholder="Breve descrição da preleção..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Natureza do Conteúdo <span className="text-[#8b6d22]">*</span>
                  </label>
                  <select
                    required
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
                  >
                    <option value="video">Cinematografia (Vídeo)</option>
                    <option value="text">Manuscrito (Texto)</option>
                    <option value="quiz">Exame (Quiz)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Duração (Minutos)
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                    placeholder="Ex: 30"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Endereço do Acervo (URL)
                </label>
                <input
                  type="url"
                  value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Conteúdo Textual
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none resize-none"
                  placeholder="Conteúdo da aula (se aplicável)..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Posição Sequencial
                  </label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="flex items-center pb-2">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={formData.is_preview}
                        onChange={(e) => setFormData({ ...formData, is_preview: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-[#1e130c]/30 rounded-none peer-checked:bg-[#8b6d22] peer-checked:border-[#8b6d22] transition-colors flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#faf6ee] opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <span className="block text-[#1e130c] font-medium group-hover:text-[#8b6d22] transition-colors">Exibição pública (Preview)</span>
                      <span className="block text-xs text-[#7a6350] mt-0.5 italic">
                        Visível como demonstração para não inscritos
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-[#1e130c]/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-[#1e130c]/20 text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-medium text-center text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-medium text-center text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Spinner size="sm" /> Gravando...</>
                  ) : (
                    editingLesson ? 'Salvar Alterações' : 'Criar Aula'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Preview da Aula */}
      {showPreviewModal && previewLesson && (
        <div className="fixed inset-0 bg-[#1e130c]/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto custom-scrollbar">
          <div className="relative bg-[#faf6ee] w-full max-w-6xl shadow-2xl border border-[#1e130c]/20 my-8">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#1e130c]/15 relative z-10">
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] mb-2">
                  {previewLesson.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-[#8b6d22] tracking-widest uppercase font-medium">
                  <span className="flex items-center gap-2">
                    {previewLesson.content_type === 'video' && <Video className="w-4 h-4" />}
                    {previewLesson.content_type === 'document' && <FileText className="w-4 h-4" />}
                    {previewLesson.content_type === 'text' && <BookOpen className="w-4 h-4" />}
                    {previewLesson.content_type === 'quiz' && <FileQuestion className="w-4 h-4" />}
                    {previewLesson.content_type}
                  </span>
                  {previewLesson.duration_minutes && (
                    <span className="flex items-center gap-1 before:content-['•'] before:mr-4 before:text-[#1e130c]/20">
                      <Clock className="w-4 h-4" />
                      {previewLesson.duration_minutes} min
                    </span>
                  )}
                  {previewLesson.is_preview && (
                    <span className="flex items-center gap-1 text-[#8b6d22] before:content-['•'] before:mr-4 before:text-[#1e130c]/20">
                      <Eye className="w-4 h-4" />
                      Exposição Pública
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewLesson(null)
                }}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar relative z-10">
              {previewLesson.description && (
                <div className="mb-8">
                  <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1e130c] mb-3">Ementa</h3>
                  <p className="text-[#7a6350] leading-relaxed italic">{previewLesson.description}</p>
                  
                </div>
              )}

              {/* Video Player */}
              {previewLesson.content_type === 'video' && previewLesson.content_url && (
                <div className="border-4 border-[#1e130c] p-2 bg-[#1e130c] rounded-none overflow-hidden shadow-xl">
                  <VideoPlayer
                    url={previewLesson.content_url}
                    title={previewLesson.title}
                  />
                </div>
              )}

              {/* Document Viewer */}
              {previewLesson.content_type === 'document' && previewLesson.content_url && (
                <div className="border border-[#1e130c]/20 overflow-hidden bg-[#faf6ee] h-[600px] shadow-inner">
                  <DocumentViewer
                    url={previewLesson.content_url}
                    title={previewLesson.title}
                  />
                </div>
              )}

              {/* Text Content */}
              {previewLesson.content_type === 'text' && previewLesson.content && (
                <div className="prose prose-stone max-w-none font-[family-name:var(--font-lora)] text-[#1e130c] bg-[#faf6ee] p-6 border border-[#1e130c]/15 shadow-inner">
                  <div dangerouslySetInnerHTML={{ __html: previewLesson.content }} />
                </div>
              )}

              {/* Quiz Placeholder */}
              {previewLesson.content_type === 'quiz' && (
                <div className="text-center py-16 border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/50">
                  <FileQuestion className="w-16 h-16 text-[#8b6d22]/50 mx-auto mb-4" />
                  <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] text-xl">O Exame encontra-se selado</p>
                  <p className="text-[#7a6350] mt-2 italic">
                    A visualização dos questionários ocorre estritamente na interface de avaliações.
                  </p>
                </div>
              )}

              {/* No Content Message */}
              {!previewLesson.content_url && !previewLesson.content && (
                <div className="text-center py-16 border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/50">
                  <AlertCircle className="w-16 h-16 text-[#8b6d22]/30 mx-auto mb-4" />
                  <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] text-xl">Acervo em Branco</p>
                  <p className="text-[#7a6350] mt-2 italic">Não constam manuscritos ou conteúdos para esta preleção.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-4 p-6 border-t border-[#1e130c]/15 bg-[#faf6ee] relative z-10">
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewLesson(null)
                }}
                className="py-2 px-8 border border-[#1e130c]/20 text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-medium text-center"
              >
                Cerrar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dropdown Portal ── */}
      {openDropdown && dropdownLesson && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[11000] bg-transparent" onClick={() => { setOpenDropdown(null); setDropdownLesson(null); }} />
          <div
            className="fixed w-60 bg-[#faf6ee] border border-[#1e130c]/20 shadow-2xl z-[11001] py-3 font-[family-name:var(--font-lora)]"
            style={{ top: dropdownPosition.top ? `${dropdownPosition.top + 8}px` : undefined, bottom: dropdownPosition.bottom ? `${dropdownPosition.bottom + 8}px` : undefined, left: `${dropdownPosition.left}px` }}
          >
            <div className={`absolute ${dropdownPosition.isUp ? "-bottom-2 border-b border-r" : "-top-2 border-l border-t"} right-4 w-4 h-4 bg-[#faf6ee] border-[#1e130c]/20 rotate-45`} />
            <button 
              onClick={() => {
                if (dropdownLesson.course_modules?.courses?.id) {
                  router.push(`/student-dashboard/course/${dropdownLesson.course_modules.courses.id}?lesson=${dropdownLesson.id}`)
                } else {
                  alert('Esta aula não está associada a um curso')
                }
                setOpenDropdown(null);
              }}
              className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors"
            >
              <Eye size={16} style={{ color: '#8b6d22' }} />
              <span style={{ fontSize: '0.95rem', color: '#1e130c', fontWeight: 500 }}>Visualizar como Discente</span>
            </button>
            <button onClick={() => { handleEdit(dropdownLesson); setOpenDropdown(null); }} className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors">
              <Edit size={16} style={{ color: '#8b6d22' }} />
              <span style={{ fontSize: '0.95rem', color: '#1e130c', fontWeight: 500 }}>Inscrever Alterações</span>
            </button>
            <div className="border-t border-[#1e130c]/10 mt-3 pt-3">
              <button 
                onClick={() => { handleDelete(dropdownLesson); setOpenDropdown(null); }}
                className="w-full px-5 py-3 text-left hover:bg-[#7a6350]/10 flex items-center justify-start gap-4 transition-colors"
              >
                <Trash2 size={16} className="text-[#7a6350] italic" />
                <span style={{ fontSize: '0.95rem', color: '#7a6350', fontWeight: 600 }}>Expurgar Registro</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
