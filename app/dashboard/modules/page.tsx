'use client'

import { useState, useEffect, useMemo } from 'react'
import { Folder, Plus, Edit, Trash2, Search, X, AlertCircle, BookOpen, GripVertical, CheckSquare, Square, Trash, Clock, MoreVertical } from 'lucide-react'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'
import Button from '../../components/Button'
import Spinner from '../../components/ui/Spinner'
import { Database } from '@/lib/database.types'
import {
  getModulesData,
  createModule,
  updateModule,
  deleteModule,
  bulkDeleteModules,
  updateModulesOrder
} from '@/lib/actions/admin-modules'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Course = Database['public']['Tables']['courses']['Row']

const CODE_PREFIX_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9._-]+/

const getModuleIdentifier = (module: CourseModule) => {
  const rawCode = (module as Record<string, any>)?.code
  if (typeof rawCode === 'string' && rawCode.trim().length > 0) return rawCode.trim()
  if (typeof module.title === 'string') {
    const match = module.title.match(CODE_PREFIX_REGEX)
    if (match && match[0].length > 0) return match[0]
    return module.title
  }
  return ''
}

interface ModuleRowProps {
  module: CourseModule
  course?: Course
  stats: { subjects: number }
  onOpenMenu: (e: React.MouseEvent, module: CourseModule) => void
  isSelected: boolean
  onToggleSelect: (moduleId: string) => void
}

function ModuleRowCells({
  module,
  course,
  stats,
  onOpenMenu,
  isSelected,
  onToggleSelect,
  showGrip
}: ModuleRowProps & { showGrip?: boolean }) {
  const moduleCode = getModuleIdentifier(module)
  const hasDistinctCode = moduleCode.trim().length > 0 &&
    moduleCode.trim().toLowerCase() !== (module.title || '').trim().toLowerCase()
  const totalHours = typeof module.total_hours === 'number' ? module.total_hours : 0
  const formattedHours = (() => {
    const clamped = Math.max(totalHours, 0)
    const rounded = Number.isInteger(clamped) ? clamped.toFixed(0) : clamped.toFixed(1)
    return rounded.replace('.', ',')
  })()

  return (
    <>
      {showGrip && (
        <td className="py-4 px-2 text-[#8b6d22]/50 cursor-grab w-8">
          <GripVertical className="w-4 h-4" />
        </td>
      )}
      <td className="py-4 px-4 text-center w-10">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(module.id) }}
          className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
        >
          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>
      </td>
      <td className="py-4 px-4">
        <span className="text-[#8b6d22] font-mono text-sm">{hasDistinctCode ? moduleCode : '-'}</span>
      </td>
      <td className="py-4 px-4">
        <span className="text-[#1e130c] font-medium">{module.title}</span>
      </td>
      <td className="py-4 px-4">
        {course ? (
          <span className="text-[#7a6350] text-sm flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[160px]" title={course.title}>{course.title}</span>
          </span>
        ) : (
          <span className="text-[#8b6d22]/50 text-sm">-</span>
        )}
      </td>
      <td className="py-4 px-4 text-right">
        <span className="text-[#1e130c]">{stats.subjects}</span>
      </td>
      <td className="py-4 px-4 text-right">
        <span className="text-[#1e130c] flex items-center justify-end gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formattedHours}h
        </span>
      </td>
      <td className="py-4 px-4">
        <span className={`px-2 py-0.5 rounded text-xs ${
          module.is_required === false
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-[#1e130c]/5/20 text-[#1e130c] font-bold'
        }`}>
          {module.is_required === false ? 'Opcional' : 'Obrigatório'}
        </span>
      </td>
      <td className="py-4 px-4 text-right text-[#8b6d22] text-sm">
        {(module.order_index || 0) + 1}
      </td>
      <td className="py-4 px-4 text-right">
        <button
          onClick={(e) => {
             e.stopPropagation()
             onOpenMenu(e, module)
          }}
          className="text-[#8b6d22] hover:text-[#1e130c] p-2 transition-transform active:scale-90"
          title="Ações"
        >
          <MoreVertical size={20} />
        </button>
      </td>
    </>
  )
}

function ModuleRow(props: ModuleRowProps) {
  return (
    <tr className="border-b border-[#1e130c]/15 hover:bg-[#1e130c]/5">
      <ModuleRowCells {...props} showGrip={false} />
    </tr>
  )
}

