'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Plus, Edit, Trash2, Search, Filter, GraduationCap, X, AlertCircle, Link2, CheckSquare, Square, Trash, Check } from 'lucide-react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Spinner from '../../components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

type Subject = Database['public']['Tables']['subjects']['Row']
type SubjectLessonView = Database['public']['Views']['subject_lessons_view']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Course = Database['public']['Tables']['courses']['Row']

interface LessonAssociationOption {
  id: string
  displayName: string
  description?: string | null
  availability: 'available' | 'current' | 'assignedElsewhere'
  statusText: string
  statusColorClass: string
  contentType?: string | null
  durationMinutes?: number | null
}

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
  const [lessonAssociationOptions, setLessonAssociationOptions] = useState<LessonAssociationOption[]>([])
  const [lessonAvailableItems, setLessonAvailableItems] = useState<LessonAssociationOption[]>([])
  const [showOnlyAvailableLessons, setShowOnlyAvailableLessons] = useState(true)
  const [selectedLessonOptions, setSelectedLessonOptions] = useState<string[]>([])
  const [currentLessonAssociations, setCurrentLessonAssociations] = useState<string[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [lessonCount, setLessonCount] = useState<{ [key: string]: number }>({})
  const [currentModuleOrder, setCurrentModuleOrder] = useState<number | null>(null)
  const [subjectModuleId, setSubjectModuleId] = useState<string | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [deletingMultiple, setDeletingMultiple] = useState(false)
  const [subjectSortMode, setSubjectSortMode] = useState<'code' | 'name'>('code')
  
  const supabase = createClient()

  const sortLessonOptions = (options: LessonAssociationOption[]) => {
    const priority = {
      available: 0,
      current: 1,
      assignedElsewhere: 2
    } as const

    return [...options].sort((a, b) => {
      const priorityDiff = priority[a.availability] - priority[b.availability]
      if (priorityDiff !== 0) return priorityDiff
      return a.displayName.toLocaleLowerCase('pt-BR').localeCompare(
        b.displayName.toLocaleLowerCase('pt-BR'),
        'pt-BR'
      )
    })
  }

  const updateLessonAvailableItems = (
    options: LessonAssociationOption[],
    onlyAvailable: boolean
  ) => {
    const filtered = onlyAvailable
      ? options.filter(option => option.availability === 'available')
      : options

    setLessonAvailableItems(sortLessonOptions(filtered))

    if (onlyAvailable) {
      setSelectedLessonOptions(prev => prev.filter(id => {
        const option = options.find(item => item.id === id)
        return option ? option.availability === 'available' : false
      }))
    }
  }

  const toggleLessonFilterMode = () => {
    setShowOnlyAvailableLessons(prev => {
      const nextValue = !prev
      updateLessonAvailableItems(lessonAssociationOptions, nextValue)
      return nextValue
    })
  }

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
        .order('code')

      if (error) throw error

      setSubjects(subjectsData || [])

      // Fetch course count for each subject
      if (subjectsData && subjectsData.length > 0) {
        const { data: courseSubjects } = await supabase
          .from('course_subjects')
          .select('subject_id')

        if (courseSubjects) {
          const counts: { [key: string]: number } = {}
          courseSubjects.forEach((cs: any) => {
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
          subjectLessons.forEach((sl: any) => {
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

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSubjects([])
      setSelectAll(false)
    } else {
      setSelectedSubjects(sortedSubjects.map((s: any) => s.id))
      setSelectAll(true)
    }
  }

  const handleSelectSubject = (subjectId: string) => {
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter((id: any) => id !== subjectId))
      setSelectAll(false)
    } else {
      setSelectedSubjects([...selectedSubjects, subjectId])
      if (selectedSubjects.length + 1 === sortedSubjects.length) {
        setSelectAll(true)
      }
    }
  }

  const handleDeleteMultiple = async () => {
    if (selectedSubjects.length === 0) return
    
    const subjectNames = subjects
      .filter((s: any) => selectedSubjects.includes(s.id))
      .map((s: any) => s.name)
      .join(', ')
    
    if (!confirm(`Tem certeza que deseja excluir ${selectedSubjects.length} disciplina(s)?\n\nDisciplinas: ${subjectNames}`)) {
      return
    }

    setDeletingMultiple(true)
    setMessage(null)

    try {
      // Verificar se as disciplinas estão sendo usadas
      const { data: usedSubjects } = await supabase
        .from('module_subjects')
        .select('subject_id')
        .in('subject_id', selectedSubjects)

      const usedIds = usedSubjects?.map((ms: any) => ms.subject_id) || []
      const safeToDelete = selectedSubjects.filter((id: any) => !usedIds.includes(id))
      const cannotDelete = selectedSubjects.filter((id: any) => usedIds.includes(id))

      if (cannotDelete.length > 0) {
        const cannotDeleteNames = subjects
          .filter((s: any) => cannotDelete.includes(s.id))
          .map((s: any) => s.name)
          .join(', ')
        
        if (safeToDelete.length === 0) {
          setMessage({ 
            type: 'error', 
            text: `Não foi possível excluir as disciplinas selecionadas pois estão sendo usadas em módulos` 
          })
          return
        } else {
          setMessage({ 
            type: 'error', 
            text: `Algumas disciplinas não puderam ser excluídas pois estão em uso: ${cannotDeleteNames}` 
          })
        }
      }

      if (safeToDelete.length > 0) {
        // Primeiro, remover associações com aulas
        await supabase
          .from('subject_lessons')
          .delete()
          .in('subject_id', safeToDelete)

        // Depois, excluir as disciplinas
        const { error } = await supabase
          .from('subjects')
          .delete()
          .in('id', safeToDelete)

        if (error) throw error

        setMessage({ 
          type: 'success', 
          text: `${safeToDelete.length} disciplina(s) excluída(s) com sucesso` 
        })
        
        // Limpar seleção e recarregar
        setSelectedSubjects([])
        setSelectAll(false)
        await fetchSubjects()
      }
    } catch (error: any) {
      console.error('Error deleting subjects:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao excluir disciplinas' 
      })
    } finally {
      setDeletingMultiple(false)
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
    setSelectedLessonOptions([])
    setLessonAssociationOptions([])
    setLessonAvailableItems([])
    setShowOnlyAvailableLessons(true)
    setCurrentLessonAssociations([])

    try {
      const [{ data: lessonsData, error: lessonsError }, { data: lessonLinks, error: lessonLinksError }] = await Promise.all([
        supabase.from('lessons').select('id, title, description, content_type, duration_minutes').order('title'),
        supabase.from('subject_lessons').select('subject_id, lesson_id')
      ])

      if (lessonsError) throw lessonsError
      if (lessonLinksError) throw lessonLinksError

      const associationMap = new Map<string, Set<string>>()
      lessonLinks?.forEach((link: any) => {
        if (!associationMap.has(link.lesson_id)) {
          associationMap.set(link.lesson_id, new Set())
        }
        associationMap.get(link.lesson_id)!.add(link.subject_id)
      })

      const options: LessonAssociationOption[] = (lessonsData || []).map((lesson: Lesson) => {
        const associatedSubjects = associationMap.get(lesson.id)
        const isAssociatedWithCurrent = associatedSubjects?.has(subject.id) || false
        const otherAssociations = associatedSubjects
          ? associatedSubjects.size - (isAssociatedWithCurrent ? 1 : 0)
          : 0

        const availability: LessonAssociationOption['availability'] = !associatedSubjects || associatedSubjects.size === 0
          ? 'available'
          : isAssociatedWithCurrent
          ? 'current'
          : 'assignedElsewhere'

        const statusText = availability === 'available'
          ? 'Disponível para associação'
          : availability === 'current'
          ? 'Já faz parte desta disciplina'
          : `Associada a ${otherAssociations} outra${otherAssociations === 1 ? '' : 's'} disciplina${otherAssociations === 1 ? '' : 's'}`

        return {
          id: lesson.id,
          displayName: lesson.title,
          description: lesson.description,
          availability,
          statusText,
          statusColorClass:
            availability === 'available'
              ? 'text-green-400'
              : availability === 'current'
              ? 'text-gold-400'
              : 'text-orange-300',
          contentType: lesson.content_type,
          durationMinutes: lesson.duration_minutes
        }
      })

      const currentIds = options.filter(option => option.availability === 'current').map(option => option.id)

      setLessonAssociationOptions(options)
      setCurrentLessonAssociations(currentIds)
      updateLessonAvailableItems(options, true)
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
      const toAdd = selectedLessonOptions.filter(id => !currentLessonAssociations.includes(id))

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('subject_lessons')
          .insert(
            toAdd.map((lessonId: any) => ({
              subject_id: selectedSubjectForLessons.id,
              lesson_id: lessonId
            }))
          )

        if (error) throw error
      }

      if (toAdd.length > 0) {
        setMessage({ type: 'success', text: 'Aulas associadas com sucesso!' })
      }

      setShowLessonsModal(false)
      await fetchSubjects()
    } catch (error: any) {
      console.error('Error saving associations:', error)
      setMessage({ type: 'error', text: error.message || 'Erro ao associar aulas' })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredSubjects = useMemo(() => (
    subjects.filter((subject: any) =>
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  ), [subjects, searchTerm])

  const sortedSubjects = useMemo(() => {
    const list = [...filteredSubjects]

    if (subjectSortMode === 'code') {
      return list.sort((a, b) => {
        const codeA = (a.code || '').toString()
        const codeB = (b.code || '').toString()
        const codeCompare = codeA.localeCompare(codeB, 'pt-BR', { sensitivity: 'base', numeric: true })
        if (codeCompare !== 0) return codeCompare
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      })
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
  }, [filteredSubjects, subjectSortMode])

  const totalCourses = Object.values(courseCount).reduce((sum, count) => sum + count, 0)
  const averageCoursesPerSubject = subjects.length > 0 
    ? (totalCourses / subjects.length).toFixed(1) 
    : '0.0'
  const totalHours = subjects.reduce((sum, subject) => sum + (subject.hours || 0), 0)

  useEffect(() => {
    setSelectedSubjects(prev => {
      const filtered = prev.filter(id => sortedSubjects.some(subject => subject.id === id))
      const allSelected = filtered.length > 0 && filtered.length === sortedSubjects.length
      setSelectAll(allSelected)
      return filtered
    })
  }, [sortedSubjects])

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
            <GraduationCap className="w-8 h-8 text-gold-400" />
            Disciplinas
          </h1>
          <p className="text-gold-300 mt-1">Gerencie as disciplinas disponíveis na plataforma</p>
        </div>
        <Button 
          onClick={openCreateModal}
          icon={<Plus className="w-4 h-4 flex-shrink-0" />}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
          {selectedSubjects.length > 0 && (
          <Button 
            variant="secondary"
            icon={deletingMultiple ? <Spinner size="sm" /> : <Trash className="w-4 h-4" />}
            onClick={handleDeleteMultiple}
            disabled={deletingMultiple}
          >
            {deletingMultiple ? 'Excluindo...' : `Excluir ${selectedSubjects.length} selecionado(s)`}
          </Button>
          )}
          <Button 
            variant="secondary"
            icon={<Filter className="w-4 h-4 flex-shrink-0" />}
          >
            Filtros
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm mt-4">
          <span className="text-gold-400/80 font-medium">Ordenar por:</span>
          <button
            type="button"
            onClick={() => setSubjectSortMode('code')}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              subjectSortMode === 'code'
                ? 'border-gold-500 text-gold-100 bg-gold-500/10'
                : 'border-gold-500/20 text-gold-300 hover:border-gold-500/40 hover:bg-navy-800'
            }`}
          >
            Código (A-Z)
          </button>
          <button
            type="button"
            onClick={() => setSubjectSortMode('name')}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              subjectSortMode === 'name'
                ? 'border-gold-500 text-gold-100 bg-gold-500/10'
                : 'border-gold-500/20 text-gold-300 hover:border-gold-500/40 hover:bg-navy-800'
            }`}
          >
            Nome (A-Z)
          </button>
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gold-300 mt-2">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={sortedSubjects.length === 0}
              aria-pressed={selectAll && sortedSubjects.length > 0}
              className={`text-gold-400 hover:text-gold-200 transition-colors ${
                sortedSubjects.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {selectAll && sortedSubjects.length > 0 ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span>
              {selectAll && sortedSubjects.length > 0
                ? 'Resultados filtrados selecionados'
                : 'Selecionar resultados filtrados'}
            </span>
          </div>
        )}
      </Card>

      {/* Subjects Table */}
      <Card>
        <div className="overflow-x-auto table-sticky">
          <table className="w-full table-density density-compact">
            <thead className="bg-navy-800/80 backdrop-blur-sm sticky top-0 z-10">
              <tr className="border-b border-gold-500/20">
                <th className="text-center py-4 px-4 text-gold-200 font-medium w-12">
                  <button
                    onClick={handleSelectAll}
                    className="text-gold-400 hover:text-gold-200 transition-colors"
                  >
                    {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                </th>
                <th scope="col" className="text-left text-gold-200 font-medium">Código</th>
                <th scope="col" className="text-left text-gold-200 font-medium">Nome</th>
                <th scope="col" className="text-left text-gold-200 font-medium">Descrição</th>
                <th scope="col" className="text-right text-gold-200 font-medium">Horas</th>
                <th scope="col" className="text-right text-gold-200 font-medium">Aulas</th>
                <th scope="col" className="text-right text-gold-200 font-medium">Cursos</th>
                <th scope="col" className="text-left text-gold-200 font-medium">Criado em</th>
                <th scope="col" className="text-center text-gold-200 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedSubjects.length > 0 ? (
                sortedSubjects.map((subject) => (
                  <tr key={subject.id} className="border-b border-gold-500/10 hover:bg-navy-800/30">
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleSelectSubject(subject.id)}
                        className="text-gold-400 hover:text-gold-200 transition-colors"
                      >
                        {selectedSubjects.includes(subject.id) ? 
                          <CheckSquare className="w-5 h-5" /> : 
                          <Square className="w-5 h-5" />
                        }
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gold-400 font-mono">{subject.code || '-'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gold-100 font-medium">{subject.name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gold-300 text-sm">{subject.description || '-'}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-gold-200">{subject.hours ? `${subject.hours}h` : '-'}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-gold-200">{lessonCount[subject.id] || 0}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-gold-200">{courseCount[subject.id] || 0}</span>
                    </td>
                    <td className="py-4 px-4 text-left">
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
                          icon={<Link2 className="w-4 h-4 flex-shrink-0" />}
                        >
                          {''}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleEdit(subject)}
                          title="Editar"
                          icon={<Edit className="w-4 h-4 flex-shrink-0" />}
                        >
                          {''}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleDelete(subject)}
                          title="Excluir"
                          icon={<Trash2 className="w-4 h-4 flex-shrink-0" />}
                        >
                          {''}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
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
                  Carga Horária (Calculada Automaticamente)
                </label>
                <input
                  type="number"
                  value={formData.hours}
                  readOnly
                  className="w-full px-4 py-2 bg-navy-800/50 border border-gold-500/20 rounded-lg text-gold-300 cursor-not-allowed"
                  placeholder="Calculado automaticamente"
                />
                <p className="text-xs text-gold-300 mt-1">
                  ⚡ Horas calculadas automaticamente com base no curso: Total do curso ÷ módulos ÷ disciplinas
                </p>
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
                      <Spinner size="sm" className="mr-2" />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-2xl" padding="lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                  <Link2 className="w-6 h-6" />
                  Associar Aulas
                </h2>
                <p className="text-gold-300 text-sm mt-1">
                  Disciplina: <span className="text-gold-100 font-medium">{selectedSubjectForLessons.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowLessonsModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {lessonsLoading ? (
              <div className="flex justify-center items-center py-16">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                {lessonAssociationOptions.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-sm text-gold-300">
                    <p className="text-gold-200">
                      {showOnlyAvailableLessons
                        ? 'Exibindo apenas itens disponíveis para associação.'
                        : 'Exibindo todos os itens, com destaque para os já utilizados.'}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={toggleLessonFilterMode}
                    >
                      {showOnlyAvailableLessons ? 'Ver todos os itens' : 'Ver somente disponíveis'}
                    </Button>
                  </div>
                )}

                <div className="overflow-y-auto pr-1" style={{ maxHeight: '50vh' }}>
                  {lessonAvailableItems.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                      <p className="text-gold-300">Nenhuma aula disponível</p>
                      <p className="text-gold-400 text-sm mt-2">
                        Crie novas aulas na página correspondente antes de associá-las
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lessonAvailableItems.map((item) => {
                        const isDisabled = item.availability === 'current'
                        const isSelected = selectedLessonOptions.includes(item.id)
                        const contentLabel = item.contentType === 'video'
                          ? 'Vídeo'
                          : item.contentType === 'text'
                          ? 'Texto'
                          : item.contentType === 'quiz'
                          ? 'Quiz'
                          : null

                        const labelClasses = `flex items-center gap-3 p-3 bg-navy-900/50 rounded-lg ${
                          isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-navy-900/70 cursor-pointer'
                        }`

                        const handleToggle = (checked: boolean) => {
                          setSelectedLessonOptions(prev => {
                            if (checked) {
                              return prev.includes(item.id) ? prev : [...prev, item.id]
                            }
                            return prev.filter(id => id !== item.id)
                          })
                        }

                        return (
                          <label key={item.id} className={labelClasses}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggle(e.target.checked)}
                              disabled={isDisabled}
                              className="w-4 h-4 bg-navy-900/50 border-navy-600 rounded text-gold-500 focus:ring-gold-500 disabled:opacity-50"
                            />
                            <div className="flex-1">
                              <p className="text-gold-200 font-medium">{item.displayName}</p>
                              {item.description && (
                                <p className="text-gold-400 text-sm">{item.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gold-400 mt-1">
                                {contentLabel && <span>{contentLabel}</span>}
                                {typeof item.durationMinutes === 'number' && (
                                  <span>{item.durationMinutes} min</span>
                                )}
                              </div>
                              {item.statusText && (
                                <p className={`text-xs mt-1 ${item.statusColorClass}`}>
                                  {item.statusText}
                                </p>
                              )}
                            </div>
                            {isSelected && !isDisabled && <Check className="w-5 h-5 text-green-400" />}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-gold-500/20 mt-6">
              <p className="text-gold-300 text-sm">
                {selectedLessonOptions.length} {selectedLessonOptions.length === 1 ? 'aula selecionada' : 'aulas selecionadas'}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowLessonsModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={saveLessonAssociations}
                  disabled={selectedLessonOptions.length === 0 || submitting || lessonsLoading}
                >
                  {submitting ? 'Confirmando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
