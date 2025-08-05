'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, PlayCircle, FileText, Clock, Users, MoreVertical, CheckCircle, X, Loader2, AlertCircle, BookOpen, Video, FileQuestion } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

type Lesson = Database['public']['Tables']['lessons']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type SubjectLessonView = Database['public']['Views']['subject_lessons_view']['Row']

interface LessonWithRelations extends Lesson {
  subject_lessons?: SubjectLessonView[]
}

export default function LessonsPage() {
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
  
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('title')

      if (lessonsError) throw lessonsError

      setLessons(lessonsData || [])

      // Fetch lesson progress stats
      if (lessonsData && lessonsData.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, is_completed')

        if (progressData) {
          const progressStats: { [key: string]: { completed: number, total: number } } = {}
          
          progressData.forEach(progress => {
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

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
  const publishedLessons = lessons.filter(lesson => lesson.is_preview === false).length
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gold">Aulas</h1>
          <p className="text-gold-300 mt-1">Gerencie as aulas dos cursos</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
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
              <p className="text-gold-300 text-sm">Aulas Publicadas</p>
              <p className="text-2xl font-bold text-gold mt-1">{publishedLessons}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500/30" />
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
          <Button variant="secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>
      </Card>

      {/* Lessons Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold-500/20">
                <th className="text-left py-4 px-4 text-gold-200 font-medium">Aula</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Tipo</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Duração</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Ordem</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Conclusões</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Preview</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLessons.length > 0 ? (
                filteredLessons.map((lesson) => {
                  const progress = lessonProgress[lesson.id] || { completed: 0, total: 0 }
                  return (
                    <tr key={lesson.id} className="border-b border-gold-500/10 hover:bg-navy-800/30">
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-gold-100 font-medium">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-gold-400 text-sm mt-1">{lesson.description}</p>
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
                        <div className="flex flex-col items-center">
                          <span className="text-gold-200">{progress.completed}/{progress.total}</span>
                          {progress.total > 0 && (
                            <span className="text-gold-400 text-xs">
                              ({Math.round((progress.completed / progress.total) * 100)}%)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lesson.is_preview
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {lesson.is_preview ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleEdit(lesson)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleDelete(lesson)}
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
        <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
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
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                    className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                    className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                    Ordem no Módulo
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
                  <label htmlFor="is_preview" className="ml-2 text-sm text-gold-200">
                    Aula de Preview (visível sem matrícula)
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
    </div>
  )
}