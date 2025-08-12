'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Folder, Plus, Edit, Trash2, Search, X, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Course = Database['public']['Tables']['courses']['Row']

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
    order_index: '0'
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [moduleStats, setModuleStats] = useState<{ [key: string]: { subjects: number } }>({})
  
  const supabase = createClient()

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
      if (editingModule) {
        // Update existing module
        const { error } = await supabase
          .from('course_modules')
          .update({
            title: formData.title,
            description: formData.description,
            course_id: formData.course_id,
            order_index: parseInt(formData.order_index) || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingModule.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Módulo atualizado com sucesso!' })
      } else {
        // Create new module
        const { error } = await supabase
          .from('course_modules')
          .insert({
            title: formData.title,
            description: formData.description,
            course_id: formData.course_id,
            order_index: parseInt(formData.order_index) || 0
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Módulo criado com sucesso!' })
      }

      // Reset form and refresh data
      setFormData({ title: '', description: '', course_id: '', order_index: '0' })
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
      order_index: module.order_index?.toString() || '0'
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
      order_index: maxOrderIndex.toString() 
    })
    setShowModal(true)
  }

  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            Gerencie os módulos dos cursos
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
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <p className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}>
              {message.text}
            </p>
          </div>
        </Card>
      )}

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder="Buscar módulos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </Card>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.length > 0 ? (
          filteredModules.map((module) => {
            const course = courses.find(c => c.id === module.course_id)
            const stats = moduleStats[module.id] || { subjects: 0 }
            
            return (
              <Card key={module.id} variant="gradient" className="relative group">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gold">
                        {module.title}
                      </h3>
                      {course && (
                        <p className="text-sm text-gold-400 mt-1 flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {course.title}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(module)}
                        className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700 rounded-lg transition-colors"
                        title="Editar módulo"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(module)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-navy-700 rounded-lg transition-colors"
                        title="Excluir módulo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {module.description && (
                    <p className="text-gold-300 text-sm">
                      {module.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gold-500/20">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gold-400">
                        {stats.subjects} disciplina{stats.subjects !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gold-400">
                        Ordem: {module.order_index}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
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