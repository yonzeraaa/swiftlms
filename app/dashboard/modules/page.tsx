'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Folder, Plus, Edit, Trash2, Search, X, Loader2, AlertCircle, BookOpen, GripVertical } from 'lucide-react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
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
import {
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Course = Database['public']['Tables']['courses']['Row']

interface SortableModuleProps {
  module: CourseModule
  course?: Course
  stats: { subjects: number }
  onEdit: (module: CourseModule) => void
  onDelete: (module: CourseModule) => void
}

function SortableModule({ module, course, stats, onEdit, onDelete }: SortableModuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    scale: isDragging ? 1.05 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        cursor-grab active:cursor-grabbing transition-all duration-200
        ${isDragging ? 'z-50 rotate-2' : 'z-0'}
        ${isSorting ? 'cursor-grabbing' : ''}
      `}
    >
      <Card 
        variant="gradient" 
        className={`
          relative group transition-all duration-200
          ${isDragging ? 'shadow-2xl ring-2 ring-gold-500/50' : 'hover:shadow-xl'}
          ${!isDragging && !isSorting ? 'hover:scale-[1.02]' : ''}
        `}
      >
        {/* Drag Indicator Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-gradient-to-r from-gold-500/20 to-transparent rounded-xl pointer-events-none" />
        )}
        
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <GripVertical className={`
                  w-5 h-5 transition-all duration-200
                  ${isDragging ? 'text-gold-400' : 'text-gold-500/30 group-hover:text-gold-500/50'}
                `} />
                <h3 className="text-xl font-bold text-gold">
                  {module.title}
                </h3>
              </div>
              {course && (
                <p className="text-sm text-gold-400 mt-1 flex items-center gap-1 ml-7">
                  <BookOpen className="w-4 h-4" />
                  {course.title}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(module)
                }}
                className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700 rounded-lg transition-colors"
                title="Editar módulo"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(module)
                }}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-navy-700 rounded-lg transition-colors"
                title="Excluir módulo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {module.description && (
            <p className="text-gold-300 text-sm ml-7">
              {module.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gold-500/20">
            <div className="flex items-center gap-4 text-sm ml-7">
              <span className="text-gold-400">
                {stats.subjects} disciplina{stats.subjects !== 1 ? 's' : ''}
              </span>
              <span className={`
                px-2 py-0.5 rounded text-xs
                ${module.is_required === false
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-green-500/20 text-green-300'
                }
              `}>
                {module.is_required === false ? 'Opcional' : 'Obrigatório'}
              </span>
              <span className={`
                px-2 py-0.5 rounded transition-all duration-200
                ${isDragging 
                  ? 'bg-gold-500/30 text-gold-200 font-semibold' 
                  : 'bg-navy-900/50 text-gold-400'
                }
              `}>
                Ordem: {(module.order_index || 0) + 1}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function ModulesPage() {
  const [modules, setModules] = useState<CourseModule[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null)
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
  
  const supabase = createClient()
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch modules with course info
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*, courses!inner(id, title)')
        .order('order_index')

      if (modulesError) throw modulesError

      // Fetch all courses for the dropdown
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('title')

      if (coursesError) throw coursesError

      setModules(modulesData || [])
      setCourses(coursesData || [])

      // Fetch stats for each module
      if (modulesData && modulesData.length > 0) {
        const { data: moduleSubjects } = await supabase
          .from('module_subjects')
          .select('module_id')

        if (moduleSubjects) {
          const stats: { [key: string]: { subjects: number } } = {}
          modulesData.forEach(module => {
            const subjectCount = moduleSubjects.filter(ms => ms.module_id === module.id).length
            stats[module.id] = { subjects: subjectCount }
          })
          setModuleStats(stats)
        }
      }
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
      const newOrderIndex = parseInt(formData.order_index) || 0
      
      if (editingModule) {
        // Check if another module has the same order_index
        const { data: existingModule } = await supabase
          .from('course_modules')
          .select('id, order_index')
          .eq('course_id', formData.course_id)
          .eq('order_index', newOrderIndex)
          .neq('id', editingModule.id)
          .single()
        
        if (existingModule) {
          // Swap order indices using a temporary value to avoid unique constraint violation
          const currentOrderIndex = editingModule.order_index || 0
          const tempOrder = 999999
          
          // Step 1: Move editing module to temporary order
          const { error: tempError } = await supabase
            .from('course_modules')
            .update({ order_index: tempOrder })
            .eq('id', editingModule.id)
          
          if (tempError) throw tempError
          
          // Step 2: Move existing module to current module's order
          const { error: swapError } = await supabase
            .from('course_modules')
            .update({ order_index: currentOrderIndex })
            .eq('id', existingModule.id)
          
          if (swapError) throw swapError
        }
        
        // Update the current module
        const { error } = await supabase
          .from('course_modules')
          .update({
            title: formData.title,
            description: formData.description,
            course_id: formData.course_id,
            order_index: newOrderIndex,
            is_required: formData.is_required,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingModule.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Módulo atualizado com sucesso!' })
      } else {
        // Check if another module has the same order_index for new modules
        const { data: existingModule } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', formData.course_id)
          .eq('order_index', newOrderIndex)
          .single()
        
        if (existingModule) {
          // Increment all modules with order >= newOrderIndex
          const { data: modulesToShift } = await supabase
            .from('course_modules')
            .select('id, order_index')
            .eq('course_id', formData.course_id)
            .gte('order_index', newOrderIndex)
            .order('order_index', { ascending: false })
          
          if (modulesToShift) {
            for (const module of modulesToShift) {
              await supabase
                .from('course_modules')
                .update({ order_index: (module.order_index || 0) + 1 })
                .eq('id', module.id)
            }
          }
        }
        
        // Create new module
        const { error } = await supabase
          .from('course_modules')
          .insert({
            title: formData.title,
            description: formData.description,
            course_id: formData.course_id,
            order_index: newOrderIndex,
            is_required: formData.is_required
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Módulo criado com sucesso!' })
      }

      // Reset form and refresh data
      setFormData({ title: '', description: '', course_id: '', order_index: '0', is_required: true })
      setEditingModule(null)
      setShowModal(false)
      await fetchData()
    } catch (error: any) {
      console.error('Error saving module:', error)
      let errorMessage = 'Erro ao salvar módulo'
      
      if (error.message?.includes('row-level security')) {
        errorMessage = 'Erro de permissão. Verifique se você tem autorização para realizar esta ação.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      })
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

  const handleDelete = async (module: CourseModule) => {
    if (!confirm(`Tem certeza que deseja excluir o módulo "${module.title}"? Isso removerá todas as associações com disciplinas.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', module.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Módulo excluído com sucesso!' })
      await fetchData()
    } catch (error: any) {
      console.error('Error deleting module:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao excluir módulo' 
      })
    }
  }

  const openCreateModal = () => {
    setEditingModule(null)
    // Calcula o próximo order_index disponível (máximo + 1)
    const maxOrderIndex = modules.length > 0 
      ? Math.max(...modules.map(m => m.order_index || 0)) + 1
      : 0
    setFormData({ 
      title: '', 
      description: '', 
      course_id: '', 
      order_index: maxOrderIndex.toString(),
      is_required: true 
    })
    setShowModal(true)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = modules.findIndex(m => m.id === active.id)
    const newIndex = modules.findIndex(m => m.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Store original order for rollback
    const originalModules = [...modules]

    // Reorder locally for immediate feedback
    const reorderedModules = arrayMove(modules, oldIndex, newIndex)
    setModules(reorderedModules)

    // Save to database
    setIsSaving(true)
    setMessage({ type: 'info', text: 'Salvando nova ordem...' })
    
    try {
      // Get only the modules from the same course to avoid conflicts
      const courseId = reorderedModules[0]?.course_id
      if (!courseId) throw new Error('Course ID not found')

      // Filter modules by course
      const courseModules = reorderedModules.filter(m => m.course_id === courseId)
      
      // Create update promises with temporary indices first
      const tempUpdates = courseModules.map((module, index) => 
        supabase
          .from('course_modules')
          .update({ 
            order_index: 100000 + index,
            updated_at: new Date().toISOString()
          })
          .eq('id', module.id)
          .select()
      )

      // Execute all temporary updates
      const tempResults = await Promise.all(tempUpdates)
      
      // Check for errors in temporary updates
      const tempErrors = tempResults.filter(r => r.error)
      if (tempErrors.length > 0) {
        throw new Error(`Failed to update temporary indices: ${tempErrors[0].error?.message || 'Unknown error'}`)
      }

      // Create final update promises
      const finalUpdates = courseModules.map((module, index) => 
        supabase
          .from('course_modules')
          .update({ 
            order_index: index,
            updated_at: new Date().toISOString()
          })
          .eq('id', module.id)
          .select()
      )

      // Execute all final updates
      const finalResults = await Promise.all(finalUpdates)
      
      // Check for errors in final updates
      const finalErrors = finalResults.filter(r => r.error)
      if (finalErrors.length > 0) {
        throw new Error(`Failed to update final indices: ${finalErrors[0].error?.message || 'Unknown error'}`)
      }

      setMessage({ type: 'success', text: '✓ Ordem atualizada com sucesso!' })
      
      // Refresh data to ensure consistency
      setTimeout(() => {
        fetchData()
      }, 500)
      
    } catch (error: any) {
      console.error('Error reordering modules:', error)
      setMessage({ 
        type: 'error', 
        text: `Erro ao reordenar: ${error.message || 'Tente novamente'}` 
      })
      // Revert to original order
      setModules(originalModules)
    } finally {
      setIsSaving(false)
    }
  }

  // Filter modules by search and selected course
  const filteredModules = modules.filter(module => {
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCourse = selectedCourse === 'all' || module.course_id === selectedCourse
    
    return matchesSearch && matchesCourse
  })

  // Sort filtered modules by course and then by order
  const sortedModules = [...filteredModules].sort((a, b) => {
    // First sort by course
    const courseA = courses.find(c => c.id === a.course_id)?.title || ''
    const courseB = courses.find(c => c.id === b.course_id)?.title || ''
    const courseCompare = courseA.localeCompare(courseB)
    
    if (courseCompare !== 0) return courseCompare
    
    // Then sort by order within the same course
    return (a.order_index || 0) - (b.order_index || 0)
  })

  const activeModule = activeId ? modules.find(m => m.id === activeId) : null

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
            <Folder className="w-8 h-8" />
            Módulos
          </h1>
          <p className="text-gold-300 mt-1">
            Gerencie os módulos dos cursos. Arraste para reordenar.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Novo Módulo
        </Button>
      </div>

      {/* Message */}
      {message && (
        <Card variant="gradient">
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <AlertCircle className="w-5 h-5 text-green-400" />
            ) : message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            )}
            <p className={
              message.type === 'success' ? 'text-green-300' : 
              message.type === 'error' ? 'text-red-300' : 
              'text-blue-300'
            }>
              {message.text}
            </p>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
              <input
                type="text"
                placeholder="Buscar módulos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="all">Todos os cursos</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          
          {/* Drag Instructions */}
          {sortedModules.length > 1 && (
            <div className="flex items-center gap-2 text-sm text-gold-400/70">
              <GripVertical className="w-4 h-4" />
              <span>Arraste os cards para reordenar os módulos</span>
            </div>
          )}
        </div>
      </Card>

      {/* Modules Grid with Drag and Drop */}
      <div className="relative">
        {isSaving && (
          <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
            <div className="bg-navy-800 px-4 py-2 rounded-lg border border-gold-500/20">
              <p className="text-gold-300">Salvando alterações...</p>
            </div>
          </div>
        )}
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedModules.map(m => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedModules.length > 0 ? (
                sortedModules.map((module) => {
                  const course = courses.find(c => c.id === module.course_id)
                  const stats = moduleStats[module.id] || { subjects: 0 }
                  
                  return (
                    <SortableModule
                      key={module.id}
                      module={module}
                      course={course}
                      stats={stats}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )
                })
              ) : (
                <div className="col-span-full">
                  <Card>
                    <div className="text-center py-12">
                      <Folder className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                      <p className="text-gold-300">
                        {searchTerm ? 'Nenhum módulo encontrado' : 'Nenhum módulo cadastrado'}
                      </p>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </SortableContext>
          
          <DragOverlay>
            {activeModule ? (
              <div className="transform rotate-3 scale-105">
                <Card variant="gradient" className="shadow-2xl ring-2 ring-gold-500 bg-navy-800/95">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <GripVertical className="w-5 h-5 text-gold-400 animate-pulse" />
                    <div>
                      <p className="text-gold-200 font-semibold">{activeModule.title}</p>
                      <p className="text-gold-400 text-xs">Solte para reordenar</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-navy-800 rounded-2xl max-w-md w-full p-6 border border-gold-500/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gold">
                {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
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
                  Título do Módulo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Ex: Módulo 1: Fundamentos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Curso *
                </label>
                <select
                  required
                  value={formData.course_id}
                  onChange={(e) => {
                    const courseId = e.target.value
                    // Recalcula o order_index baseado nos módulos do curso selecionado
                    const courseModules = modules.filter(m => m.course_id === courseId)
                    const maxOrderIndex = courseModules.length > 0 
                      ? Math.max(...courseModules.map(m => m.order_index || 0)) + 1
                      : 0
                    setFormData({ 
                      ...formData, 
                      course_id: courseId,
                      order_index: maxOrderIndex.toString()
                    })
                  }}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Selecione um curso</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Ordem no Curso
                </label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Ex: 0"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-gold-300 mt-1">Posição do módulo (preenchido automaticamente com o próximo número disponível)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Tipo de Módulo
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="is_required"
                      checked={formData.is_required === true}
                      onChange={() => setFormData({ ...formData, is_required: true })}
                      className="mr-2 w-4 h-4 text-gold-500 bg-navy-900 border-gold-500/50 focus:ring-gold-500 focus:ring-2"
                    />
                    <span className="text-gold-100">Obrigatório</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="is_required"
                      checked={formData.is_required === false}
                      onChange={() => setFormData({ ...formData, is_required: false })}
                      className="mr-2 w-4 h-4 text-gold-500 bg-navy-900 border-gold-500/50 focus:ring-gold-500 focus:ring-2"
                    />
                    <span className="text-gold-100">Opcional</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Breve descrição do módulo..."
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
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    editingModule ? 'Salvar Alterações' : 'Criar Módulo'
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