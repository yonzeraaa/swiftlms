'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, Edit, Trash2, Search, Filter, GraduationCap, X, Loader2, AlertCircle, Link2, CheckCircle2 } from 'lucide-react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

type Subject = Database['public']['Tables']['subjects']['Row']
type SubjectLessonView = Database['public']['Views']['subject_lessons_view']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Course = Database['public']['Tables']['courses']['Row']

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    hours: '',
    moduleOrderIndex: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [courseCount, setCourseCount] = useState<{ [key: string]: number }>({})
  const [showLessonsModal, setShowLessonsModal] = useState(false)
  const [selectedSubjectForLessons, setSelectedSubjectForLessons] = useState<Subject | null>(null)
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([])
  const [associatedLessons, setAssociatedLessons] = useState<string[]>([])
  const [selectedLessons, setSelectedLessons] = useState<string[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [lessonCount, setLessonCount] = useState<{ [key: string]: number }>({})
  const [currentModuleOrder, setCurrentModuleOrder] = useState<number | null>(null)
  const [subjectModuleId, setSubjectModuleId] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      
      // Fetch subjects
      const { data: subjectsData, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name')

      if (error) throw error

      setSubjects(subjectsData || [])

      // Fetch course count for each subject
      if (subjectsData && subjectsData.length > 0) {
        const { data: courseSubjects } = await supabase
          .from('course_subjects')
          .select('subject_id')

        if (courseSubjects) {
          const counts: { [key: string]: number } = {}
          courseSubjects.forEach(cs => {
            counts[cs.subject_id] = (counts[cs.subject_id] || 0) + 1
          })
          setCourseCount(counts)
        }

        // Fetch lesson count for each subject
        const { data: subjectLessons } = await supabase
          .from('subject_lessons')
          .select('subject_id')

        if (subjectLessons) {
          const lessonCounts: { [key: string]: number } = {}
          subjectLessons.forEach(sl => {
            lessonCounts[sl.subject_id] = (lessonCounts[sl.subject_id] || 0) + 1
          })
          setLessonCount(lessonCounts)
        }
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar disciplinas' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      if (editingSubject) {
        // Update existing subject
        const { error } = await supabase
          .from('subjects')
          .update({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            hours: formData.hours ? parseInt(formData.hours) : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSubject.id)

        if (error) throw error
        
        // Atualizar ordem no módulo se aplicável
        if (subjectModuleId && formData.moduleOrderIndex !== '') {
          const { error: orderError } = await supabase
            .from('module_subjects')
            .update({ order_index: parseInt(formData.moduleOrderIndex) })
            .eq('id', subjectModuleId)
          
          if (orderError) throw orderError
        }
        
        setMessage({ type: 'success', text: 'Disciplina atualizada com sucesso!' })
      } else {
        // Create new subject
        const { error } = await supabase
          .from('subjects')
          .insert({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            hours: formData.hours ? parseInt(formData.hours) : null
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Disciplina criada com sucesso!' })
      }

      // Reset form and refresh data
      setFormData({ name: '', code: '', description: '', hours: '', moduleOrderIndex: '' })
      setEditingSubject(null)
      setCurrentModuleOrder(null)
      setSubjectModuleId(null)
      setShowModal(false)
      await fetchSubjects()
    } catch (error: any) {
      console.error('Error saving subject:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao salvar disciplina' 
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (subject: Subject) => {
    setEditingSubject(subject)
    setFormData({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      hours: subject.hours?.toString() || '',
      moduleOrderIndex: ''
    })
    
    // Buscar a ordem atual no módulo se a disciplina estiver associada a algum módulo
    const { data: moduleSubject } = await supabase
      .from('module_subjects')
      .select('order_index, id')
      .eq('subject_id', subject.id)
      .single()
    
    if (moduleSubject) {
      setCurrentModuleOrder(moduleSubject.order_index)
      setSubjectModuleId(moduleSubject.id)
      setFormData(prev => ({ ...prev, moduleOrderIndex: moduleSubject.order_index?.toString() || '' }))
    } else {
      setCurrentModuleOrder(null)
      setSubjectModuleId(null)
    }
    
    setShowModal(true)
  }

  const handleDelete = async (subject: Subject) => {
    if (!confirm(`Tem certeza que deseja excluir a disciplina "${subject.name}"?`)) {
      return
    }

    try {
      // Check if subject is being used
      const usageCount = courseCount[subject.id] || 0
      if (usageCount > 0) {
        setMessage({ 
          type: 'error', 
          text: `Não é possível excluir. Esta disciplina está vinculada a ${usageCount} curso(s).` 
        })
        return
      }

      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subject.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Disciplina excluída com sucesso!' })
      await fetchSubjects()
    } catch (error: any) {
      console.error('Error deleting subject:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao excluir disciplina' 
      })
    }
  }

  const openCreateModal = () => {
    setEditingSubject(null)
    setFormData({ name: '', code: '', description: '', hours: '', moduleOrderIndex: '' })
    setCurrentModuleOrder(null)
    setSubjectModuleId(null)
    setShowModal(true)
  }

  const openLessonsModal = async (subject: Subject) => {
    setSelectedSubjectForLessons(subject)
    setShowLessonsModal(true)
    setLessonsLoading(true)
    setSelectedLessons([])

    try {
      // Fetch all lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('title')

      if (lessonsError) throw lessonsError

      setAvailableLessons(lessonsData || [])

      // Fetch already associated lessons
      const { data: associatedData, error: associatedError } = await supabase
        .from('subject_lessons')
        .select('lesson_id')
        .eq('subject_id', subject.id)

      if (associatedError) throw associatedError

      const associatedIds = associatedData?.map(sl => sl.lesson_id) || []
      setAssociatedLessons(associatedIds)
      setSelectedLessons(associatedIds)
    } catch (error) {
      console.error('Error fetching lessons:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar aulas' })
    } finally {
      setLessonsLoading(false)
    }
  }

  const saveLessonAssociations = async () => {
    if (!selectedSubjectForLessons) return
    setSubmitting(true)

    try {
      // Get lessons to add and remove
      const toAdd = selectedLessons.filter(id => !associatedLessons.includes(id))
      const toRemove = associatedLessons.filter(id => !selectedLessons.includes(id))

      // Remove associations
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('subject_lessons')
          .delete()
          .eq('subject_id', selectedSubjectForLessons.id)
          .in('lesson_id', toRemove)

        if (error) throw error
      }

      // Add new associations
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('subject_lessons')
          .insert(
            toAdd.map(lessonId => ({
              subject_id: selectedSubjectForLessons.id,
              lesson_id: lessonId
            }))
          )

        if (error) throw error
      }

      setMessage({ type: 'success', text: 'Aulas associadas com sucesso!' })
      setShowLessonsModal(false)
      await fetchSubjects()
    } catch (error: any) {
      console.error('Error saving associations:', error)
      setMessage({ type: 'error', text: error.message || 'Erro ao associar aulas' })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalCourses = Object.values(courseCount).reduce((sum, count) => sum + count, 0)
  const averageCoursesPerSubject = subjects.length > 0 
    ? (totalCourses / subjects.length).toFixed(1) 
    : '0.0'
  const totalHours = subjects.reduce((sum, subject) => sum + (subject.hours || 0), 0)

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
          <h1 className="text-3xl font-bold text-gold">Disciplinas</h1>
          <p className="text-gold-300 mt-1">Gerencie as disciplinas disponíveis na plataforma</p>
        </div>
        <Button 
          onClick={openCreateModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Nova Disciplina
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Disciplinas</p>
              <p className="text-2xl font-bold text-gold mt-1">{subjects.length}</p>
            </div>
            <BookOpen className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Disciplinas com Cursos</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {Object.keys(courseCount).length}
              </p>
            </div>
            <GraduationCap className="w-8 h-8 text-green-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Vínculos</p>
              <p className="text-2xl font-bold text-gold mt-1">{totalCourses}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Horas</p>
              <p className="text-2xl font-bold text-gold mt-1">{totalHours}h</p>
            </div>
            <GraduationCap className="w-8 h-8 text-purple-500/30" />
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
              placeholder="Buscar por nome, código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <Button 
            variant="secondary"
            icon={<Filter className="w-4 h-4" />}
          >
            Filtros
          </Button>
        </div>
      </Card>

      {/* Subjects Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold-500/20">
                <th className="text-left py-4 px-4 text-gold-200 font-medium">Código</th>
                <th className="text-left py-4 px-4 text-gold-200 font-medium">Nome</th>
                <th className="text-left py-4 px-4 text-gold-200 font-medium">Descrição</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Horas</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Aulas</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Cursos</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Criado em</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="border-b border-gold-500/10 hover:bg-navy-800/30">
                    <td className="py-4 px-4">
                      <span className="text-gold-400 font-mono">{subject.code || '-'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gold-100 font-medium">{subject.name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gold-300 text-sm">{subject.description || '-'}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gold-200">{subject.hours ? `${subject.hours}h` : '-'}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gold-200">{lessonCount[subject.id] || 0}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gold-200">{courseCount[subject.id] || 0}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gold-300 text-sm">
                        {new Date(subject.created_at || '').toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => openLessonsModal(subject)}
                          title="Associar Aulas"
                          icon={<Link2 className="w-4 h-4" />}
                        >
                          {''}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleEdit(subject)}
                          title="Editar"
                          icon={<Edit className="w-4 h-4" />}
                        >
                          {''}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleDelete(subject)}
                          title="Excluir"
                          icon={<Trash2 className="w-4 h-4" />}
                        >
                          {''}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <BookOpen className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                    <p className="text-gold-300">
                      {searchTerm ? 'Nenhuma disciplina encontrada com os critérios de busca' : 'Nenhuma disciplina cadastrada'}
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
        <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-navy-800 rounded-2xl max-w-md w-full p-6 border border-gold-500/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gold">
                {editingSubject ? 'Editar Disciplina' : 'Nova Disciplina'}
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
                  Nome da Disciplina *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Ex: Matemática Básica"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Código
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Ex: MAT101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Carga Horária
                </label>
                <input
                  type="number"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Ex: 60"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-gold-300 mt-1">Número de horas da disciplina</p>
              </div>

              {editingSubject && currentModuleOrder !== null && (
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    Ordem no Módulo
                  </label>
                  <input
                    type="number"
                    value={formData.moduleOrderIndex}
                    onChange={(e) => setFormData({ ...formData, moduleOrderIndex: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="Ex: 1"
                    min="0"
                    step="1"
                  />
                  <p className="text-xs text-gold-300 mt-1">Posição da disciplina dentro do módulo</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Breve descrição da disciplina..."
                  rows={3}
                />
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
                    editingSubject ? 'Atualizar' : 'Criar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lessons Association Modal */}
      {showLessonsModal && selectedSubjectForLessons && (
        <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-navy-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gold-500/20">
            <div className="flex items-center justify-between p-6 border-b border-gold-500/20">
              <div>
                <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                  <Link2 className="w-6 h-6" />
                  Associar Aulas
                </h2>
                <p className="text-gold-300 mt-1">
                  Disciplina: {selectedSubjectForLessons.name}
                </p>
              </div>
              <button
                onClick={() => setShowLessonsModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {lessonsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-gold-200">
                      Selecione as aulas para associar com esta disciplina
                    </p>
                    <span className="text-gold-300 text-sm">
                      {selectedLessons.length} aula(s) selecionada(s)
                    </span>
                  </div>

                  {/* Display all lessons */}
                  <div className="space-y-1">
                    {availableLessons.map((lesson) => (
                      <label
                        key={lesson.id}
                        className="flex items-center gap-3 p-3 bg-navy-900/50 rounded-lg hover:bg-navy-700/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLessons.includes(lesson.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLessons([...selectedLessons, lesson.id])
                            } else {
                              setSelectedLessons(selectedLessons.filter(id => id !== lesson.id))
                            }
                          }}
                          className="w-4 h-4 text-gold-500 bg-navy-900/50 border-gold-500/50 rounded focus:ring-gold-500 focus:ring-2"
                        />
                        <div className="flex-1">
                          <p className="text-gold-100">
                            {lesson.title}
                          </p>
                          {lesson.description && (
                            <p className="text-gold-300 text-sm mt-1">
                              {lesson.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-gold-400 text-sm">
                              {lesson.content_type === 'video' ? 'Vídeo' : lesson.content_type === 'text' ? 'Texto' : 'Quiz'}
                            </span>
                            {lesson.duration_minutes && (
                              <span className="text-gold-400 text-sm">
                                {lesson.duration_minutes} min
                              </span>
                            )}
                          </div>
                        </div>
                        {associatedLessons.includes(lesson.id) && (
                          <div title="Já associada">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gold-500/20">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowLessonsModal(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={saveLessonAssociations}
                disabled={submitting || lessonsLoading}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Associações'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}