'use client'

import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Plus, Edit, Trash2, Search, Filter, GraduationCap, X, AlertCircle, Link2, CheckSquare, Square, Trash, Check, MoreVertical } from 'lucide-react'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'
import Button from '../../components/Button'
import Spinner from '../../components/ui/Spinner'
import { Database } from '@/lib/database.types'
import {
  getSubjectsData,
  createSubject,
  updateSubject,
  deleteSubject,
  bulkDeleteSubjects,
  getLessonsForSubject,
  associateLessonsWithSubject,
  getModuleSubject
} from '@/lib/actions/admin-subjects'
import { getAllCourses } from '@/lib/actions/admin-courses'

type Subject = Database['public']['Tables']['subjects']['Row']
type SubjectLessonView = Database['public']['Views']['subject_lessons_view']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Course = Database['public']['Tables']['courses']['Row']

type SubjectWithModules = Subject & {
  module_subjects?: Array<{
    id: string
    module_id: string
    order_index: number | null
    course_modules?: {
      id: string
      title: string
      course_id: string
      courses?: {
        id: string
        title: string
      } | null
    } | null
  }> | null
}

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
  const [subjects, setSubjects] = useState<SubjectWithModules[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number, bottom?: number, left: number, isUp?: boolean } | null>(null)
  const [dropdownSubject, setDropdownSubject] = useState<SubjectWithModules | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('todos')
  const [selectedModuleId, setSelectedModuleId] = useState<string>('todos')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
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
  const [allCourses, setAllCourses] = useState<{ id: string; title: string }[]>([])

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

      const data = await getSubjectsData()

      if (!data) {
        setMessage({ type: 'error', text: 'Erro ao carregar disciplinas' })
        return
      }

      setSubjects(data.subjects)
      setCourseCount(data.courseCounts)
      setLessonCount(data.lessonCounts)
      setAllCourses(await getAllCourses())
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
      const subjectData = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        hours: formData.hours ? parseInt(formData.hours) : undefined,
        moduleOrderIndex: formData.moduleOrderIndex ? parseInt(formData.moduleOrderIndex) : undefined,
        subjectModuleId: subjectModuleId || undefined
      }

      let result
      if (editingSubject) {
        result = await updateSubject(editingSubject.id, subjectData)
        if (result.success) {
          setMessage({ type: 'success', text: 'Disciplina atualizada com sucesso!' })
        }
      } else {
        result = await createSubject(subjectData)
        if (result.success) {
          setMessage({ type: 'success', text: 'Disciplina criada com sucesso!' })
        }
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar disciplina')
      }

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

    const moduleSubject = await getModuleSubject(subject.id)

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
    const usageCount = courseCount[subject.id] || 0
    const subjectLessonCount = lessonCount[subject.id] || 0

    let confirmMsg = `Tem certeza que deseja excluir a disciplina "${subject.name}"?`
    if (usageCount > 0 || subjectLessonCount > 0) {
      confirmMsg += `\n\n⚠️ ATENÇÃO: Esta ação removerá também:`
      if (usageCount > 0) confirmMsg += `\n- Vínculo com ${usageCount} curso(s)`
      if (subjectLessonCount > 0) confirmMsg += `\n- ${subjectLessonCount} aula(s) e seus progressos`
      confirmMsg += `\n- Todos os testes e notas relacionados`
    }

    if (!confirm(confirmMsg)) {
      return
    }

    try {
      const result = await deleteSubject(subject.id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir disciplina')
      }

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
      const result = await bulkDeleteSubjects(selectedSubjects)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir disciplinas')
      }

      setMessage({
        type: 'success',
        text: `${selectedSubjects.length} disciplina(s) excluída(s) com sucesso`
      })

      setSelectedSubjects([])
      setSelectAll(false)
      await fetchSubjects()
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
      const data = await getLessonsForSubject(subject.id)

      if (!data) {
        throw new Error('Erro ao carregar aulas')
      }

      const { lessons: lessonsData, lessonLinks } = data

      const associationMap = new Map<string, Set<string>>()
      lessonLinks?.forEach((link: any) => {
        if (!associationMap.has(link.lesson_id)) {
          associationMap.set(link.lesson_id, new Set())
        }
        associationMap.get(link.lesson_id)!.add(link.subject_id)
      })

      const options: LessonAssociationOption[] = (lessonsData || []).map((lesson: any) => {
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
              ? 'text-[#1e130c] font-bold'
              : availability === 'current'
              ? 'text-[#8b6d22]'
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
        const result = await associateLessonsWithSubject(selectedSubjectForLessons.id, toAdd)

        if (!result.success) {
          throw new Error(result.error || 'Erro ao associar aulas')
        }

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

  const availableModules = useMemo(() => {
    const modulesMap = new Map<string, { id: string; title: string }>()

    subjects.forEach(subject => {
      if (subject.module_subjects && subject.module_subjects.length > 0) {
        subject.module_subjects.forEach(ms => {
          if (ms.course_modules && !modulesMap.has(ms.course_modules.id)) {
            modulesMap.set(ms.course_modules.id, {
              id: ms.course_modules.id,
              title: ms.course_modules.title
            })
          }
        })
      }
    })

    return Array.from(modulesMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
    )
  }, [subjects])

  const availableCourses = useMemo(() => {
    const coursesMap = new Map<string, { id: string; title: string }>()

    subjects.forEach(subject => {
      subject.module_subjects?.forEach(ms => {
        const course = ms.course_modules?.courses
        if (course && !coursesMap.has(course.id)) {
          coursesMap.set(course.id, { id: course.id, title: course.title })
        }
      })
    })

    return Array.from(coursesMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
    )
  }, [subjects])

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch =
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()))

      if (!matchesSearch) return false

      if (selectedCourseId !== 'todos') {
        const matchesCourse = subject.module_subjects?.some(
          ms => ms.course_modules?.course_id === selectedCourseId
        ) ?? false
        if (!matchesCourse) return false
      }

      if (selectedModuleId === 'todos') return true

      if (selectedModuleId === 'sem-modulo') {
        return !subject.module_subjects || subject.module_subjects.length === 0
      }

      return subject.module_subjects?.some(ms => ms.module_id === selectedModuleId) ?? false
    })
  }, [subjects, searchTerm, selectedCourseId, selectedModuleId])

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

  const totalPages = Math.ceil(sortedSubjects.length / itemsPerPage)
  const paginatedSubjects = sortedSubjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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

  return (    <div className="max-w-[1400px] mx-auto p-6 md:p-10 space-y-8 bg-[#faf6ee] min-h-screen font-[family-name:var(--font-lora)] text-[#1e130c]">
      
      {/* Header Clássico */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#1e130c', lineHeight: 1.1, fontWeight: 700 }}>
            Gestão de Disciplinas
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: '#7a6350', marginTop: '0.5rem' }}>
            Gerencie as disciplinas disponíveis na academia.
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color="#1e130c" />
          </div>
        </div>
        <button
          onClick={openCreateModal}
          style={{ padding: '1rem 3rem', backgroundColor: '#1e130c', color: '#faf6ee', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          Nova Disciplina
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

      {/* Stats Area (Instead of Cards, use classic summary text) */}
      <div className="border-b border-t border-[#1e130c]/20 py-4 mb-8 flex flex-wrap justify-between gap-6 bg-[#faf6ee]/50 text-center sm:text-left">
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Total de Registros</p>
          <p className="text-2xl font-bold text-[#1e130c]">{subjects.length}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Cursos Relacionados</p>
          <p className="text-2xl font-bold text-[#1e130c]">{Object.keys(courseCount).length}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Total de Vínculos</p>
          <p className="text-2xl font-bold text-[#1e130c]">{totalCourses}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Carga Horária (Total)</p>
          <p className="text-2xl font-bold text-[#1e130c]">{totalHours}h</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6d22]" />
            <input
              type="text"
              placeholder="Buscar por nome, código ou descrição..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-4 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
            />
          </div>
          {selectedSubjects.length > 0 && (
          <Button
            variant="secondary"
            icon={deletingMultiple ? <Spinner size="sm" /> : <Trash className="w-4 h-4" />}
            onClick={handleDeleteMultiple}
            disabled={deletingMultiple}
          >
            {deletingMultiple ? 'Expurgando...' : `Expurgar ${selectedSubjects.length} selecionado(s)`}
          </Button>
          )}
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-[#8b6d22] flex-shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => { setSelectedCourseId(e.target.value); setCurrentPage(1); }}
              className="px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer min-w-[180px]"
            >
              <option value="todos">Todos os cursos</option>
              {allCourses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <select
              value={selectedModuleId}
              onChange={(e) => { setSelectedModuleId(e.target.value); setCurrentPage(1); }}
              className="px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer min-w-[180px]"
            >
              <option value="todos">Todos os módulos</option>
              <option value="sem-modulo">Sem módulo</option>
              {availableModules.map(module => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 text-sm pt-2">
          <span className="text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Ordenação:</span>
          <button
            type="button"
            onClick={() => setSubjectSortMode('code')}
            className={`px-3 py-1 border-b-2 transition-colors ${
              subjectSortMode === 'code'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }`}
          >
            Código (A-Z)
          </button>
          <button
            type="button"
            onClick={() => setSubjectSortMode('name')}
            className={`px-3 py-1 border-b-2 transition-colors ${
              subjectSortMode === 'name'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }`}
          >
            Nome (A-Z)
          </button>
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-[#7a6350] mt-2 italic">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={sortedSubjects.length === 0}
              aria-pressed={selectAll && sortedSubjects.length > 0}
              className={`text-[#8b6d22] hover:text-[#1e130c] transition-colors ${
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
      </div>

      {(selectedCourseId !== 'todos' || selectedModuleId !== 'todos' || searchTerm) && (
        <p className="text-sm text-[#7a6350] mb-4 italic">
          A exibir {filteredSubjects.length} de {subjects.length} registros.
        </p>
      )}

      {/* Subjects Directory List */}
      {loading ? (
        <Spinner fullPage size="xl" />
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm sm:text-base border-collapse">
          <thead className="bg-transparent sticky top-0 z-10 border-b-2 border-[#1e130c]/30">
            <tr>
              <th className="text-center py-4 px-4 text-[#7a6350] font-medium w-12">
                <button
                  onClick={handleSelectAll}
                  className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                >
                  {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
              </th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Código</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Nome</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Descrição</th>
              <th scope="col" className="text-right py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Horas</th>
              <th scope="col" className="text-right py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Aulas</th>
              <th scope="col" className="text-right py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Cursos</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Lavrado em</th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSubjects.length > 0 ? (
              paginatedSubjects.map((subject) => (
                <tr key={subject.id} className="border-b border-dashed border-[#1e130c]/20 hover:bg-[#1e130c]/5 transition-colors">
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleSelectSubject(subject.id)}
                      className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                    >
                      {selectedSubjects.includes(subject.id) ? 
                        <CheckSquare className="w-5 h-5" /> : 
                        <Square className="w-5 h-5" />
                      }
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[#8b6d22] font-mono text-sm">{subject.code || '-'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[#1e130c] font-medium" title={subject.name}>
                      {subject.name.length > 30 ? `${subject.name.substring(0, 30)}...` : subject.name}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[#7a6350] italic text-sm">{subject.description || '-'}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-[#1e130c] font-medium">{subject.hours ? `${subject.hours}h` : '-'}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-[#1e130c]">{lessonCount[subject.id] || 0}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-[#1e130c]">{courseCount[subject.id] || 0}</span>
                  </td>
                  <td className="py-4 px-4 text-left">
                    <span className="text-[#7a6350] text-sm">
                      {new Date(subject.created_at || '').toLocaleDateString('pt-BR')}
                    </span>
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
                        setDropdownSubject(subject)
                        setOpenDropdown(subject.id)
                      }}
                      className="text-[#8b6d22] hover:text-[#1e130c] p-2 transition-transform active:scale-90"
                      title="Ações"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <BookOpen className="w-12 h-12 text-[#8b6d22]/30 mx-auto mb-3" />
                  <p className="text-[#7a6350] italic">
                    {searchTerm ? 'Nenhuma disciplina encontrada nos registros' : 'O livro de registros encontra-se vazio'}
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
        <div className="fixed inset-0 bg-[#1e130c]/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="relative bg-[#faf6ee] w-full max-w-xl p-8 md:p-10 shadow-2xl border border-[#1e130c]/20 my-8">

            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-[#1e130c] border-b-2 border-[#8b6d22] pb-2 pr-8">
                {editingSubject ? 'Editar Registro de Disciplina' : 'Novo Registro de Disciplina'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Nome da Disciplina <span className="text-[#8b6d22]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                  placeholder="Ex: Teologia Sistemática I"
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Código (Cifra)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none font-mono"
                  placeholder="Ex: TEO101"
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Carga Horária
                </label>
                <input
                  type="number"
                  value={formData.hours}
                  readOnly
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#7a6350] cursor-not-allowed rounded-none font-[family-name:var(--font-lora)] italic"
                  placeholder="Calculado automaticamente"
                />
                <p className="text-xs text-[#8b6d22] mt-2 italic">
                  * Deduzida da totalidade do curso ÷ módulos ÷ disciplinas
                </p>
              </div>

              {editingSubject && currentModuleOrder !== null && (
                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Posição no Módulo
                  </label>
                  <input
                    type="number"
                    value={formData.moduleOrderIndex}
                    onChange={(e) => setFormData({ ...formData, moduleOrderIndex: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                    placeholder="Ex: 1"
                    min="0"
                    step="1"
                  />
                </div>
              )}

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Ementa
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none resize-none"
                  placeholder="Breve sumário dos tópicos..."
                  rows={4}
                />
              </div>

              <div className="flex gap-4 pt-8 border-t border-[#1e130c]/15">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 border border-[#1e130c]/20 text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-medium text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-medium text-center flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Spinner size="sm" /> Gravando...</>
                  ) : (
                    editingSubject ? 'Salvar Alterações' : 'Criar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lessons Association Modal */}
      {showLessonsModal && selectedSubjectForLessons && (
        <div className="fixed inset-0 bg-[#1e130c]/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="relative bg-[#faf6ee] w-full max-w-3xl p-8 md:p-10 shadow-2xl border border-[#1e130c]/20 my-8">

            <div className="flex items-start justify-between mb-8 relative z-10">
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-[#1e130c] border-b-2 border-[#8b6d22] pb-2 pr-8 flex items-center gap-2">
                  <Link2 className="w-6 h-6 text-[#8b6d22]" />
                  Vincular Preleções (Aulas)
                </h2>
                <p className="text-[#7a6350] mt-3 italic">
                  Disciplina: <span className="text-[#1e130c] font-medium not-italic">{selectedSubjectForLessons.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowLessonsModal(false)}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative z-10">
              {lessonsLoading ? (
                <div className="flex justify-center items-center py-16">
                  <Spinner size="lg" className="text-[#8b6d22]" />
                </div>
              ) : (
                <>
                  {lessonAssociationOptions.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-sm text-[#7a6350] border-b border-[#1e130c]/15 pb-4">
                      <p className="italic">
                        {showOnlyAvailableLessons
                          ? 'Revelando apenas preleções vagas.'
                          : 'Exibindo o índice completo.'}
                      </p>
                      <button
                        type="button"
                        onClick={toggleLessonFilterMode}
                        className="text-[#8b6d22] hover:text-[#1e130c] underline transition-colors"
                      >
                        {showOnlyAvailableLessons ? 'Ver índice completo' : 'Ocultar já vinculadas'}
                      </button>
                    </div>
                  )}

                  <div className="overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '50vh' }}>
                    {lessonAvailableItems.length === 0 ? (
                      <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-[#8b6d22]/30 mx-auto mb-4" />
                        <p className="text-[#7a6350] italic text-lg">Nenhum registro de preleção disponível</p>
                        <p className="text-[#8b6d22] text-sm mt-2">
                          Registre novas aulas na seção correspondente antes de tentar vinculá-las.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {lessonAvailableItems.map((item) => {
                          const isDisabled = item.availability === 'current'
                          const isSelected = selectedLessonOptions.includes(item.id)
                          const contentLabel = item.contentType === 'video'
                            ? 'Cinematografia'
                            : item.contentType === 'text'
                            ? 'Manuscrito'
                            : item.contentType === 'quiz'
                            ? 'Exame'
                            : null

                          const labelClasses = `flex items-start gap-4 p-4 border ${
                            isDisabled ? 'border-[#1e130c]/10 bg-[#1e130c]/5 opacity-60 cursor-not-allowed' : 
                            isSelected ? 'border-[#8b6d22] bg-[#8b6d22]/5 cursor-pointer' : 
                            'border-[#1e130c]/15 hover:border-[#8b6d22]/50 hover:bg-[#faf6ee] cursor-pointer'
                          } transition-all`

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
                              <div className="pt-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => handleToggle(e.target.checked)}
                                  disabled={isDisabled}
                                  className="w-5 h-5 text-[#8b6d22] bg-transparent border-2 border-[#1e130c]/30 rounded-none focus:ring-[color:var(--color-focus)] focus:ring-2 disabled:opacity-50"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-[#1e130c] font-medium font-[family-name:var(--font-playfair)] text-lg">{item.displayName}</p>
                                {item.description && (
                                  <p className="text-[#7a6350] text-sm mt-1 italic">{item.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#8b6d22] mt-3">
                                  {contentLabel && <span className="uppercase tracking-widest">{contentLabel}</span>}
                                  {typeof item.durationMinutes === 'number' && (
                                    <span className="uppercase tracking-widest">{item.durationMinutes} min</span>
                                  )}
                                </div>
                                {item.statusText && (
                                  <p className={`text-xs mt-2 italic ${
                                    item.availability === 'available' ? 'text-[#1e130c] font-bold' :
                                    item.availability === 'current' ? 'text-[#8b6d22]' : 'text-amber-700'
                                  }`}>
                                    {item.statusText}
                                  </p>
                                )}
                              </div>
                              {isSelected && !isDisabled && <Check className="w-6 h-6 text-[#8b6d22] mt-1" />}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-8 border-t border-[#1e130c]/15 mt-8">
                <p className="text-[#1e130c] font-medium">
                  {selectedLessonOptions.length} {selectedLessonOptions.length === 1 ? 'preleção assinalada' : 'preleções assinaladas'}
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowLessonsModal(false)}
                    disabled={submitting}
                    className="py-2 px-6 border border-[#1e130c]/20 text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-medium text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveLessonAssociations}
                    disabled={selectedLessonOptions.length === 0 || submitting || lessonsLoading}
                    className="py-2 px-6 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-medium text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'A Lavrar...' : 'Confirmar Vínculos'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dropdown Portal ── */}
      {openDropdown && dropdownSubject && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[11000] bg-transparent" onClick={() => { setOpenDropdown(null); setDropdownSubject(null); }} />
          <div
            className="fixed w-60 bg-[#faf6ee] border border-[#1e130c]/20 shadow-2xl z-[11001] py-3 font-[family-name:var(--font-lora)]"
            style={{ top: dropdownPosition.top ? `${dropdownPosition.top + 8}px` : undefined, bottom: dropdownPosition.bottom ? `${dropdownPosition.bottom + 8}px` : undefined, left: `${dropdownPosition.left}px` }}
          >
            <div className={`absolute ${dropdownPosition.isUp ? "-bottom-2 border-b border-r" : "-top-2 border-l border-t"} right-4 w-4 h-4 bg-[#faf6ee] border-[#1e130c]/20 rotate-45`} />
            <button onClick={() => { openLessonsModal(dropdownSubject); setOpenDropdown(null); }} className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors">
              <Link2 size={16} style={{ color: '#8b6d22' }} />
              <span style={{ fontSize: '0.95rem', color: '#1e130c', fontWeight: 500 }}>Vincular Aulas</span>
            </button>
            <button onClick={() => { handleEdit(dropdownSubject); setOpenDropdown(null); }} className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors">
              <Edit size={16} style={{ color: '#8b6d22' }} />
              <span style={{ fontSize: '0.95rem', color: '#1e130c', fontWeight: 500 }}>Inscrever Alterações</span>
            </button>
            <div className="border-t border-[#1e130c]/10 mt-3 pt-3">
              <button 
                onClick={() => { handleDelete(dropdownSubject); setOpenDropdown(null); }}
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