function SortableModuleRow(props: ModuleRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-[#1e130c]/15 hover:bg-[#1e130c]/5 ${isDragging ? 'ring-1 ring-[#8b6d22]/50' : ''}`}
    >
      <td className="py-4 px-2 w-8" {...attributes} {...listeners}>
        <GripVertical className={`w-4 h-4 cursor-grab transition-colors ${isDragging ? 'text-[#8b6d22]' : 'text-[#8b6d22]/50 hover:text-[#1e130c]-500/60'}`} />
      </td>
      <ModuleRowCells {...props} showGrip={false} />
    </tr>
  )
}

export default function ModulesPage() {
  const [modules, setModules] = useState<CourseModule[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  
  // Dropdown state
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number, bottom?: number, left: number, isUp?: boolean } | null>(null)
  const [dropdownModule, setDropdownModule] = useState<CourseModule | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    order_index: '0',
    is_required: true
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [moduleStats, setModuleStats] = useState<{ [key: string]: { subjects: number } }>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortMode, setSortMode] = useState<'code' | 'structure'>('code')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await getModulesData()
      if (!data) {
        setMessage({ type: 'error', text: 'Erro ao carregar módulos' })
        return
      }
      setModules(data.modules)
      setCourses(data.courses)
      setModuleStats(data.moduleStats)
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar módulos' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const moduleData = {
        title: formData.title,
        description: formData.description,
        course_id: formData.course_id,
        order_index: parseInt(formData.order_index) || 0,
        is_required: formData.is_required
      }

      let result
      if (editingModule) {
        result = await updateModule(editingModule.id, moduleData)
        if (result.success) setMessage({ type: 'success', text: 'Módulo atualizado com sucesso!' })
      } else {
        result = await createModule(moduleData)
        if (result.success) setMessage({ type: 'success', text: 'Módulo criado com sucesso!' })
      }

      if (!result.success) throw new Error(result.error || 'Erro ao salvar módulo')

      setFormData({ title: '', description: '', course_id: '', order_index: '0', is_required: true })
      setEditingModule(null)
      setShowModal(false)
      await fetchData()
    } catch (error: any) {
      console.error('Error saving module:', error)
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar módulo' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (module: CourseModule) => {
    setEditingModule(module)
    setFormData({
      title: module.title,
      description: module.description || '',
      course_id: module.course_id,
      order_index: module.order_index?.toString() || '0',
      is_required: module.is_required ?? true
    })
    setShowModal(true)
  }

  const handleOpenMenu = (e: React.MouseEvent, module: CourseModule) => {
    const rect = e.currentTarget.getBoundingClientRect()
                        const isUp = window.innerHeight - rect.bottom < 250
                        setDropdownPosition({ 
                          top: isUp ? undefined : rect.bottom, 
                          bottom: isUp ? window.innerHeight - rect.top : undefined,
                          left: rect.right - 240,
                          isUp
                        })
    setDropdownModule(module)
    setOpenDropdown(module.id)
  }

  const handleDelete = async (module: CourseModule) => {
    if (!confirm(`Tem certeza que deseja excluir o módulo "${module.title}"? Isso removerá todas as associações com disciplinas.`)) return
    try {
      const result = await deleteModule(module.id)
      if (!result.success) throw new Error(result.error || 'Erro ao excluir módulo')
      setMessage({ type: 'success', text: 'Módulo excluído com sucesso!' })
      await fetchData()
    } catch (error: any) {
      console.error('Error deleting module:', error)
      setMessage({ type: 'error', text: error.message || 'Erro ao excluir módulo' })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedModules.size === 0) return
    if (!confirm(`Tem certeza que deseja excluir ${selectedModules.size} módulos permanentemente? Isso removerá todas as associações com disciplinas.`)) return

    setIsDeleting(true)
    setMessage({ type: 'info', text: 'Excluindo módulos...' })

    try {
      const result = await bulkDeleteModules(Array.from(selectedModules))
      if (!result.success) throw new Error(result.error || 'Erro ao excluir módulos')
      setMessage({ type: 'success', text: `${selectedModules.size} módulos excluídos com sucesso!` })
      setSelectedModules(new Set())
      await fetchData()
    } catch (error: any) {
      console.error('Error deleting modules:', error)
      setMessage({ type: 'error', text: error.message || 'Erro ao excluir módulos' })
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleSelectModule = (moduleId: string) => {
    const newSelection = new Set(selectedModules)
    if (newSelection.has(moduleId)) newSelection.delete(moduleId)
    else newSelection.add(moduleId)
    setSelectedModules(newSelection)
  }

  const selectAllModules = () => setSelectedModules(new Set(sortedModules.map(m => m.id)))
  const deselectAllModules = () => setSelectedModules(new Set())

  const openCreateModal = () => {
    setEditingModule(null)
    const maxOrderIndex = modules.length > 0
      ? Math.max(...modules.map(m => m.order_index || 0)) + 1
      : 0
    setFormData({ title: '', description: '', course_id: '', order_index: maxOrderIndex.toString(), is_required: true })
    setShowModal(true)
  }

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const oldIndex = modules.findIndex(m => m.id === active.id)
    const newIndex = modules.findIndex(m => m.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const originalModules = [...modules]
    const reorderedModules = arrayMove(modules, oldIndex, newIndex)
    setModules(reorderedModules)

    setIsSaving(true)
    setMessage({ type: 'info', text: 'Salvando nova ordem...' })

    try {
      const courseId = reorderedModules[0]?.course_id
      if (!courseId) throw new Error('Course ID not found')

      const courseModules = reorderedModules.filter(m => m.course_id === courseId)
      const modulesToUpdate = courseModules.map((module, index) => ({ id: module.id, order_index: index }))
      const result = await updateModulesOrder(modulesToUpdate)

      if (!result.success) throw new Error(result.error || 'Erro ao atualizar ordem')

      setMessage({ type: 'success', text: '✓ Ordem atualizada com sucesso!' })
      setTimeout(() => fetchData(), 500)
    } catch (error: any) {
      console.error('Error reordering modules:', error)
      setMessage({ type: 'error', text: `Erro ao reordenar: ${error.message || 'Tente novamente'}` })
      setModules(originalModules)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredModules = useMemo(() => {
    return modules.filter(module => {
      const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCourse = selectedCourse === 'all' || module.course_id === selectedCourse
      return matchesSearch && matchesCourse
    })
  }, [modules, searchTerm, selectedCourse])

  const coursesById = useMemo(() => {
    const map = new Map<string, Course>()
    courses.forEach(course => map.set(course.id, course))
    return map
  }, [courses])

  const sortedModules = useMemo(() => {
    const list = [...filteredModules]

    if (sortMode === 'code') {
      return list.sort((a, b) => {
        const codeA = getModuleIdentifier(a)
        const codeB = getModuleIdentifier(b)
        const codeCompare = codeA.localeCompare(codeB, 'pt-BR', { sensitivity: 'base', numeric: true })
        if (codeCompare !== 0) return codeCompare
        return a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
      })
    }

    return list.sort((a, b) => {
      const courseA = coursesById.get(a.course_id)?.title || ''
      const courseB = coursesById.get(b.course_id)?.title || ''
      const courseCompare = courseA.localeCompare(courseB, 'pt-BR', { sensitivity: 'base' })
      if (courseCompare !== 0) return courseCompare
      return (a.order_index || 0) - (b.order_index || 0)
    })
  }, [filteredModules, sortMode, coursesById])

  const totalPages = Math.ceil(sortedModules.length / itemsPerPage)
  const paginatedModules = sortedModules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const activeModule = activeId ? modules.find(m => m.id === activeId) : null

  const tableHeader = (showGrip: boolean) => (
    <thead className="bg-transparent backdrop-blur-sm sticky top-0 z-10">
      <tr className="border-b border-[#1e130c]/15">
        {showGrip && <th className="w-8 py-4 px-2" />}
        <th className="w-10 py-4 px-4 text-center">
          <button
            onClick={selectedModules.size === sortedModules.length ? deselectAllModules : selectAllModules}
            className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
          >
            {selectedModules.size === sortedModules.length && sortedModules.length > 0
              ? <CheckSquare className="w-5 h-5" />
              : <Square className="w-5 h-5" />}
          </button>
        </th>
        <th scope="col" className="text-left py-4 px-4 text-[#7a6350] font-medium">Código</th>
        <th scope="col" className="text-left py-4 px-4 text-[#7a6350] font-medium">Título</th>
        <th scope="col" className="text-left py-4 px-4 text-[#7a6350] font-medium">Curso</th>
        <th scope="col" className="text-right py-4 px-4 text-[#7a6350] font-medium">Disciplinas</th>
        <th scope="col" className="text-right py-4 px-4 text-[#7a6350] font-medium">Horas</th>
        <th scope="col" className="text-left py-4 px-4 text-[#7a6350] font-medium">Tipo</th>
        <th scope="col" className="text-right py-4 px-4 text-[#7a6350] font-medium">Ordem</th>
        <th scope="col" className="text-center py-4 px-4 text-[#7a6350] font-medium">Ações</th>
      </tr>
    </thead>
  )

  const emptyRow = (colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <Folder className="w-12 h-12 text-[#8b6d22]/50 mx-auto mb-3" />
        <p className="text-[#7a6350]">
          {searchTerm ? 'Nenhum módulo encontrado' : 'Nenhum módulo cadastrado'}
        </p>
      </td>
    </tr>
  )

return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-10 space-y-8 bg-[#faf6ee] min-h-screen font-[family-name:var(--font-lora)] text-[#1e130c]">

      {/* Header Clássico */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#1e130c', lineHeight: 1.1, fontWeight: 700 }}>
            Gestão de Módulos
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: '#7a6350', marginTop: '0.5rem' }}>
            Registros e ordenação estrutural dos módulos acadêmicos.
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color="#1e130c" />
          </div>
        </div>
        <button
          onClick={openCreateModal}
          style={{ padding: '1rem 3rem', backgroundColor: '#1e130c', color: '#faf6ee', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          Novo Módulo
        </button>      </div>

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

      {/* Selection Actions Bar */}
      {selectedModules.size > 0 && (
        <div className="border border-[#8b6d22]/50 bg-[#8b6d22]/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
          <div className="flex items-center gap-4">
            <span className="text-[#1e130c] font-medium">
              {selectedModules.size} {selectedModules.size === 1 ? 'registro selecionado' : 'registros selecionados'}
            </span>
            <button
              onClick={deselectAllModules}
              className="text-[#8b6d22] hover:text-[#1e130c] text-sm underline italic transition-colors"
            >
              Desmarcar todos
            </button>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash className="w-4 h-4" />}
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Expurgando...' : 'Expurgar Selecionados'}
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6d22]" />
            <input
              type="text"
              placeholder="Pesquisar nos registros..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-4 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
            />
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => { setSelectedCourse(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-auto px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
          >
            <option value="all">Todos os Cursos</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm pt-2">
          <span className="text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Ordenação:</span>
          <button
            type="button"
            onClick={() => setSortMode('code')}
            className={`px-3 py-1 border-b-2 transition-colors ${
              sortMode === 'code'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }`}
          >
            Alfabética (Código)
          </button>
          <button
            type="button"
            onClick={() => setSortMode('structure')}
            className={`px-3 py-1 border-b-2 transition-colors ${
              sortMode === 'structure'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }`}
          >
            Estrutural (Manual)
          </button>
        </div>
      </div>

      {/* Modules Table */}
      {loading ? (
        <Spinner fullPage size="xl" />
      ) : (
      <div className="relative">
        {sortMode === 'structure' && isSaving && (
          <div className="absolute inset-0 bg-[#faf6ee]/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="px-6 py-3 border border-[#8b6d22] bg-[#faf6ee] shadow-xl text-[#8b6d22] font-medium italic flex items-center gap-3">
              <Spinner size="sm" />
              Inscrevendo nova ordem...
            </div>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          {sortMode === 'structure' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={paginatedModules.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <table className="w-full text-sm sm:text-base border-collapse">
                  {tableHeader(true)}
                  <tbody>
                    {paginatedModules.length > 0 ? (
                      paginatedModules.map((module) => (
                        <SortableModuleRow
                          key={module.id}
                          module={module}
                          course={coursesById.get(module.course_id)}
                          stats={moduleStats[module.id] || { subjects: 0 }}
                          onOpenMenu={handleOpenMenu}
                          isSelected={selectedModules.has(module.id)}
                          onToggleSelect={toggleSelectModule}
                        />
                      ))
                    ) : (
                      emptyRow(11)
                    )}
                  </tbody>
                </table>
              </SortableContext>

              <DragOverlay>
                {activeModule ? (
                  <div className="bg-[#faf6ee] border border-[#8b6d22] px-6 py-4 shadow-2xl flex items-center gap-4 rotate-2 scale-105">
                    <GripVertical className="w-5 h-5 text-[#8b6d22]" />
                    <div>
                      <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] text-lg">{activeModule.title}</p>
                      <p className="text-[#8b6d22] text-xs italic">Acomodando registro...</p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <table className="w-full text-sm sm:text-base border-collapse">
              {tableHeader(false)}
              <tbody>
                {paginatedModules.length > 0 ? (
                  paginatedModules.map((module) => (
                    <ModuleRow
                      key={module.id}
                      module={module}
                      course={coursesById.get(module.course_id)}
                      stats={moduleStats[module.id] || { subjects: 0 }}
                      onOpenMenu={handleOpenMenu}
                      isSelected={selectedModules.has(module.id)}
                      onToggleSelect={toggleSelectModule}
                    />
                  ))
                ) : (
                  emptyRow(10)
                )}
              </tbody>
            </table>
          )}
          
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
      </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1e130c]/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto custom-scrollbar">
          <div className="relative bg-[#faf6ee] w-full max-w-xl p-8 md:p-10 shadow-2xl border border-[#1e130c]/20 my-8">

            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-[#1e130c] border-b-2 border-[#8b6d22] pb-2 pr-8">
                {editingModule ? 'Editar Registro do Módulo' : 'Novo Registro de Módulo'}
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
                  Título do Módulo <span className="text-[#8b6d22]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                  placeholder="Ex: Fundamentos da Teologia"
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Curso Vinculado <span className="text-[#8b6d22]">*</span>
                </label>
                <select
                  required
                  value={formData.course_id}
                  onChange={(e) => {
                    const courseId = e.target.value
                    const courseModules = modules.filter(m => m.course_id === courseId)
                    const maxOrderIndex = courseModules.length > 0
                      ? Math.max(...courseModules.map(m => m.order_index || 0)) + 1
                      : 0
                    setFormData({ ...formData, course_id: courseId, order_index: maxOrderIndex.toString() })
                  }}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
                >
                  <option value="" disabled>Selecione a academia...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    step="1"
                  />
                  <p className="text-xs text-[#7a6350] mt-2 italic">Posição no arranjo do curso (autocompleta).</p>
                </div>

                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-3">
                    Natureza da Matéria
                  </label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="is_required"
                          checked={formData.is_required === true}
                          onChange={() => setFormData({ ...formData, is_required: true })}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-[#1e130c]/30 rounded-full peer-checked:border-[#8b6d22] peer-checked:bg-[#8b6d22] transition-colors"></div>
                        <div className="absolute w-2 h-2 bg-[#faf6ee] rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                      </div>
                      <span className="ml-3 text-[#1e130c] group-hover:text-[#8b6d22] transition-colors">Obrigatória</span>
                    </label>
                    <label className="flex items-center cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="is_required"
                          checked={formData.is_required === false}
                          onChange={() => setFormData({ ...formData, is_required: false })}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-[#1e130c]/30 rounded-full peer-checked:border-[#8b6d22] peer-checked:bg-[#8b6d22] transition-colors"></div>
                        <div className="absolute w-2 h-2 bg-[#faf6ee] rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                      </div>
                      <span className="ml-3 text-[#1e130c] group-hover:text-[#8b6d22] transition-colors">Opcional</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Ementa (Descrição)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none resize-none"
                  placeholder="Sumário das disciplinas a serem abordadas..."
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
                    <><Spinner size="sm" /> Lavrando...</>
                  ) : (
                    editingModule ? 'Inscrever Alterações' : 'Lavrar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dropdown Portal ── */}
      {openDropdown && dropdownModule && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[11000] bg-transparent" onClick={() => { setOpenDropdown(null); setDropdownModule(null); }} />
          <div
            className="fixed w-60 bg-[#faf6ee] border border-[#1e130c]/20 shadow-2xl z-[11001] py-3 font-[family-name:var(--font-lora)]"
            style={{ top: dropdownPosition.top ? `${dropdownPosition.top + 8}px` : undefined, bottom: dropdownPosition.bottom ? `${dropdownPosition.bottom + 8}px` : undefined, left: `${dropdownPosition.left}px` }}
          >
            <div className={`absolute ${dropdownPosition.isUp ? "-bottom-2 border-b border-r" : "-top-2 border-l border-t"} right-4 w-4 h-4 bg-[#faf6ee] border-[#1e130c]/20 rotate-45`} />
            <button onClick={() => { handleEdit(dropdownModule); setOpenDropdown(null); }} className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors">
              <Edit size={16} style={{ color: '#8b6d22' }} />
              <span style={{ fontSize: '0.95rem', color: '#1e130c', fontWeight: 500 }}>Inscrever Alterações</span>
            </button>
            <div className="border-t border-[#1e130c]/10 mt-3 pt-3">
              <button 
                onClick={() => { handleDelete(dropdownModule); setOpenDropdown(null); }}
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
